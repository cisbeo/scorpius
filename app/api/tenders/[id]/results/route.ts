import { NextRequest, NextResponse } from 'next/server'
import { TenderAnalysisResultsSchema } from '@/lib/validators/dce/tender-analysis'
import { TenderAnalysisService } from '@/lib/services/french-tender/tender-analysis.service'
import { PrismaClient } from '@prisma/client'

const analysisService = new TenderAnalysisService()
const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params

    if (!analysisId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_ANALYSIS_ID',
          message: 'ID de l\'analyse requis'
        }
      }, { status: 400 })
    }

    // Get analysis with all related data
    const analysis = await analysisService.getAnalysisById(analysisId, true)

    if (!analysis) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ANALYSIS_NOT_FOUND',
          message: 'Analyse non trouvée'
        }
      }, { status: 404 })
    }

    // Get recommendations
    const recommendations = await prisma.antaresRecommendation.findMany({
      where: { analysisId },
      orderBy: { relevanceScore: 'desc' }
    })

    // Prepare response data
    const responseData = {
      success: true,
      data: {
        analysisId: analysis.id,
        status: analysis.status,
        analysisName: analysis.analysisName,
        complexityScore: analysis.complexityScore,
        overallConfidence: analysis.overallConfidence,
        analysisCompletedAt: analysis.analysisCompletedAt,
        estimatedPreparationDays: analysis.estimatedPreparationDays,
        
        // Market scope
        marketScope: analysis.marketScope ? {
          title: (analysis.marketScope as any).title,
          description: (analysis.marketScope as any).description,
          sector: (analysis.marketScope as any).sector,
          estimatedValue: (analysis.marketScope as any).estimatedValue,
          contractingAuthority: (analysis.marketScope as any).contractingAuthority,
          contractDuration: (analysis.marketScope as any).contractDuration
        } : undefined,

        // Technical requirements
        technicalRequirements: analysis.technicalRequirements || [],

        // Evaluation criteria
        evaluationCriteria: analysis.evaluationCriteria ? {
          technical: (analysis.evaluationCriteria as any).technical,
          financial: (analysis.evaluationCriteria as any).financial,
          other: (analysis.evaluationCriteria as any).other,
          details: (analysis.evaluationCriteria as any).details
        } : undefined,

        // Time constraints
        timeConstraints: analysis.timeConstraints ? {
          submissionDeadline: (analysis.timeConstraints as any).submissionDeadline 
            ? new Date((analysis.timeConstraints as any).submissionDeadline) 
            : undefined,
          projectDuration: (analysis.timeConstraints as any).projectDuration,
          keyMilestones: ((analysis.timeConstraints as any).keyMilestones || []).map((milestone: any) => ({
            name: milestone.name,
            date: new Date(milestone.date),
            description: milestone.description
          }))
        } : undefined,

        // Mandatory requirements
        mandatoryRequirements: analysis.mandatoryRequirements || [],

        // Sections (from relations)
        sections: analysis.sections?.map(section => ({
          id: section.id,
          type: section.type,
          title: section.title,
          confidence: section.confidence,
          pageCount: section.pageCount,
          extractedData: section.extractedData
        })) || [],

        // Recommendations
        recommendations: recommendations.map(rec => ({
          id: rec.id,
          recommendationType: rec.recommendationType,
          title: rec.title,
          description: rec.description,
          relevanceScore: rec.relevanceScore,
          antaresServices: rec.antaresServices,
          estimatedEffort: rec.estimatedEffort,
          estimatedValue: rec.estimatedValue,
          riskLevel: rec.riskLevel,
          actionable: rec.actionable,
          reasoning: rec.reasoning,
          createdAt: rec.createdAt
        })),

        // Analysis metadata
        metadata: {
          documentsAnalyzed: analysis.sections?.length || 0,
          processingTime: analysis.analysisCompletedAt && analysis.createdAt 
            ? analysis.analysisCompletedAt.getTime() - analysis.createdAt.getTime()
            : null,
          errorMessage: analysis.errorMessage
        }
      }
    }

    // Validate response format
    const validationResult = TenderAnalysisResultsSchema.safeParse(responseData)
    if (!validationResult.success) {
      console.error('Response validation failed:', validationResult.error)
      
      // Return a simplified valid response
      return NextResponse.json({
        success: true,
        data: {
          analysisId: analysis.id,
          status: analysis.status,
          analysisName: analysis.analysisName,
          complexityScore: analysis.complexityScore,
          overallConfidence: analysis.overallConfidence,
          analysisCompletedAt: analysis.analysisCompletedAt,
          technicalRequirements: [],
          mandatoryRequirements: [],
          sections: [],
          recommendations: [],
          metadata: {
            documentsAnalyzed: 0,
            processingTime: analysis.analysisCompletedAt && analysis.createdAt 
              ? analysis.analysisCompletedAt.getTime() - analysis.createdAt.getTime()
              : null,
            errorMessage: analysis.errorMessage
          }
        }
      })
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Get analysis results error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la récupération des résultats'
      }
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const analysisId = params.id
    const body = await request.json()

    if (!analysisId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_ANALYSIS_ID',
          message: 'ID de l\'analyse requis'
        }
      }, { status: 400 })
    }

    // Update analysis data
    const updatedAnalysis = await analysisService.updateAnalysis(analysisId, {
      marketScope: body.marketScope,
      technicalRequirements: body.technicalRequirements,
      evaluationCriteria: body.evaluationCriteria,
      timeConstraints: body.timeConstraints,
      mandatoryRequirements: body.mandatoryRequirements
    })

    return NextResponse.json({
      success: true,
      data: {
        analysisId: updatedAnalysis.id,
        message: 'Analyse mise à jour avec succès'
      }
    })

  } catch (error) {
    console.error('Update analysis error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la mise à jour'
      }
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const analysisId = params.id

    if (!analysisId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_ANALYSIS_ID',
          message: 'ID de l\'analyse requis'
        }
      }, { status: 400 })
    }

    // Delete analysis and all related data
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
        message: 'Erreur lors de la suppression'
      }
    }, { status: 500 })
  }
}