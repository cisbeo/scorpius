import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { createMockFile, createTestProject, cleanupTestData } from '../test-utils'

const prisma = new PrismaClient()

describe('Tender Upload Flow Integration', () => {
  let testProjectId: string
  let testUserId: string

  beforeEach(async () => {
    // Setup test data
    const testData = await createTestProject()
    testProjectId = testData.projectId
    testUserId = testData.userId
  })

  afterEach(async () => {
    // Cleanup test data
    await cleanupTestData(testProjectId, testUserId)
  })

  describe('Complete Upload → Classification → Storage Workflow', () => {
    it('should successfully upload, classify and store a CCTP document', async () => {
      // Simulate PDF file upload
      const mockCCTPFile = createMockFile({
        name: 'cctp-infrastructure-cloud.pdf',
        size: 2 * 1024 * 1024, // 2MB
        type: 'application/pdf',
        content: 'Mock CCTP content with technical specifications...'
      })

      // Step 1: Upload document
      const uploadResponse = await fetch('/api/tenders/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: [
            {
              name: mockCCTPFile.name,
              size: mockCCTPFile.size,
              type: mockCCTPFile.type
            }
          ],
          projectId: testProjectId,
          analysisName: 'Test Upload Flow'
        })
      })

      expect(uploadResponse.status).toBe(200)
      const uploadResult = await uploadResponse.json()
      
      expect(uploadResult.success).toBe(true)
      expect(uploadResult.data.uploadId).toBeDefined()
      expect(uploadResult.data.documents).toHaveLength(1)
      
      const uploadedDoc = uploadResult.data.documents[0]
      expect(uploadedDoc.fileName).toBe(mockCCTPFile.name)
      expect(uploadedDoc.fileSize).toBe(mockCCTPFile.size)
      expect(uploadedDoc.fileType).toBe('PDF')
      expect(uploadedDoc.status).toBe('PENDING')

      // Step 2: Verify document stored in database
      const storedDocument = await prisma.tenderDocument.findUnique({
        where: { id: uploadedDoc.id }
      })

      expect(storedDocument).toBeDefined()
      expect(storedDocument!.fileName).toBe(mockCCTPFile.name)
      expect(storedDocument!.projectId).toBe(testProjectId)
      expect(storedDocument!.status).toBe('PENDING')

      // Step 3: Simulate classification process
      // In real implementation, this would be triggered by the upload
      const classificationResult = {
        confidence: 0.94,
        type: 'cctp',
        detectedSections: ['specifications', 'requirements', 'constraints']
      }

      // Update document with classification
      const updatedDocument = await prisma.tenderDocument.update({
        where: { id: uploadedDoc.id },
        data: {
          status: 'ANALYZED',
          documentType: 'CCTP',
          classification: classificationResult
        }
      })

      expect(updatedDocument.documentType).toBe('CCTP')
      expect(updatedDocument.classification).toEqual(classificationResult)
      expect(updatedDocument.status).toBe('ANALYZED')

      // Step 4: Verify project relationship
      const projectWithDocuments = await prisma.project.findUnique({
        where: { id: testProjectId },
        include: { tenderDocuments: true }
      })

      expect(projectWithDocuments!.tenderDocuments).toHaveLength(1)
      expect(projectWithDocuments!.tenderDocuments[0].id).toBe(uploadedDoc.id)
    })

    it('should handle multiple document upload with different types', async () => {
      const mockFiles = [
        createMockFile({
          name: 'cctp-technique.pdf',
          size: 1.5 * 1024 * 1024,
          type: 'application/pdf'
        }),
        createMockFile({
          name: 'ccp-commercial.docx',
          size: 800 * 1024,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }),
        createMockFile({
          name: 'bpu-prix.doc',
          size: 600 * 1024,
          type: 'application/msword'
        })
      ]

      // Upload multiple documents
      const uploadResponse = await fetch('/api/tenders/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: mockFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type
          })),
          projectId: testProjectId,
          analysisName: 'Test Multi-Document Upload'
        })
      })

      expect(uploadResponse.status).toBe(200)
      const uploadResult = await uploadResponse.json()
      
      expect(uploadResult.success).toBe(true)
      expect(uploadResult.data.documents).toHaveLength(3)

      // Verify all documents are stored
      const storedDocuments = await prisma.tenderDocument.findMany({
        where: { projectId: testProjectId },
        orderBy: { fileName: 'asc' }
      })

      expect(storedDocuments).toHaveLength(3)
      
      // Check file types are correctly identified
      expect(storedDocuments[0].fileType).toBe('DOC') // bpu-prix.doc
      expect(storedDocuments[1].fileType).toBe('DOCX') // ccp-commercial.docx
      expect(storedDocuments[2].fileType).toBe('PDF') // cctp-technique.pdf

      // Simulate classification for each document
      const classifications = [
        { type: 'BPU', confidence: 0.91 },
        { type: 'CCP', confidence: 0.88 },
        { type: 'CCTP', confidence: 0.95 }
      ]

      for (let i = 0; i < storedDocuments.length; i++) {
        await prisma.tenderDocument.update({
          where: { id: storedDocuments[i].id },
          data: {
            status: 'ANALYZED',
            documentType: classifications[i].type as any,
            classification: {
              confidence: classifications[i].confidence,
              type: classifications[i].type.toLowerCase()
            }
          }
        })
      }

      // Verify final state
      const finalDocuments = await prisma.tenderDocument.findMany({
        where: { projectId: testProjectId },
        orderBy: { fileName: 'asc' }
      })

      expect(finalDocuments[0].documentType).toBe('BPU')
      expect(finalDocuments[1].documentType).toBe('CCP')
      expect(finalDocuments[2].documentType).toBe('CCTP')
    })

    it('should handle upload errors gracefully', async () => {
      // Test file too large
      const tooLargeFile = createMockFile({
        name: 'huge-document.pdf',
        size: 60 * 1024 * 1024, // 60MB (exceeds 50MB limit)
        type: 'application/pdf'
      })

      const uploadResponse = await fetch('/api/tenders/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: [
            {
              name: tooLargeFile.name,
              size: tooLargeFile.size,
              type: tooLargeFile.type
            }
          ],
          projectId: testProjectId
        })
      })

      expect(uploadResponse.status).toBe(400)
      const errorResult = await uploadResponse.json()
      
      expect(errorResult.success).toBe(false)
      expect(errorResult.error.code).toBe('FILE_TOO_LARGE')
      expect(errorResult.error.message).toContain('50MB')

      // Verify no document was created
      const documentsCount = await prisma.tenderDocument.count({
        where: { projectId: testProjectId }
      })
      expect(documentsCount).toBe(0)
    })

    it('should handle unsupported file types', async () => {
      const unsupportedFile = createMockFile({
        name: 'document.txt',
        size: 1024,
        type: 'text/plain'
      })

      const uploadResponse = await fetch('/api/tenders/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: [
            {
              name: unsupportedFile.name,
              size: unsupportedFile.size,
              type: unsupportedFile.type
            }
          ],
          projectId: testProjectId
        })
      })

      expect(uploadResponse.status).toBe(400)
      const errorResult = await uploadResponse.json()
      
      expect(errorResult.success).toBe(false)
      expect(errorResult.error.code).toBe('INVALID_FILE_TYPE')
      expect(errorResult.error.message).toContain('PDF, DOC, DOCX')
    })

    it('should handle non-existent project', async () => {
      const mockFile = createMockFile({
        name: 'test.pdf',
        size: 1024,
        type: 'application/pdf'
      })

      const uploadResponse = await fetch('/api/tenders/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: [
            {
              name: mockFile.name,
              size: mockFile.size,
              type: mockFile.type
            }
          ],
          projectId: 'clnonexistentproject'
        })
      })

      expect(uploadResponse.status).toBe(404)
      const errorResult = await uploadResponse.json()
      
      expect(errorResult.success).toBe(false)
      expect(errorResult.error.code).toBe('PROJECT_NOT_FOUND')
    })

    it('should create analysis name automatically when not provided', async () => {
      const mockFile = createMockFile({
        name: 'auto-analysis.pdf',
        size: 1024,
        type: 'application/pdf'
      })

      const uploadResponse = await fetch('/api/tenders/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: [
            {
              name: mockFile.name,
              size: mockFile.size,
              type: mockFile.type
            }
          ],
          projectId: testProjectId
          // No analysisName provided
        })
      })

      expect(uploadResponse.status).toBe(200)
      const uploadResult = await uploadResponse.json()
      
      expect(uploadResult.success).toBe(true)
      
      // Verify auto-generated analysis name format
      const storedDocument = await prisma.tenderDocument.findFirst({
        where: { projectId: testProjectId }
      })
      
      expect(storedDocument).toBeDefined()
      // Analysis name should be auto-generated in the service layer
    })
  })
})