import { PrismaClient, TenderDocument, DocumentFileType, DocumentType, DocumentStatus } from '@prisma/client'
import { validateFileType, getDocumentTypeFromClassification } from '@/lib/validators/dce/tender-upload'

const prisma = new PrismaClient()

export interface CreateTenderDocumentData {
  fileName: string
  fileSize: number
  fileType: DocumentFileType
  projectId: string
  uploadedBy: string
  classification?: Record<string, any>
  storedFileId?: string
}

export interface UpdateTenderDocumentData {
  status?: DocumentStatus
  documentType?: DocumentType
  classification?: Record<string, any>
  processingStartedAt?: Date
  processingCompletedAt?: Date
  storedFileId?: string
}

export interface TenderDocumentFilters {
  projectId?: string
  status?: DocumentStatus
  documentType?: DocumentType
  fileType?: DocumentFileType
}

export class TenderDocumentService {
  /**
   * Create a new tender document record
   */
  async createDocument(data: CreateTenderDocumentData): Promise<TenderDocument> {
    // Validate file type
    const detectedFileType = validateFileType(data.fileName)
    if (detectedFileType !== data.fileType) {
      throw new Error(`Incohérence du type de fichier: détecté ${detectedFileType}, fourni ${data.fileType}`)
    }

    // Determine document type from classification if available
    let documentType: DocumentType = DocumentType.OTHER
    if (data.classification) {
      documentType = getDocumentTypeFromClassification(data.classification)
    }

    return await prisma.tenderDocument.create({
      data: {
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        status: DocumentStatus.PENDING,
        documentType,
        classification: data.classification || {},
        projectId: data.projectId,
        uploadedBy: data.uploadedBy,
        storedFileId: data.storedFileId
      }
    })
  }

  /**
   * Get a tender document by ID
   */
  async getDocumentById(id: string): Promise<TenderDocument | null> {
    return await prisma.tenderDocument.findUnique({
      where: { id }
    })
  }

