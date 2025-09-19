import { NextRequest, NextResponse } from 'next/server'
import { TenderAnalysisRequestSchema, AnalysisProgressSchema } from '@/lib/validators/dce/tender-analysis'
import { TenderAnalysisService } from '@/lib/services/french-tender/tender-analysis.service'
import { TenderDocumentService } from '@/lib/services/french-tender/tender-document.service'
import { DCEExtractorService } from '@/lib/services/french-tender/dce-extractor.service'
import { AIAnalyzerService } from '@/lib/services/french-tender/ai-analyzer.service'
import { ComplexityScorerService } from '@/lib/services/french-tender/complexity-scorer.service'
import { AntaresRecommenderService } from '@/lib/services/french-tender/antares-recommender.service'

const analysisService = new TenderAnalysisService()
const documentService = new TenderDocumentService()
const extractorService = new DCEExtractorService()
const aiAnalyzerService = new AIAnalyzerService()
const complexityScorerService = new ComplexityScorerService()
const recommenderService = new AntaresRecommenderService()

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json()
    console.log('Analysis request body:', body)
    
    const validationResult = TenderAnalysisRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.issues)
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Données de requête invalides',
          details: validationResult.error.issues
        }
      }, { status: 400 })
    }

    const { documentIds, analysisName, options } = validationResult.data
    const userId = request.headers.get('x-user-id') || 'mock-user-id'
    console.log('Validation passed, documentIds:', documentIds, 'analysisName:', analysisName)

    // Validate documents exist and get project ID
    console.log('Looking for documents with IDs:', documentIds)
    const documents = await Promise.all(
      documentIds.map(id => documentService.getDocumentById(id))
    )
    console.log('Found documents:', documents)

    const missingDocs = documents.filter(doc => !doc)
    if (missingDocs.length > 0) {
      console.error('Missing documents:', missingDocs)
      return NextResponse.json({
        success: false,
        error: {
          code: 'DOCUMENTS_NOT_FOUND',
          message: 'Certains documents sont introuvables'
        }
      }, { status: 404 })
    }

    const validDocuments = documents.filter(doc => doc !== null)
    const projectId = validDocuments[0]!.projectId
    console.log('Valid documents count:', validDocuments.length, 'Project ID:', projectId)

    // Verify all documents belong to the same project
    const differentProject = validDocuments.find(doc => doc!.projectId !== projectId)
    if (differentProject) {
      console.error('Documents from different projects found')
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_DOCUMENTS',
          message: 'Tous les documents doivent appartenir au même projet'
        }
      }, { status: 400 })
    }

    // Check if analysis can be started
    console.log('Checking if analysis can be started for project:', projectId)
    const canStartResult = await analysisService.canStartAnalysis(projectId, documentIds)
    console.log('Can start analysis result:', canStartResult)
    if (!canStartResult.canStart) {
      console.error('Analysis cannot be started:', canStartResult.reason)
      return NextResponse.json({
        success: false,
        error: {
          code: 'ANALYSIS_NOT_POSSIBLE',
          message: canStartResult.reason || 'Impossible de démarrer l\'analyse'
        }
      }, { status: 400 })
    }

    // Create analysis record
    const analysis = await analysisService.createAnalysis({
      name: analysisName,
      documentIds,
      projectId,
      createdBy: userId,
      options
    })

    // Start async analysis process
    processAnalysisAsync(analysis.id, validDocuments, options || {})
      .catch(error => {
        console.error('Async analysis failed:', error)
        analysisService.failAnalysis(analysis.id, error.message)
      })

    // Return immediate response
    return NextResponse.json({
      success: true,
      data: {
        analysisId: analysis.id,
        status: analysis.status,
        message: 'Analyse démarrée avec succès',
        estimatedTimeMs: analysis.estimatedTimeMs
      }
    })

  } catch (error) {
    console.error('Analysis start error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors du démarrage de l\'analyse'
      }
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const analysisId = searchParams.get('analysisId')
    const projectId = searchParams.get('projectId')

    if (analysisId) {
      // Get specific analysis progress
      const progress = await analysisService.getAnalysisProgress(analysisId)
      
      const response = AnalysisProgressSchema.parse(progress)
      return NextResponse.json({
        success: true,
        data: response
      })
    }

    if (projectId) {
      // Get all analyses for project
      const analyses = await analysisService.getAnalysesByProject(projectId)
      
      return NextResponse.json({
        success: true,
        data: {
          analyses: analyses.map(analysis => ({
            id: analysis.id,
            analysisName: analysis.analysisName,
            status: analysis.status,
            complexityScore: analysis.complexityScore,
            overallConfidence: analysis.overallConfidence,
            createdAt: analysis.createdAt,
            analysisCompletedAt: analysis.analysisCompletedAt
          }))
        }
      })
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'MISSING_PARAMETERS',
        message: 'analysisId ou projectId requis'
      }
    }, { status: 400 })

  } catch (error) {
    console.error('Get analysis error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la récupération de l\'analyse'
      }
    }, { status: 500 })
  }
}

