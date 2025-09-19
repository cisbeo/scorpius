import { LlamaParseService, ParseOptions } from '@/lib/llamaparse-service'
import { FileStorageService, StoredFile } from './file-storage.service'
import { ExtractionResult, ExtractionOptions } from './dce-extractor.service'
import { DocumentFileType } from '@prisma/client'

/**
 * Service for extracting content from documents using LlamaCloud
 * Integrates file storage and LlamaParse for real document processing
 */
export class LlamaCloudExtractorService {
  private readonly llamaParseService: LlamaParseService
  private readonly fileStorageService: FileStorageService

  constructor() {
    this.llamaParseService = new LlamaParseService()
    this.fileStorageService = new FileStorageService()
  }

  /**
   * Extract content from a file buffer using LlamaCloud
   */
  async extractFromBuffer(
    fileBuffer: Buffer,
    fileName: string,
    fileType: DocumentFileType,
    options: Partial<ExtractionOptions> = {}
  ): Promise<ExtractionResult> {
    const startTime = Date.now()
    
    try {
      console.log(`Starting LlamaCloud extraction for: ${fileName}`)

      // Store file temporarily for LlamaCloud processing
      const mimeType = this.getMimeType(fileType)
      const storedFile = await this.fileStorageService.storeFile(fileBuffer, fileName, mimeType)

      // Convert buffer to File object for LlamaCloud
      const file = this.fileStorageService.bufferToFile(fileBuffer, fileName, mimeType)

      // Configure LlamaCloud parsing options
      const parseOptions: ParseOptions = {
        premiumMode: options.performOCR || false,
        complexTables: options.includeTables || false,
        fastMode: false // Use balanced mode for best quality
      }

      // Parse document with LlamaCloud
      const parseResult = await this.llamaParseService.parseFile(file, parseOptions)
      
      if (parseResult.status !== 'success' || !parseResult.content) {
        throw new Error(`LlamaCloud parsing failed: ${parseResult.status || 'Unknown error'}`)
      }

      console.log(`LlamaCloud extraction successful: ${parseResult.content.length} characters extracted`)

      // Convert LlamaCloud result to our ExtractionResult format
      const extractionResult: ExtractionResult = {
        content: parseResult.content,
        metadata: {
          pageCount: this.estimatePageCount(parseResult.content),
          wordCount: this.countWords(parseResult.content),
          language: 'fr', // Assume French for DCE documents
          encoding: 'UTF-8',
          extractionMethod: 'pdf',
          confidence: 0.95, // LlamaCloud is high-confidence
          processingTime: Date.now() - startTime
        },
        sections: this.extractSections(parseResult.content),
        tables: options.includeTables ? this.extractTables(parseResult.content) : [],
        images: [], // LlamaCloud markdown doesn't include images yet
        errors: []
      }

      // Cleanup temporary file
      await this.fileStorageService.deleteFile(storedFile.id)

      console.log(`Extraction completed in ${extractionResult.metadata.processingTime}ms`)
      return extractionResult

    } catch (error) {
      console.error(`LlamaCloud extraction failed for ${fileName}:`, error)
      throw new Error(`Erreur d'extraction LlamaCloud: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  /**
   * Extract content from a stored file by ID
   */
  async extractFromStoredFile(
    fileId: string,
    options: Partial<ExtractionOptions> = {}
  ): Promise<ExtractionResult> {
    try {
      // Get file metadata
      const metadata = await this.fileStorageService.getFileMetadata(fileId)
      if (!metadata) {
        throw new Error(`Fichier non trouvé: ${fileId}`)
      }

      // Get file buffer
      const fileBuffer = await this.fileStorageService.getFileBuffer(fileId)

      // Determine file type from extension
      const fileType = this.getFileTypeFromExtension(metadata.originalName)

      // Extract content
      return await this.extractFromBuffer(fileBuffer, metadata.originalName, fileType, options)

    } catch (error) {
      console.error(`Failed to extract from stored file ${fileId}:`, error)
      throw new Error(`Erreur d'extraction du fichier stocké: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  /**
   * Get MIME type from file type
   */
  private getMimeType(fileType: DocumentFileType): string {
    switch (fileType) {
      case DocumentFileType.PDF:
        return 'application/pdf'
      case DocumentFileType.DOCX:
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      case DocumentFileType.DOC:
        return 'application/msword'
      default:
        return 'application/octet-stream'
    }
  }

  /**
   * Get file type from extension
   */
  private getFileTypeFromExtension(filename: string): DocumentFileType {
    const extension = filename.toLowerCase().split('.').pop()
    switch (extension) {
      case 'pdf':
        return DocumentFileType.PDF
      case 'docx':
        return DocumentFileType.DOCX
      case 'doc':
        return DocumentFileType.DOC
      default:
        return DocumentFileType.PDF // Default to PDF
    }
  }

  /**
   * Estimate page count from content length
   */
  private estimatePageCount(content: string): number {
    // Rough estimate: ~3000 characters per page
    return Math.max(1, Math.ceil(content.length / 3000))
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * Extract sections from markdown content
   */
  private extractSections(content: string): ExtractionResult['sections'] {
    const sections: ExtractionResult['sections'] = []
    const lines = content.split('\n')
    let currentSection = { title: '', content: '', level: 0 }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Detect markdown headers
      if (line.startsWith('#')) {
        // Save previous section if it has content
        if (currentSection.title && currentSection.content.trim()) {
          sections.push({ ...currentSection })
        }

        // Start new section
        const level = (line.match(/^#+/) || [''])[0].length
        const title = line.replace(/^#+\s*/, '').trim()
        
        currentSection = {
          title,
          content: '',
          level
        }
      } else if (currentSection.title) {
        // Add content to current section
        currentSection.content += line + '\n'
      }
    }

    // Add final section
    if (currentSection.title && currentSection.content.trim()) {
      sections.push(currentSection)
    }

    return sections
  }

  /**
   * Extract tables from markdown content
   */
  private extractTables(content: string): ExtractionResult['tables'] {
    const tables: ExtractionResult['tables'] = []
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Detect markdown table
      if (line.includes('|') && line.split('|').length > 2) {
        const rows: string[][] = []
        let currentLineIndex = i

        // Extract table rows
        while (currentLineIndex < lines.length) {
          const tableLine = lines[currentLineIndex].trim()
          
          if (!tableLine.includes('|')) break
          if (tableLine.includes('---')) {
            currentLineIndex++
            continue
          }

          const cells = tableLine.split('|')
            .map(cell => cell.trim())
            .filter(cell => cell.length > 0)

          if (cells.length > 0) {
            rows.push(cells)
          }

          currentLineIndex++
        }

        if (rows.length > 0) {
          tables.push({
            headers: rows[0] || [],
            rows: rows.slice(1)
          })
        }

        i = currentLineIndex - 1 // Skip processed lines
      }
    }

    return tables
  }
}