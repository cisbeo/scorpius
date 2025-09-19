import { PrismaClient, TenderAnalysis, DocumentStatus, TenderDocument, TenderSection, AntaresRecommendation } from '@prisma/client'
import { createDefaultAnalysisName, getEstimatedAnalysisTime } from '@/lib/validators/dce/tender-analysis'

const prisma = new PrismaClient()

export interface CreateTenderAnalysisData {
  name?: string
  documentIds: string[]
  projectId: string
  createdBy: string
  options?: {
    includeRecommendations?: boolean
    detailedExtraction?: boolean
    generateReport?: boolean
  }
}

export interface UpdateTenderAnalysisData {
  status?: DocumentStatus
  complexityScore?: number
  overallConfidence?: number
  analysisCompletedAt?: Date
  estimatedPreparationDays?: number
  marketScope?: Record<string, any>
  technicalRequirements?: any[]
  evaluationCriteria?: Record<string, any>
  timeConstraints?: Record<string, any>
  mandatoryRequirements?: string[]
  errorMessage?: string
}

export interface TenderAnalysisWithRelations extends TenderAnalysis {
  documents?: TenderDocument[]
  sections?: TenderSection[]
  recommendations?: AntaresRecommendation[]
}

export class TenderAnalysisService {
  /**
   * Create a new tender analysis
   */
  async createAnalysis(data: CreateTenderAnalysisData): Promise<TenderAnalysis> {
    // Generate analysis name if not provided
    const analysisName = data.name || createDefaultAnalysisName()

    // Validate documents exist and are ready for analysis
    const documents = await prisma.tenderDocument.findMany({
      where: {
        id: { in: data.documentIds },
        projectId: data.projectId,
        status: 'ANALYZED'
      }
    })

    if (documents.length === 0) {
      throw new Error('Aucun document valide trouvé pour l\'analyse')
    }

    if (documents.length !== data.documentIds.length) {
      const foundIds = documents.map(d => d.id)
      const missingIds = data.documentIds.filter(id => !foundIds.includes(id))
      throw new Error(`Documents manquants ou non analysés: ${missingIds.join(', ')}`)
    }

    // Calculate total size for time estimation
    const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, 0)
    const estimatedTime = getEstimatedAnalysisTime(documents.length, totalSize)

    // Create the analysis
    const analysis = await prisma.tenderAnalysis.create({
      data: {
        analysisName: analysisName,
        status: DocumentStatus.PENDING,
        complexityScore: 1, // Will be updated during analysis
        overallConfidence: 0.0, // Will be updated during analysis
        projectId: data.projectId,
        marketScope: {},
        technicalRequirements: [],
        evaluationCriteria: {},
        timeConstraints: {},
        mandatoryRequirements: []
        // analysisCompletedAt will be set when analysis is completed
      }
    })

    // Link documents to analysis
    await Promise.all(
      documents.map(doc =>
        prisma.tenderDocumentAnalysis.create({
          data: {
            documentId: doc.id,
            analysisId: analysis.id
          }
        })
      )
    )

