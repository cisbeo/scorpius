import { NextRequest, NextResponse } from 'next/server'
import { ReportGenerationRequestSchema, ReportGenerationResponseSchema } from '@/lib/validators/dce/tender-analysis'
import { TenderAnalysisService } from '@/lib/services/french-tender/tender-analysis.service'
import { PrismaClient } from '@prisma/client'

const analysisService = new TenderAnalysisService()
const prisma = new PrismaClient()

export async function POST(
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

    // Validate request
    const validationResult = ReportGenerationRequestSchema.safeParse({
      analysisId,
      ...body
    })

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Données de requête invalides',
          details: validationResult.error.issues
        }
      }, { status: 400 })
    }

    const { reportTitle, includeRecommendations, includeDetailedSections, format, language } = validationResult.data

    // Check if analysis exists and is completed
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

    if (analysis.status !== 'COMPLETED') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: 'L\'analyse doit être terminée pour générer un rapport'
        }
      }, { status: 400 })
    }

    // Generate report ID
    const reportId = `report_${analysisId}_${Date.now()}`
    
    // Create report record in database
    const report = await prisma.analysisReport.create({
      data: {
        title: reportTitle,
        format,
        language,
        status: 'PROCESSING',
        includeRecommendations,
        includeDetailedSections,
        analysisId
      }
    })

    // Start async report generation
    generateReportAsync(report.id, analysis, {
      reportTitle,
      includeRecommendations,
      includeDetailedSections,
      format,
      language
    }).catch(error => {
      console.error('Report generation failed:', error)
      // Update report status to failed
      prisma.analysisReport.update({
        where: { id: report.id },
        data: { 
          status: 'FAILED',
          errorMessage: error.message 
        }
      }).catch(console.error)
    })

    // Return immediate response
    const response = {
      success: true,
      data: {
        reportId: report.id,
        downloadUrl: `/api/tenders/${analysisId}/export/${report.id}/download`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        fileSize: undefined // Will be set when generation is complete
      }
    }

    // Validate response
    const responseValidation = ReportGenerationResponseSchema.safeParse(response)
    if (!responseValidation.success) {
      console.error('Response validation failed:', responseValidation.error)
      return NextResponse.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur'
        }
      }, { status: 500 })
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Export error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la génération du rapport'
      }
    }, { status: 500 })
  }
}

export async function GET(
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

    // Get all reports for this analysis
    const reports = await prisma.analysisReport.findMany({
      where: { analysisId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: {
        reports: reports.map(report => ({
          id: report.id,
          title: report.title,
          format: report.format,
          language: report.language,
          status: report.status,
          includeRecommendations: report.includeRecommendations,
          includeDetailedSections: report.includeDetailedSections,
          downloadUrl: report.status === 'COMPLETED' 
            ? `/api/tenders/${analysisId}/export/${report.id}/download`
            : undefined,
          fileSize: report.fileSize,
          createdAt: report.createdAt,
          completedAt: report.completedAt,
          expiresAt: report.expiresAt
        }))
      }
    })

  } catch (error) {
    console.error('Get reports error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la récupération des rapports'
      }
    }, { status: 500 })
  }
}

/**
 * Async report generation
 */
