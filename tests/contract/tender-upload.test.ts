import { describe, it, expect } from 'vitest'
import { TenderUploadRequestSchema, TenderUploadResponseSchema } from '@/lib/validators/dce/tender-upload'

describe('Tender Upload API Contract', () => {
  describe('TenderUploadRequestSchema', () => {
    it('should validate valid upload request', () => {
      const validRequest = {
        files: [
          {
            name: 'cctp-exemple.pdf',
            size: 1024 * 1024, // 1MB
            type: 'application/pdf'
          }
        ],
        projectId: 'clxyz123456789abcdef',
        analysisName: 'Analyse DCE Mars 2025'
      }

      const result = TenderUploadRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject empty files array', () => {
      const invalidRequest = {
        files: [],
        projectId: 'clxyz123456789abcdef'
      }

      const result = TenderUploadRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toContain('Au moins un fichier est requis')
    })

    it('should reject files larger than 50MB', () => {
      const invalidRequest = {
        files: [
          {
            name: 'large-file.pdf',
            size: 60 * 1024 * 1024, // 60MB
            type: 'application/pdf'
          }
        ],
        projectId: 'clxyz123456789abcdef'
      }

      const result = TenderUploadRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toContain('50MB')
    })

    it('should reject unsupported file types', () => {
      const invalidRequest = {
        files: [
          {
            name: 'document.txt',
            size: 1024,
            type: 'text/plain'
          }
        ],
        projectId: 'clxyz123456789abcdef'
      }

      const result = TenderUploadRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toContain('Format de fichier non supporté')
    })

    it('should reject more than 10 files', () => {
      const files = Array.from({ length: 11 }, (_, i) => ({
        name: `file-${i}.pdf`,
        size: 1024,
        type: 'application/pdf'
      }))

      const invalidRequest = {
        files,
        projectId: 'clxyz123456789abcdef'
      }

      const result = TenderUploadRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toContain('Maximum 10 fichiers')
    })

    it('should reject invalid project ID format', () => {
      const invalidRequest = {
        files: [
          {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf'
          }
        ],
        projectId: 'invalid-id'
      }

      const result = TenderUploadRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toContain('ID projet invalide')
    })

    it('should accept optional analysis name', () => {
      const requestWithoutName = {
        files: [
          {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf'
          }
        ],
        projectId: 'clxyz123456789abcdef'
      }

      const result = TenderUploadRequestSchema.safeParse(requestWithoutName)
      expect(result.success).toBe(true)
    })

    it('should validate all supported file types', () => {
      const supportedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]

      supportedTypes.forEach(type => {
        const request = {
          files: [
            {
              name: 'test-file',
              size: 1024,
              type
            }
          ],
          projectId: 'clxyz123456789abcdef'
        }

        const result = TenderUploadRequestSchema.safeParse(request)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('TenderUploadResponseSchema', () => {
    it('should validate successful upload response', () => {
      const successResponse = {
        success: true,
        data: {
          uploadId: 'upload_123456',
          documents: [
            {
              id: 'doc_123456',
              fileName: 'cctp-exemple.pdf',
              fileSize: 1024576,
              fileType: 'PDF',
              status: 'PENDING',
              documentType: 'CCTP',
              classification: {
                confidence: 0.95,
                type: 'cctp'
              }
            }
          ]
        }
      }

      const result = TenderUploadResponseSchema.safeParse(successResponse)
      expect(result.success).toBe(true)
    })

    it('should validate error response', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Le type de fichier n\'est pas supporté',
          details: {
            supportedTypes: ['PDF', 'DOC', 'DOCX']
          }
        }
      }

      const result = TenderUploadResponseSchema.safeParse(errorResponse)
      expect(result.success).toBe(true)
    })

    it('should validate response with multiple documents', () => {
      const multiDocResponse = {
        success: true,
        data: {
          uploadId: 'upload_789',
          documents: [
            {
              id: 'doc_1',
              fileName: 'cctp.pdf',
              fileSize: 2048000,
              fileType: 'PDF',
              status: 'PROCESSING'
            },
            {
              id: 'doc_2',
              fileName: 'ccp.docx',
              fileSize: 512000,
              fileType: 'DOCX',
              status: 'PENDING'
            }
          ]
        }
      }

      const result = TenderUploadResponseSchema.safeParse(multiDocResponse)
      expect(result.success).toBe(true)
    })

    it('should validate all error codes', () => {
      const errorCodes = [
        'INVALID_FILE_TYPE',
        'FILE_TOO_LARGE',
        'TOO_MANY_FILES',
        'PROJECT_NOT_FOUND',
        'UPLOAD_FAILED'
      ]

      errorCodes.forEach(code => {
        const errorResponse = {
          success: false,
          error: {
            code,
            message: 'Test error message'
          }
        }

        const result = TenderUploadResponseSchema.safeParse(errorResponse)
        expect(result.success).toBe(true)
      })
    })
  })
})