    return analysis
  }

  /**
   * Get analysis by ID with optional relations
   */
  async getAnalysisById(
    id: string, 
    includeRelations: boolean = false
  ): Promise<TenderAnalysisWithRelations | null> {
    const include = includeRelations ? {
      documents: {
        include: {
          document: true
        }
      },
      recommendations: true
    } : undefined

    return await prisma.tenderAnalysis.findUnique({
      where: { id },
      include
    }) as TenderAnalysisWithRelations | null
  }

  /**
   * Get analyses by project
   */
  async getAnalysesByProject(projectId: string): Promise<TenderAnalysis[]> {
    return await prisma.tenderAnalysis.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Update analysis data
   */
  async updateAnalysis(id: string, data: UpdateTenderAnalysisData): Promise<TenderAnalysis> {
    const existingAnalysis = await this.getAnalysisById(id)
    if (!existingAnalysis) {
      throw new Error(`Analyse non trouvée: ${id}`)
    }

    return await prisma.tenderAnalysis.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })
  }

  /**
   * Update analysis status
   */
  async updateAnalysisStatus(id: string, status: DocumentStatus, errorMessage?: string): Promise<TenderAnalysis> {
    const updateData: UpdateTenderAnalysisData = { status }

    // Set completion timestamp for completed analyses
    if (status === DocumentStatus.ANALYZED) {
      updateData.analysisCompletedAt = new Date()
    }

    // Set error message for failed analyses
    if (status === DocumentStatus.ERROR && errorMessage) {
      updateData.errorMessage = errorMessage
    }

    return await this.updateAnalysis(id, updateData)
  }

  /**
   * Mark analysis as processing
   */
  async startAnalysis(id: string): Promise<TenderAnalysis> {
    return await this.updateAnalysisStatus(id, DocumentStatus.PROCESSING)
  }

  /**
   * Complete analysis with results
   */
  async completeAnalysis(id: string, results: {
    complexityScore: number
    overallConfidence: number
    estimatedPreparationDays?: number
    marketScope?: Record<string, any>
    technicalRequirements?: any[]
    evaluationCriteria?: Record<string, any>
    timeConstraints?: Record<string, any>
    mandatoryRequirements?: string[]
  }): Promise<TenderAnalysis> {
    // Validate complexity score
    if (results.complexityScore < 1 || results.complexityScore > 10) {
      throw new Error('Le score de complexité doit être entre 1 et 10')
    }

    // Validate confidence score
    if (results.overallConfidence < 0 || results.overallConfidence > 1) {
      throw new Error('Le score de confiance doit être entre 0 et 1')
    }

    return await this.updateAnalysis(id, {
      status: DocumentStatus.ANALYZED,
      analysisCompletedAt: new Date(),
      ...results
    })
  }

  /**
   * Fail analysis with error
   */
  async failAnalysis(id: string, errorMessage: string): Promise<TenderAnalysis> {
    return await this.updateAnalysisStatus(id, DocumentStatus.ERROR, errorMessage)
  }

  /**
   * Delete analysis and related data
   */
  async deleteAnalysis(id: string): Promise<TenderAnalysis> {
    const existingAnalysis = await this.getAnalysisById(id)
    if (!existingAnalysis) {
      throw new Error(`Analyse non trouvée: ${id}`)
    }

    // Delete related data (cascade should handle this, but explicit cleanup)
    await prisma.antaresRecommendation.deleteMany({
      where: { analysisId: id }
    })

    await prisma.tenderSection.deleteMany({
      where: { analysisId: id }
    })

    await prisma.analysisReport.deleteMany({
      where: { analysisId: id }
    })

    return await prisma.tenderAnalysis.delete({
      where: { id }
    })
  }

  /**
   * Get analysis progress information
   */
  async getAnalysisProgress(id: string): Promise<{
    analysisId: string
    status: DocumentStatus
    progress: number
    currentStep?: string
    estimatedTimeRemaining?: number
    steps: Array<{
      name: string
      status: 'pending' | 'processing' | 'completed' | 'error'
      startedAt?: Date
      completedAt?: Date
      duration?: number
    }>
  }> {
    const analysis = await this.getAnalysisById(id, true)
    if (!analysis) {
      throw new Error(`Analyse non trouvée: ${id}`)
    }

    // Define analysis steps
    const steps = [
      { name: 'Classification des documents', status: 'completed' as const },
      { name: 'Extraction du contenu', status: analysis.status === 'PENDING' ? 'pending' as const : 'completed' as const },
      { name: 'Analyse IA des exigences', status: analysis.status === 'PROCESSING' ? 'processing' as const : 
        (analysis.status === 'COMPLETED' ? 'completed' as const : 'pending' as const) },
      { name: 'Génération des recommandations', status: analysis.status === 'COMPLETED' ? 'completed' as const : 'pending' as const },
      { name: 'Finalisation de l\'analyse', status: analysis.status === 'COMPLETED' ? 'completed' as const : 'pending' as const }
    ]

    // Calculate progress percentage
    let progress = 0
    switch (analysis.status) {
      case 'PENDING':
        progress = 10
        break
      case 'PROCESSING':
        progress = 60
        break
      case 'COMPLETED':
        progress = 100
        break
      case 'ERROR':
        progress = 0
        break
    }

    // Estimate remaining time
    let estimatedTimeRemaining: number | undefined
    if (analysis.status === 'PROCESSING' && analysis.estimatedTimeMs) {
      const elapsed = Date.now() - analysis.createdAt.getTime()
      const remaining = Math.max(0, analysis.estimatedTimeMs - elapsed)
      estimatedTimeRemaining = Math.round(remaining / 1000) // Convert to seconds
    }

    return {
      analysisId: id,
      status: analysis.status,
      progress,
      currentStep: analysis.status === 'PROCESSING' ? 'Analyse IA des exigences' : undefined,
      estimatedTimeRemaining,
      steps
    }
  }

  /**
   * Get analysis statistics for a project
   */
  async getProjectAnalysisStats(projectId: string) {
    const analyses = await this.getAnalysesByProject(projectId)
    
    const stats = {
      total: analyses.length,
      byStatus: {} as Record<string, number>,
      averageComplexity: 0,
      averageConfidence: 0,
      totalProcessingTime: 0,
      successRate: 0
    }

    let complexitySum = 0
    let confidenceSum = 0
    let processingTimeSum = 0
    let completedCount = 0

    analyses.forEach(analysis => {
      // Count by status
      stats.byStatus[analysis.status] = (stats.byStatus[analysis.status] || 0) + 1
      
      // Calculate averages for completed analyses
      if (analysis.status === 'COMPLETED') {
        completedCount++
        complexitySum += analysis.complexityScore
        confidenceSum += analysis.overallConfidence
        
        if (analysis.analysisCompletedAt) {
          const processingTime = analysis.analysisCompletedAt.getTime() - analysis.createdAt.getTime()
          processingTimeSum += processingTime
        }
      }
    })

    if (completedCount > 0) {
      stats.averageComplexity = complexitySum / completedCount
      stats.averageConfidence = confidenceSum / completedCount
      stats.totalProcessingTime = processingTimeSum / completedCount
    }

    if (analyses.length > 0) {
      stats.successRate = completedCount / analyses.length
    }

    return stats
  }

  /**
   * Check if analysis can be started
   */
  async canStartAnalysis(projectId: string, documentIds: string[]): Promise<{
    canStart: boolean
    reason?: string
  }> {
    // Check if documents exist and are ready
    const documents = await prisma.tenderDocument.findMany({
      where: {
        id: { in: documentIds },
        projectId,
        status: 'ANALYZED'
      }
    })

    if (documents.length === 0) {
      return { canStart: false, reason: 'Aucun document valide trouvé' }
    }

    if (documents.length !== documentIds.length) {
      return { canStart: false, reason: 'Certains documents ne sont pas prêts pour l\'analyse' }
    }

    // Check if there's already a running analysis for this project
    const runningAnalysis = await prisma.tenderAnalysis.findFirst({
      where: {
        projectId,
        status: { in: ['PENDING', 'PROCESSING'] }
      }
    })

    if (runningAnalysis) {
      return { canStart: false, reason: 'Une analyse est déjà en cours pour ce projet' }
    }

    return { canStart: true }
  }

  /**
   * Estimate page count based on file size and type
   */
  private estimatePageCount(fileSize: number, fileType: string): number {
    // Rough estimates based on file type
    const avgBytesPerPage = {
      'PDF': 100000,   // 100KB per page
      'DOCX': 50000,   // 50KB per page
      'DOC': 80000     // 80KB per page
    }

    const bytesPerPage = (avgBytesPerPage as any)[fileType] || 100000
    return Math.max(1, Math.round(fileSize / bytesPerPage))
  }

  /**
   * Get recent analyses across all projects (for dashboard)
   */
  async getRecentAnalyses(limit: number = 10): Promise<TenderAnalysis[]> {
    return await prisma.tenderAnalysis.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            name: true,
            organization: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })
  }

  /**
   * Search analyses by name or content
   */
  async searchAnalyses(query: string, projectId?: string): Promise<TenderAnalysis[]> {
    const whereClause: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { marketScope: { path: ['title'], string_contains: query } },
        { marketScope: { path: ['description'], string_contains: query } }
      ]
    }

    if (projectId) {
      whereClause.projectId = projectId
    }

    return await prisma.tenderAnalysis.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })
  }
}