async function generateReportAsync(
  reportId: string,
  analysis: any,
  options: {
    reportTitle: string
    includeRecommendations: boolean
    includeDetailedSections: boolean
    format: string
    language: string
  }
) {
  try {
    // Get recommendations if needed
    let recommendations = []
    if (options.includeRecommendations) {
      recommendations = await prisma.antaresRecommendation.findMany({
        where: { analysisId: analysis.id },
        orderBy: { relevanceScore: 'desc' }
      })
    }

    // Generate report content
    const reportContent = generateReportContent(analysis, recommendations, options)
    
    // Simulate file generation (in real implementation, use a PDF library like Puppeteer or jsPDF)
    const reportBuffer = Buffer.from(reportContent, 'utf-8')
    const fileSize = reportBuffer.length

    // In a real implementation, you would:
    // 1. Generate the actual PDF/DOCX file
    // 2. Upload to storage service (S3, etc.)
    // 3. Get the public download URL

    const downloadUrl = `/api/tenders/${analysis.id}/export/${reportId}/download`

    // Update report status
    await prisma.analysisReport.update({
      where: { id: reportId },
      data: {
        status: 'COMPLETED',
        fileSize,
        downloadUrl,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

    console.log(`Report ${reportId} generated successfully`)

  } catch (error) {
    console.error(`Report ${reportId} generation failed:`, error)
    throw error
  }
}

/**
 * Generate report content
 */
function generateReportContent(
  analysis: any,
  recommendations: any[],
  options: {
    reportTitle: string
    includeRecommendations: boolean
    includeDetailedSections: boolean
    format: string
    language: string
  }
): string {
  const isEnglish = options.language === 'en'
  
  let content = `
# ${options.reportTitle}

${isEnglish ? '## Analysis Summary' : '## Résumé de l\'Analyse'}

- ${isEnglish ? 'Analysis Name' : 'Nom de l\'analyse'}: ${analysis.analysisName}
- ${isEnglish ? 'Complexity Score' : 'Score de complexité'}: ${analysis.complexityScore}/10
- ${isEnglish ? 'Confidence Level' : 'Niveau de confiance'}: ${(analysis.overallConfidence * 100).toFixed(1)}%
- ${isEnglish ? 'Estimated Preparation' : 'Préparation estimée'}: ${analysis.estimatedPreparationDays} ${isEnglish ? 'days' : 'jours'}

${isEnglish ? '## Market Scope' : '## Périmètre du Marché'}

${analysis.marketScope ? `
- ${isEnglish ? 'Title' : 'Titre'}: ${(analysis.marketScope as any).title}
- ${isEnglish ? 'Sector' : 'Secteur'}: ${(analysis.marketScope as any).sector}
- ${isEnglish ? 'Estimated Value' : 'Valeur estimée'}: ${(analysis.marketScope as any).estimatedValue ? `${(analysis.marketScope as any).estimatedValue.toLocaleString()}€` : isEnglish ? 'Not specified' : 'Non spécifiée'}
- ${isEnglish ? 'Contracting Authority' : 'Autorité contractante'}: ${(analysis.marketScope as any).contractingAuthority || (isEnglish ? 'Not specified' : 'Non spécifiée')}

${isEnglish ? 'Description' : 'Description'}: ${(analysis.marketScope as any).description}
` : (isEnglish ? 'Market scope information not available.' : 'Informations sur le périmètre du marché non disponibles.')}

${isEnglish ? '## Technical Requirements' : '## Exigences Techniques'}

${analysis.technicalRequirements && analysis.technicalRequirements.length > 0 ? `
${analysis.technicalRequirements.map((req: any, index: number) => `
${index + 1}. **${req.category}**: ${req.requirement}
   - ${isEnglish ? 'Mandatory' : 'Obligatoire'}: ${req.mandatory ? (isEnglish ? 'Yes' : 'Oui') : (isEnglish ? 'No' : 'Non')}
   - ${isEnglish ? 'Priority' : 'Priorité'}: ${req.priority}
   - ${isEnglish ? 'Confidence' : 'Confiance'}: ${(req.confidence * 100).toFixed(1)}%
   - ${isEnglish ? 'Source' : 'Source'}: ${req.source}
`).join('')}
` : (isEnglish ? 'No technical requirements identified.' : 'Aucune exigence technique identifiée.')}

${isEnglish ? '## Evaluation Criteria' : '## Critères d\'Évaluation'}

${analysis.evaluationCriteria ? `
- ${isEnglish ? 'Technical' : 'Technique'}: ${(analysis.evaluationCriteria as any).technical || (isEnglish ? 'Not specified' : 'Non spécifié')}%
- ${isEnglish ? 'Financial' : 'Financier'}: ${(analysis.evaluationCriteria as any).financial || (isEnglish ? 'Not specified' : 'Non spécifié')}%
- ${isEnglish ? 'Other' : 'Autres'}: ${(analysis.evaluationCriteria as any).other || (isEnglish ? 'Not specified' : 'Non spécifié')}%
` : (isEnglish ? 'Evaluation criteria not specified.' : 'Critères d\'évaluation non spécifiés.')}

${isEnglish ? '## Mandatory Requirements' : '## Prérequis Obligatoires'}

${analysis.mandatoryRequirements && analysis.mandatoryRequirements.length > 0 ? `
${analysis.mandatoryRequirements.map((req: string, index: number) => `${index + 1}. ${req}`).join('\n')}
` : (isEnglish ? 'No mandatory requirements identified.' : 'Aucun prérequis obligatoire identifié.')}
`

  if (options.includeDetailedSections && analysis.sections && analysis.sections.length > 0) {
    content += `
${isEnglish ? '## Document Sections Analysis' : '## Analyse des Sections de Documents'}

${analysis.sections.map((section: any) => `
### ${section.title} (${section.type})
- ${isEnglish ? 'Confidence' : 'Confiance'}: ${(section.confidence * 100).toFixed(1)}%
- ${isEnglish ? 'Pages' : 'Pages'}: ${section.pageCount}
`).join('')}
`
  }

  if (options.includeRecommendations && recommendations.length > 0) {
    content += `
${isEnglish ? '## Antares Recommendations' : '## Recommandations Antares'}

${recommendations.map((rec: any, index: number) => `
### ${index + 1}. ${rec.title}

${rec.description}

- ${isEnglish ? 'Type' : 'Type'}: ${rec.recommendationType}
- ${isEnglish ? 'Relevance Score' : 'Score de pertinence'}: ${(rec.relevanceScore * 100).toFixed(1)}%
- ${isEnglish ? 'Estimated Effort' : 'Effort estimé'}: ${rec.estimatedEffort} ${isEnglish ? 'days' : 'jours'}
- ${isEnglish ? 'Estimated Value' : 'Valeur estimée'}: ${rec.estimatedValue.toLocaleString()}€
- ${isEnglish ? 'Risk Level' : 'Niveau de risque'}: ${rec.riskLevel}
- ${isEnglish ? 'Actionable' : 'Actionnable'}: ${rec.actionable ? (isEnglish ? 'Yes' : 'Oui') : (isEnglish ? 'No' : 'Non')}

${isEnglish ? '**Reasoning**' : '**Justification**'}: ${rec.reasoning}
`).join('')}
`
  }

  content += `
---
${isEnglish ? 'Report generated on' : 'Rapport généré le'} ${new Date().toLocaleDateString(options.language === 'en' ? 'en-US' : 'fr-FR')}
${isEnglish ? 'by Antares Tender Analysis System' : 'par le Système d\'Analyse d\'Appels d\'Offres Antares'}
`

  return content
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const analysisId = params.id
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')

    if (!analysisId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_ANALYSIS_ID',
          message: 'ID de l\'analyse requis'
        }
      }, { status: 400 })
    }

    if (reportId) {
      // Delete specific report
      await prisma.analysisReport.delete({
        where: { id: reportId }
      })

      return NextResponse.json({
        success: true,
        message: 'Rapport supprimé avec succès'
      })
    } else {
      // Delete all reports for analysis
      await prisma.analysisReport.deleteMany({
        where: { analysisId }
      })

      return NextResponse.json({
        success: true,
        message: 'Tous les rapports supprimés avec succès'
      })
    }

  } catch (error) {
    console.error('Delete report error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la suppression du rapport'
      }
    }, { status: 500 })
  }
}