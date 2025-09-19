import { z } from 'zod'
import { DocumentFileType, DocumentType } from '@prisma/client'

// Validation pour l'upload de documents DCE
export const TenderUploadRequestSchema = z.object({
  files: z.array(z.object({
    name: z.string().min(1, 'Le nom du fichier est requis'),
    size: z.number()
      .min(1, 'Le fichier ne peut pas être vide')
      .max(50 * 1024 * 1024, 'Le fichier ne peut pas dépasser 50MB'),
    type: z.string().refine(
      (type) => ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(type),
      'Format de fichier non supporté. Formats acceptés: PDF, DOC, DOCX'
    )
  })).min(1, 'Au moins un fichier est requis').max(10, 'Maximum 10 fichiers par upload'),
  
  projectId: z.string().cuid('ID projet invalide'),
  
  analysisName: z.string()
    .min(1, 'Le nom de l\'analyse est requis')
    .max(100, 'Le nom de l\'analyse ne peut pas dépasser 100 caractères')
    .optional()
})

// Schema pour la réponse d'upload
export const TenderUploadResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    uploadId: z.string(),
    documents: z.array(z.object({
      id: z.string(),
      fileName: z.string(),
      fileSize: z.number(),
      fileType: z.nativeEnum(DocumentFileType),
      status: z.enum(['PENDING', 'PROCESSING', 'ANALYZED', 'FAILED']),
      documentType: z.nativeEnum(DocumentType).optional(),
      classification: z.record(z.any()).optional()
    }))
  }).optional(),
  error: z.object({
    code: z.enum(['INVALID_FILE_TYPE', 'FILE_TOO_LARGE', 'TOO_MANY_FILES', 'PROJECT_NOT_FOUND', 'UPLOAD_FAILED']),
    message: z.string(),
    details: z.record(z.any()).optional()
  }).optional()
})

// Schema pour la validation des métadonnées de fichier
export const FileMetadataSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  fileType: z.nativeEnum(DocumentFileType),
  uploadedBy: z.string().min(1),
  projectId: z.string().cuid()
})

// Schema pour la mise à jour du statut de document
export const DocumentStatusUpdateSchema = z.object({
  documentId: z.string().cuid(),
  status: z.enum(['PENDING', 'PROCESSING', 'ANALYZED', 'ERROR']),
  classification: z.record(z.any()).optional(),
  documentType: z.nativeEnum(DocumentType).optional(),
  processingStartedAt: z.date().optional(),
  processingCompletedAt: z.date().optional()
})

// Types dérivés pour TypeScript
export type TenderUploadRequest = z.infer<typeof TenderUploadRequestSchema>
export type TenderUploadResponse = z.infer<typeof TenderUploadResponseSchema>
export type FileMetadata = z.infer<typeof FileMetadataSchema>
export type DocumentStatusUpdate = z.infer<typeof DocumentStatusUpdateSchema>

// Utilitaires de validation
export const validateFileType = (fileName: string): DocumentFileType => {
  const extension = fileName.toLowerCase().split('.').pop()
  
  switch (extension) {
    case 'pdf':
      return DocumentFileType.PDF
    case 'doc':
      return DocumentFileType.DOC
    case 'docx':
      return DocumentFileType.DOCX
    default:
      throw new Error(`Extension de fichier non supportée: ${extension}`)
  }
}

export const validateFileSize = (size: number): boolean => {
  return size > 0 && size <= 50 * 1024 * 1024 // 50MB max
}

export const getDocumentTypeFromClassification = (classification: Record<string, any>): DocumentType => {
  // Logique pour déterminer le type de document basé sur la classification IA
  const confidence = classification.confidence || 0
  const detectedType = classification.type || 'OTHER'
  
  if (confidence < 0.8) {
    return DocumentType.OTHER
  }
  
  switch (detectedType.toLowerCase()) {
    case 'cctp':
      return DocumentType.CCTP
    case 'ccp':
      return DocumentType.CCP
    case 'bpu':
      return DocumentType.BPU
    case 'rc':
      return DocumentType.RC
    case 'dce_complete':
      return DocumentType.DCE_COMPLETE
    default:
      return DocumentType.OTHER
  }
}