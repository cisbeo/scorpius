import { DocumentFileType } from '@prisma/client'

export interface ExtractionResult {
  content: string
  metadata: {
    pageCount: number
    wordCount: number
    language: string
    encoding: string
    extractionMethod: 'pdf' | 'docx' | 'doc' | 'ocr'
    confidence: number
    processingTime: number
  }
  sections: Array<{
    title: string
    content: string
    pageStart?: number
    pageEnd?: number
    level: number
  }>
  tables: Array<{
    title?: string
    headers: string[]
    rows: string[][]
    pageNumber?: number
  }>
  images: Array<{
    description?: string
    pageNumber?: number
    ocrText?: string
  }>
  errors?: string[]
}

export interface ExtractionOptions {
  includeImages: boolean
  includeTables: boolean
  performOCR: boolean
  preserveFormatting: boolean
  language: 'fr' | 'en'
  maxPages?: number
}

/**
 * Service for extracting text and structured content from French tender documents
 * Handles PDF, DOC, and DOCX files with French-specific optimizations
 */
export class DCEExtractorService {
  
  private readonly defaultOptions: ExtractionOptions = {
    includeImages: true,
    includeTables: true,
    performOCR: true,
    preserveFormatting: true,
    language: 'fr',
    maxPages: undefined
  }