  /**
   * Get documents by project ID
   */
  async getDocumentsByProject(projectId: string): Promise<TenderDocument[]> {
    return await prisma.tenderDocument.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Get documents with filters
   */
  async getDocuments(filters: TenderDocumentFilters): Promise<TenderDocument[]> {
    return await prisma.tenderDocument.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Update a tender document
   */
  async updateDocument(id: string, data: UpdateTenderDocumentData): Promise<TenderDocument> {
    const existingDocument = await this.getDocumentById(id)
    if (!existingDocument) {
      throw new Error(`Document non trouvé: ${id}`)
    }

    // If classification is being updated, re-determine document type
    let documentType = data.documentType
    if (data.classification && !documentType) {
      documentType = getDocumentTypeFromClassification(data.classification)
    }

    return await prisma.tenderDocument.update({
      where: { id },
      data: {
        ...data,
        documentType: documentType || existingDocument.documentType,
        updatedAt: new Date()
      }
    })
  }

  /**
   * Update document status with timestamps
   */
  async updateDocumentStatus(id: string, status: DocumentStatus): Promise<TenderDocument> {
    const updateData: UpdateTenderDocumentData = { status }

    // Set appropriate timestamps based on status
    switch (status) {
      case DocumentStatus.PROCESSING:
        updateData.processingStartedAt = new Date()
        break
      case DocumentStatus.ANALYZED:
      case DocumentStatus.ERROR:
        updateData.processingCompletedAt = new Date()
        break
    }

    return await this.updateDocument(id, updateData)
  }

  /**
   * Bulk update documents
   */
  async bulkUpdateDocuments(
    documentIds: string[], 
    data: UpdateTenderDocumentData
  ): Promise<{ count: number }> {
    const result = await prisma.tenderDocument.updateMany({
      where: {
        id: { in: documentIds }
      },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })

    return { count: result.count }
  }

  /**
   * Delete a tender document
   */
  async deleteDocument(id: string): Promise<TenderDocument> {
    const existingDocument = await this.getDocumentById(id)
    if (!existingDocument) {
      throw new Error(`Document non trouvé: ${id}`)
    }

    return await prisma.tenderDocument.delete({
      where: { id }
    })
  }

  /**
   * Delete multiple documents by project
   */
  async deleteDocumentsByProject(projectId: string): Promise<{ count: number }> {
    const result = await prisma.tenderDocument.deleteMany({
      where: { projectId }
    })

    return { count: result.count }
  }

  /**
   * Get document statistics for a project
   */
  async getProjectDocumentStats(projectId: string) {
    const documents = await this.getDocumentsByProject(projectId)
    
    const stats = {
      total: documents.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byFileType: {} as Record<string, number>,
      totalSize: 0,
      averageConfidence: 0
    }

    documents.forEach(doc => {
      // Count by status
      stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1
      
      // Count by document type
      stats.byType[doc.documentType] = (stats.byType[doc.documentType] || 0) + 1
      
      // Count by file type
      stats.byFileType[doc.fileType] = (stats.byFileType[doc.fileType] || 0) + 1
      
      // Sum file sizes
      stats.totalSize += doc.fileSize
      
      // Calculate average confidence
      const confidence = (doc.classification as any)?.confidence || 0
      stats.averageConfidence += confidence
    })

    if (documents.length > 0) {
      stats.averageConfidence /= documents.length
    }

    return stats
  }

  /**
   * Validate documents for analysis
   */
  async validateDocumentsForAnalysis(documentIds: string[]): Promise<{
    valid: TenderDocument[]
    invalid: { id: string, reason: string }[]
  }> {
    const documents = await prisma.tenderDocument.findMany({
      where: {
        id: { in: documentIds }
      }
    })

    const valid: TenderDocument[] = []
    const invalid: { id: string, reason: string }[] = []

    documentIds.forEach(id => {
      const doc = documents.find(d => d.id === id)
      
      if (!doc) {
        invalid.push({ id, reason: 'Document non trouvé' })
        return
      }

      if (doc.status === DocumentStatus.ERROR) {
        invalid.push({ id, reason: 'Document en erreur' })
        return
      }

      if (doc.status === DocumentStatus.PENDING) {
        invalid.push({ id, reason: 'Document non encore traité' })
        return
      }

      valid.push(doc)
    })

    return { valid, invalid }
  }

  /**
   * Get documents ready for analysis
   */
  async getDocumentsReadyForAnalysis(projectId: string): Promise<TenderDocument[]> {
    return await prisma.tenderDocument.findMany({
      where: {
        projectId,
        status: DocumentStatus.ANALYZED
      },
      orderBy: { createdAt: 'asc' }
    })
  }

  /**
   * Check if project has enough documents for analysis
   */
  async canProjectStartAnalysis(projectId: string): Promise<{
    canStart: boolean
    reason?: string
    documentCount: number
    analyzedCount: number
  }> {
    const allDocuments = await this.getDocumentsByProject(projectId)
    const analyzedDocuments = allDocuments.filter(doc => doc.status === DocumentStatus.ANALYZED)
    
    const result = {
      canStart: false,
      documentCount: allDocuments.length,
      analyzedCount: analyzedDocuments.length,
      reason: undefined as string | undefined
    }

    if (allDocuments.length === 0) {
      result.reason = 'Aucun document téléchargé'
      return result
    }

    if (analyzedDocuments.length === 0) {
      result.reason = 'Aucun document analysé et classifié'
      return result
    }

    // Check if we have at least one technical document (CCTP or CCP)
    const technicalDocs = analyzedDocuments.filter(doc => 
      doc.documentType === DocumentType.CCTP || 
      doc.documentType === DocumentType.CCP
    )

    if (technicalDocs.length === 0) {
      result.reason = 'Aucun document technique (CCTP ou CCP) disponible'
      return result
    }

    result.canStart = true
    return result
  }

  /**
   * Get document processing summary
   */
  async getProcessingSummary(documentIds: string[]) {
    const documents = await prisma.tenderDocument.findMany({
      where: {
        id: { in: documentIds }
      }
    })

    const processingTimes: number[] = []
    const confidenceScores: number[] = []

    documents.forEach(doc => {
      // Calculate processing time if both timestamps exist
      if (doc.processingStartedAt && doc.processingCompletedAt) {
        const processingTime = doc.processingCompletedAt.getTime() - doc.processingStartedAt.getTime()
        processingTimes.push(processingTime)
      }

      // Extract confidence score
      const confidence = (doc.classification as any)?.confidence
      if (typeof confidence === 'number') {
        confidenceScores.push(confidence)
      }
    })

    return {
      documentCount: documents.length,
      averageProcessingTime: processingTimes.length > 0 
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
        : null,
      averageConfidence: confidenceScores.length > 0 
        ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
        : null,
      totalSize: documents.reduce((sum, doc) => sum + doc.fileSize, 0)
    }
  }
}