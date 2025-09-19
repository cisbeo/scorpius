import { NextRequest, NextResponse } from 'next/server'
import { TenderUploadRequestSchema, TenderUploadResponseSchema } from '@/lib/validators/dce/tender-upload'
import { TenderDocumentService } from '@/lib/services/french-tender/tender-document.service'
import { DCEClassifierService } from '@/lib/services/french-tender/dce-classifier.service'
import { LlamaCloudExtractorService } from '@/lib/services/french-tender/llamacloud-extractor.service'
import { FileStorageService } from '@/lib/services/french-tender/file-storage.service'

const documentService = new TenderDocumentService()
const classifierService = new DCEClassifierService()
const llamaExtractorService = new LlamaCloudExtractorService()
const fileStorageService = new FileStorageService()

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json()
    
    // Validate the request
    const validationResult = TenderUploadRequestSchema.safeParse(body)
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

    const { files, projectId, analysisName } = validationResult.data

    // Verify project exists and user has access
    // TODO: Add proper authentication and authorization
    const userId = request.headers.get('x-user-id') || 'mock-user-id'

    // Process each file
    const processedDocuments = []
    const errors = []

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name} (${file.size} bytes)`)
        console.log(`File object structure:`, Object.keys(file))
        console.log(`File content type:`, typeof file.content)
        console.log(`File content exists:`, !!file.content)

        // Check if file has content property
        if (!file.content) {
          throw new Error(`Fichier ${file.name}: contenu manquant ou invalide`)
        }

        // 1. Convert base64 to buffer (files come as base64 from frontend)
        let base64Data: string
        if (file.content.includes(',')) {
          // Remove data:mime;base64, prefix if present
          base64Data = file.content.split(',')[1]
        } else {
          // Content is already base64 without prefix
          base64Data = file.content
        }
        
        const fileBuffer = Buffer.from(base64Data, 'base64')
        console.log(`Converted to buffer: ${fileBuffer.length} bytes`)

        // 2. Store the actual file
        const storedFile = await fileStorageService.storeFile(fileBuffer, file.name, file.type)
        console.log(`File stored with ID: ${storedFile.id}`)

        // 3. Extract content using LlamaCloud
        const extractionResult = await llamaExtractorService.extractFromBuffer(
          fileBuffer,
          file.name,
          file.type === 'application/pdf' ? 'PDF' : 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'DOCX' : 'DOC',
          {
            includeImages: false,
            includeTables: true,
            performOCR: true,
            preserveFormatting: true,
            language: 'fr'
          }
        )

        // Classify document using AI-powered classification
        const classificationResult = await classifierService.classifyDocument(
          file.name,
          extractionResult.content,
          file.size
        )
        
        console.log(`Document classified as ${classificationResult.documentType} with ${(classificationResult.confidence * 100).toFixed(1)}% confidence`)
        console.log(`Classification reasoning: ${classificationResult.reasoning}`)

        // Create document record with stored file ID
        const document = await documentService.createDocument({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type === 'application/pdf' ? 'PDF' : 
                   file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'DOCX' : 'DOC',
          projectId,
          uploadedBy: userId,
          storedFileId: storedFile.id,
          classification: {
            confidence: classificationResult.confidence,
            type: classificationResult.documentType.toLowerCase(),
            reasoning: classificationResult.reasoning,
            sections: classificationResult.detectedSections
          }
        })

        // Update document status to ANALYZED after processing
        await documentService.updateDocumentStatus(document.id, 'ANALYZED')

        processedDocuments.push({
          id: document.id,
          fileName: document.fileName,
          fileSize: document.fileSize,
          fileType: document.fileType,
          status: 'ANALYZED',
          documentType: document.documentType,
          classification: document.classification
        })

      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError)
        errors.push({
          fileName: file.name,
          error: fileError instanceof Error ? fileError.message : 'Erreur de traitement'
        })
      }
    }

    // If no documents were processed successfully
    if (processedDocuments.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Aucun document n\'a pu être traité',
          details: { errors }
        }
      }, { status: 500 })
    }

    // Generate upload ID
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Prepare response
    const response = {
      success: true,
      data: {
        uploadId,
        documents: processedDocuments
      }
    }

    // Validate response
    const responseValidation = TenderUploadResponseSchema.safeParse(response)
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
    console.error('Upload error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_PROJECT_ID',
          message: 'ID du projet requis'
        }
      }, { status: 400 })
    }

    // Get documents for the project
    const documents = await documentService.getDocumentsByProject(projectId)
    
    // Get project statistics
    const stats = await documentService.getProjectDocumentStats(projectId)

    return NextResponse.json({
      success: true,
      data: {
        documents: documents.map(doc => ({
          id: doc.id,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          fileType: doc.fileType,
          status: doc.status,
          documentType: doc.documentType,
          classification: doc.classification,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        })),
        stats
      }
    })

  } catch (error) {
    console.error('Get documents error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la récupération des documents'
      }
    }, { status: 500 })
  }
}