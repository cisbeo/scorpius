import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; reportId: string } }
) {
  try {
    const analysisId = params.id
    const reportId = params.reportId

    if (!analysisId || !reportId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'ID de l\'analyse et du rapport requis'
        }
      }, { status: 400 })
    }

    // Get report from database
    const report = await prisma.analysisReport.findFirst({
      where: {
        id: reportId,
        analysisId
      },
      include: {
        analysis: true
      }
    })

    if (!report) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Rapport non trouvé'
        }
      }, { status: 404 })
    }

    if (report.status !== 'COMPLETED') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'REPORT_NOT_READY',
          message: 'Le rapport n\'est pas encore prêt'
        }
      }, { status: 400 })
    }

    // Check if report has expired
    if (report.expiresAt && report.expiresAt < new Date()) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'REPORT_EXPIRED',
          message: 'Le rapport a expiré'
        }
      }, { status: 410 })
    }

    // In a real implementation, you would:
    // 1. Get the file from storage service (S3, etc.)
    // 2. Stream the file content
    // 3. Set proper headers for download

    // For now, generate a mock file content
    const reportContent = generateMockReport(report, report.analysis)
    const fileBuffer = Buffer.from(reportContent, 'utf-8')

    // Determine content type based on format
    const contentType = report.format === 'PDF' 
      ? 'application/pdf' 
      : report.format === 'DOCX'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'text/plain'

    // Determine file extension
    const extension = report.format === 'PDF' ? 'pdf' 
      : report.format === 'DOCX' ? 'docx' 
      : 'txt'

    // Generate filename
    const filename = `rapport_analyse_${report.analysis.analysisName.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`

    // Set response headers for file download
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)
    headers.set('Content-Length', fileBuffer.length.toString())
    headers.set('Cache-Control', 'private, max-age=3600') // 1 hour cache

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Download error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors du téléchargement'
      }
    }, { status: 500 })
  }
}

/**
 * Generate mock report content (in real implementation, this would be actual PDF/DOCX)
 */
function generateMockReport(report: any, analysis: any): string {
  const isEnglish = report.language === 'en'
  
  return `
# ${report.title}

${isEnglish ? '## Analysis Report' : '## Rapport d\'Analyse'}

${isEnglish ? '**Generated on**' : '**Généré le**'}: ${new Date().toLocaleDateString(report.language === 'en' ? 'en-US' : 'fr-FR')}
${isEnglish ? '**Analysis**' : '**Analyse**'}: ${analysis.analysisName}
${isEnglish ? '**Format**' : '**Format**'}: ${report.format}
${isEnglish ? '**Language**' : '**Langue**'}: ${report.language}

---

${isEnglish ? '## Summary' : '## Résumé'}

${isEnglish ? 'This report contains the analysis results for the tender documents processed by the Antares AI system.' : 'Ce rapport contient les résultats de l\'analyse des documents d\'appel d\'offres traités par le système IA Antares.'}

${isEnglish ? '**Complexity Score**' : '**Score de Complexité**'}: ${analysis.complexityScore || 'N/A'}/10
${isEnglish ? '**Confidence Level**' : '**Niveau de Confiance**'}: ${analysis.overallConfidence ? `${Math.round(analysis.overallConfidence * 100)}%` : 'N/A'}
${isEnglish ? '**Estimated Preparation**' : '**Préparation Estimée**'}: ${analysis.estimatedPreparationDays || 'N/A'} ${isEnglish ? 'days' : 'jours'}

---

${isEnglish ? '## Technical Requirements' : '## Exigences Techniques'}

${analysis.technicalRequirements && analysis.technicalRequirements.length > 0 ? 
  analysis.technicalRequirements.map((req: any, index: number) => `
${index + 1}. **${req.category}**: ${req.requirement}
   - ${isEnglish ? 'Mandatory' : 'Obligatoire'}: ${req.mandatory ? (isEnglish ? 'Yes' : 'Oui') : (isEnglish ? 'No' : 'Non')}
   - ${isEnglish ? 'Priority' : 'Priorité'}: ${req.priority}
   - ${isEnglish ? 'Confidence' : 'Confiance'}: ${(req.confidence * 100).toFixed(1)}%
`).join('') : 
  (isEnglish ? 'No technical requirements identified.' : 'Aucune exigence technique identifiée.')
}

---

${report.includeRecommendations ? `
${isEnglish ? '## Antares Recommendations' : '## Recommandations Antares'}

${isEnglish ? 'Detailed recommendations will be included in the final implementation.' : 'Les recommandations détaillées seront incluses dans l\'implémentation finale.'}
` : ''}

${report.includeDetailedSections ? `
${isEnglish ? '## Document Sections Analysis' : '## Analyse des Sections de Documents'}

${isEnglish ? 'Detailed section analysis will be included in the final implementation.' : 'L\'analyse détaillée des sections sera incluse dans l\'implémentation finale.'}
` : ''}

---

${isEnglish ? '**Note**: This is a mock report generated for testing purposes.' : '**Note**: Ceci est un rapport de test généré à des fins de démonstration.'}
${isEnglish ? 'In the final implementation, this would be a properly formatted PDF or DOCX document.' : 'Dans l\'implémentation finale, ce serait un document PDF ou DOCX correctement formaté.'}

${isEnglish ? 'Generated by Antares Tender Analysis System' : 'Généré par le Système d\'Analyse d\'Appels d\'Offres Antares'}
`
}