/**
 * Async analysis processing pipeline
 */
async function processAnalysisAsync(
  analysisId: string,
  documents: any[],
  options: { includeRecommendations?: boolean, detailedExtraction?: boolean }
) {
  try {
    // Step 1: Start analysis
    await analysisService.startAnalysis(analysisId)

    // Step 2: Extract content from documents
    const extractionResults = []
    for (const doc of documents) {
      // Simulate content extraction (in real implementation, get from storage)
      const mockBuffer = Buffer.from(`Mock content for ${doc.fileName}`)
      
      const extractionResult = await extractorService.extractContent(
        mockBuffer,
        doc.fileName,
        doc.fileType
      )
      
      extractionResults.push(extractionResult)
    }

    // Step 3: AI Analysis
    const analysisRequest = {
      documents: documents.map((doc, index) => ({
        type: doc.documentType,
        content: extractionResults[index].content,
        extractionResult: extractionResults[index]
      })),
      analysisOptions: {
        includeRecommendations: options.includeRecommendations ?? true,
        detailedExtraction: options.detailedExtraction ?? false
      }
    }

    const aiAnalysisResult = await aiAnalyzerService.analyzeTenderDocuments(analysisRequest)

    // Step 4: Calculate complexity score
    const complexityResult = complexityScorerService.calculateComplexityScore(
      aiAnalysisResult,
      extractionResults,
      documents.length
    )

    // Step 5: Complete analysis with results
    await analysisService.completeAnalysis(analysisId, {
      complexityScore: complexityResult.overallScore,
      overallConfidence: complexityResult.confidenceLevel,
      estimatedPreparationDays: Math.round(complexityResult.overallScore * 7), // Rough estimate
      marketScope: aiAnalysisResult.marketScope,
      technicalRequirements: aiAnalysisResult.technicalRequirements,
      evaluationCriteria: aiAnalysisResult.evaluationCriteria,
      timeConstraints: aiAnalysisResult.timeConstraints,
      mandatoryRequirements: aiAnalysisResult.mandatoryRequirements
    })

    // Step 6: Generate recommendations if requested
    if (options.includeRecommendations) {
      const recommendationRequest = {
        analysisId,
        analysisResult: aiAnalysisResult,
        complexityScore: complexityResult
      }

      const recommendations = await recommenderService.generateRecommendations(recommendationRequest)
      
      // Save recommendations to database
      await recommenderService.saveRecommendations(analysisId, recommendations.recommendations)
    }

    console.log(`Analysis ${analysisId} completed successfully`)

  } catch (error) {
    console.error(`Analysis ${analysisId} failed:`, error)
    await analysisService.failAnalysis(
      analysisId, 
      error instanceof Error ? error.message : 'Erreur inconnue'
    )
    throw error
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const analysisId = searchParams.get('analysisId')

    if (!analysisId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_ANALYSIS_ID',
          message: 'ID de l\'analyse requis'
        }
      }, { status: 400 })
    }

    // Delete analysis
    await analysisService.deleteAnalysis(analysisId)

    return NextResponse.json({
      success: true,
      message: 'Analyse supprimée avec succès'
    })

  } catch (error) {
    console.error('Delete analysis error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la suppression de l\'analyse'
      }
    }, { status: 500 })
  }
}