  /**
   * Extract content from a document file
   */
  async extractContent(
    fileBuffer: Buffer,
    fileName: string,
    fileType: DocumentFileType,
    options: Partial<ExtractionOptions> = {}
  ): Promise<ExtractionResult> {
    const startTime = Date.now()
    const mergedOptions = { ...this.defaultOptions, ...options }

    try {
      let result: ExtractionResult

      switch (fileType) {
        case DocumentFileType.PDF:
          result = await this.extractFromPDF(fileBuffer, mergedOptions)
          break
        case DocumentFileType.DOCX:
          result = await this.extractFromDOCX(fileBuffer, mergedOptions)
          break
        case DocumentFileType.DOC:
          result = await this.extractFromDOC(fileBuffer, mergedOptions)
          break
        default:
          throw new Error(`Type de fichier non supporté: ${fileType}`)
      }

      // Post-process for French tender documents
      result = this.postProcessFrenchContent(result)
      
      // Update metadata
      result.metadata.processingTime = Date.now() - startTime
      result.metadata.wordCount = this.countWords(result.content)
      result.metadata.language = this.detectLanguage(result.content)

      return result
    } catch (error) {
      throw new Error(`Erreur d'extraction pour ${fileName}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  /**
   * Extract content from PDF files
   */
  private async extractFromPDF(buffer: Buffer, options: ExtractionOptions): Promise<ExtractionResult> {
    try {
      // For a real implementation, you would use a library like pdf-parse, pdf2pic + Tesseract
      // This is a simplified mock implementation
      const mockContent = this.generateMockPDFContent()
      
      return {
        content: mockContent,
        metadata: {
          pageCount: 25,
          wordCount: 0, // Will be calculated later
          language: 'fr',
          encoding: 'UTF-8',
          extractionMethod: 'pdf',
          confidence: 0.95,
          processingTime: 0 // Will be calculated later
        },
        sections: this.extractSections(mockContent),
        tables: options.includeTables ? this.extractTables(mockContent) : [],
        images: options.includeImages ? this.extractImages(mockContent) : [],
        errors: []
      }
    } catch (error) {
      throw new Error(`Erreur d'extraction PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  /**
   * Extract content from DOCX files
   */
  private async extractFromDOCX(buffer: Buffer, options: ExtractionOptions): Promise<ExtractionResult> {
    try {
      // For a real implementation, you would use a library like mammoth or docx
      const mockContent = this.generateMockDOCXContent()
      
      return {
        content: mockContent,
        metadata: {
          pageCount: 18,
          wordCount: 0,
          language: 'fr',
          encoding: 'UTF-8',
          extractionMethod: 'docx',
          confidence: 0.98,
          processingTime: 0
        },
        sections: this.extractSections(mockContent),
        tables: options.includeTables ? this.extractTables(mockContent) : [],
        images: options.includeImages ? this.extractImages(mockContent) : [],
        errors: []
      }
    } catch (error) {
      throw new Error(`Erreur d'extraction DOCX: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  /**
   * Extract content from DOC files
   */
  private async extractFromDOC(buffer: Buffer, options: ExtractionOptions): Promise<ExtractionResult> {
    try {
      // For a real implementation, you would use a library like node-msoffice-docx or antiword
      const mockContent = this.generateMockDOCContent()
      
      return {
        content: mockContent,
        metadata: {
          pageCount: 15,
          wordCount: 0,
          language: 'fr',
          encoding: 'UTF-8',
          extractionMethod: 'doc',
          confidence: 0.92,
          processingTime: 0
        },
        sections: this.extractSections(mockContent),
        tables: options.includeTables ? this.extractTables(mockContent) : [],
        images: options.includeImages ? this.extractImages(mockContent) : [],
        errors: []
      }
    } catch (error) {
      throw new Error(`Erreur d'extraction DOC: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  /**
   * Post-process content for French tender documents
   */
  private postProcessFrenchContent(result: ExtractionResult): ExtractionResult {
    // Normalize French text
    result.content = this.normalizeFrenchText(result.content)
    
    // Fix common OCR errors in French
    result.content = this.fixFrenchOCRErrors(result.content)
    
    // Enhance section detection for French tender documents
    result.sections = this.enhanceFrenchSections(result.sections, result.content)
    
    return result
  }

  /**
   * Normalize French text (accents, spacing, etc.)
   */
  private normalizeFrenchText(text: string): string {
    return text
      // Fix spacing around punctuation
      .replace(/\s+([;:!?])/g, ' $1')
      .replace(/([;:!?])\s+/g, '$1 ')
      // Fix quotes
      .replace(/"/g, '"')
      .replace(/"/g, '"')
      // Normalize spaces
      .replace(/\s+/g, ' ')
      // Fix common abbreviations
      .replace(/\bM\.\s*/g, 'M. ')
      .replace(/\bMme\.\s*/g, 'Mme ')
      .replace(/\bDr\.\s*/g, 'Dr ')
      .trim()
  }

  /**
   * Fix common OCR errors in French
   */
  private fixFrenchOCRErrors(text: string): string {
    const corrections = {
      // Common OCR mistakes for French characters
      'a€': 'à',
      'e€': 'é',
      'e`': 'è',
      'eˆ': 'ê',
      'o€': 'ô',
      'u€': 'ù',
      'c¸': 'ç',
      // Common word corrections
      'la€': 'là',
      'a€ƒ': 'être',
      'ma€ƒtre': 'maître',
      'crea€tion': 'création',
      'rea€lisation': 'réalisation',
      // Technical terms
      'specificea€tion': 'spécification',
      'requis': 'requis',
      'obliga€toire': 'obligatoire'
    }

    let correctedText = text
    Object.entries(corrections).forEach(([error, correction]) => {
      correctedText = correctedText.replace(new RegExp(error, 'gi'), correction)
    })

    return correctedText
  }

  /**
   * Extract sections from content
   */
  private extractSections(content: string): Array<{
    title: string
    content: string
    pageStart?: number
    pageEnd?: number
    level: number
  }> {
    const sections: Array<{
      title: string
      content: string
      pageStart?: number
      pageEnd?: number
      level: number
    }> = []

    // Pattern for French tender document sections
    const sectionPatterns = [
      /^(\d+\.?\d*\.?\d*)\s+([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ][^.!?]*)/gm,
      /^([IVXLCDM]+\.?\d*)\s+([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ][^.!?]*)/gm,
      /^([A-Z][.)]\d*)\s+([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ][^.!?]*)/gm
    ]

    const lines = content.split('\n')
    let currentSection = ''
    let currentTitle = ''
    let level = 0

    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      
      // Check if line is a section header
      let isHeader = false
      for (const pattern of sectionPatterns) {
        const match = trimmedLine.match(pattern)
        if (match) {
          // Save previous section
          if (currentTitle && currentSection.trim()) {
            sections.push({
              title: currentTitle,
              content: currentSection.trim(),
              level,
              pageStart: Math.floor(index / 30) + 1 // Rough page estimation
            })
          }
          
          currentTitle = match[2] || match[1]
          currentSection = ''
          level = this.determineSectionLevel(match[1])
          isHeader = true
          break
        }
      }

      if (!isHeader && trimmedLine) {
        currentSection += line + '\n'
      }
    })

    // Add final section
    if (currentTitle && currentSection.trim()) {
      sections.push({
        title: currentTitle,
        content: currentSection.trim(),
        level
      })
    }

    return sections
  }

  /**
   * Enhance section detection for French tender documents
   */
  private enhanceFrenchSections(sections: any[], content: string): any[] {
    // French tender document specific sections
    const frenchTenderSections = [
      'Objet du marché',
      'Consistance des travaux',
      'Conditions particulières',
      'Spécifications techniques',
      'Modalités d\'exécution',
      'Prix et facturation',
      'Délais d\'exécution',
      'Garanties',
      'Pénalités',
      'Réception des travaux'
    ]

    // Look for these specific sections in the content
    frenchTenderSections.forEach(sectionName => {
      const regex = new RegExp(`(${sectionName})\\s*:?\\s*([\\s\\S]*?)(?=\\n\\n|\\n(?:[A-Z][^.]*:)|$)`, 'i')
      const match = content.match(regex)
      
      if (match && match[2] && match[2].trim().length > 50) {
        // Check if this section is already captured
        const existingSection = sections.find(s => 
          s.title.toLowerCase().includes(sectionName.toLowerCase())
        )
        
        if (!existingSection) {
          sections.push({
            title: sectionName,
            content: match[2].trim(),
            level: 1
          })
        }
      }
    })

    return sections.sort((a, b) => a.level - b.level)
  }

  /**
   * Extract tables from content
   */
  private extractTables(content: string): Array<{
    title?: string
    headers: string[]
    rows: string[][]
    pageNumber?: number
  }> {
    const tables: Array<{
      title?: string
      headers: string[]
      rows: string[][]
      pageNumber?: number
    }> = []

    // Pattern for table-like structures
    const tablePattern = /(\|[^|\n]+\|[^|\n]*\|[^|\n]*\n)+/g
    const matches = content.match(tablePattern)

    if (matches) {
      matches.forEach(match => {
        const lines = match.trim().split('\n')
        if (lines.length >= 2) {
          const headers = lines[0].split('|').map(h => h.trim()).filter(h => h)
          const rows = lines.slice(1).map(line => 
            line.split('|').map(cell => cell.trim()).filter(cell => cell)
          ).filter(row => row.length > 0)

          if (headers.length > 0 && rows.length > 0) {
            tables.push({
              headers,
              rows,
              title: `Tableau ${tables.length + 1}`
            })
          }
        }
      })
    }

    return tables
  }

  /**
   * Extract images and perform OCR if needed
   */
  private extractImages(content: string): Array<{
    description?: string
    pageNumber?: number
    ocrText?: string
  }> {
    // In a real implementation, this would extract actual images
    // and perform OCR using Tesseract or similar
    return [
      {
        description: 'Schema technique détecté',
        pageNumber: 5,
        ocrText: 'Schéma d\'architecture réseau avec composants principaux'
      },
      {
        description: 'Diagramme de flux détecté',
        pageNumber: 12,
        ocrText: 'Processus de validation et d\'approbation'
      }
    ]
  }

  /**
   * Determine section level based on numbering
   */
  private determineSectionLevel(numbering: string): number {
    if (/^\d+$/.test(numbering)) return 1
    if (/^\d+\.\d+$/.test(numbering)) return 2
    if (/^\d+\.\d+\.\d+$/.test(numbering)) return 3
    if (/^[IVXLCDM]+$/.test(numbering)) return 1
    if (/^[A-Z]$/.test(numbering)) return 2
    return 1
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * Detect language of the content
   */
  private detectLanguage(text: string): string {
    const frenchWords = ['le', 'la', 'les', 'de', 'des', 'du', 'et', 'est', 'pour', 'avec', 'dans', 'sur', 'par', 'que', 'qui']
    const words = text.toLowerCase().split(/\s+/).slice(0, 100)
    const frenchCount = words.filter(word => frenchWords.includes(word)).length
    
    return frenchCount > words.length * 0.15 ? 'fr' : 'unknown'
  }

  // Mock content generators for testing
  private generateMockPDFContent(): string {
    return `
CAHIER DES CLAUSES TECHNIQUES PARTICULIÈRES

1. OBJET DU MARCHÉ

Le présent marché a pour objet la modernisation complète de l'infrastructure informatique de la collectivité, incluant la migration vers une architecture cloud hybride sécurisée.

2. SPÉCIFICATIONS TECHNIQUES

2.1 Exigences de sécurité
- Certification ISO 27001 obligatoire
- Conformité RGPD requise
- Chiffrement AES-256 minimum
- Authentification multi-facteurs

2.2 Performance requise
- Disponibilité 99.9% garantie
- Temps de réponse < 200ms
- Capacité de montée en charge

3. MODALITÉS D'EXÉCUTION

Les travaux devront être réalisés selon les meilleures pratiques du marché et en respectant les contraintes opérationnelles de la collectivité.

4. GARANTIES

Une garantie de 24 mois est requise sur l'ensemble des prestations.
    `.trim()
  }

  private generateMockDOCXContent(): string {
    return `
CAHIER DES CLAUSES PARTICULIÈRES

Article 1 - Objet du marché

Le présent marché concerne la fourniture et l'installation d'une solution de cybersécurité avancée.

Article 2 - Conditions d'exécution

2.1 Délais
- Phase 1: 3 mois après notification
- Phase 2: 6 mois après phase 1
- Formation: 1 mois après installation

2.2 Pénalités
En cas de retard, des pénalités de 0.1% par jour de retard seront appliquées.

Article 3 - Réception

La réception provisoire aura lieu après tests complets et formation des utilisateurs.
    `.trim()
  }

  private generateMockDOCContent(): string {
    return `
BORDEREAU DES PRIX UNITAIRES

Désignation | Unité | Prix unitaire HT
---|---|---
Audit de sécurité | Forfait | 15 000 €
Installation serveur | Unité | 5 000 €
Formation utilisateur | Jour | 800 €
Maintenance annuelle | Forfait | 12 000 €

Total estimatif: 47 600 € HT
    `.trim()
  }

  /**
   * Validate extraction result
   */
  validateExtractionResult(result: ExtractionResult): { isValid: boolean, errors: string[] } {
    const errors: string[] = []

    if (!result.content || result.content.length < 100) {
      errors.push('Contenu extrait insuffisant (moins de 100 caractères)')
    }

    if (result.metadata.confidence < 0.5) {
      errors.push('Niveau de confiance trop faible pour l\'extraction')
    }

    if (result.metadata.language !== 'fr' && result.metadata.language !== 'unknown') {
      errors.push('Document non reconnu comme étant en français')
    }

    if (result.sections.length === 0) {
      errors.push('Aucune section structurée détectée')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get extraction statistics
   */
  getExtractionStats(result: ExtractionResult) {
    return {
      contentLength: result.content.length,
      wordCount: result.metadata.wordCount,
      pageCount: result.metadata.pageCount,
      sectionCount: result.sections.length,
      tableCount: result.tables.length,
      imageCount: result.images.length,
      confidence: result.metadata.confidence,
      processingTimeMs: result.metadata.processingTime,
      language: result.metadata.language
    }
  }
}