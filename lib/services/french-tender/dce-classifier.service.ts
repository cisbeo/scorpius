import { DocumentType } from '@prisma/client'
import { OpenAI } from 'openai'
import { env } from '@/lib/env'

export interface ClassificationResult {
  documentType: DocumentType
  confidence: number
  reasoning: string
  detectedSections: string[]
  metadata: {
    language: string
    pageEstimate: number
    structureScore: number
    contentDensity: number
  }
}

export interface ClassificationFeatures {
  hasTableOfContents: boolean
  hasPriceSchedule: boolean
  hasLegalClauses: boolean
  hasTechnicalSpecs: boolean
  hasArticleNumbers: boolean
  hasPerformanceRequirements: boolean
  sectionTitles: string[]
  keyTermFrequency: Record<string, number>
}

/**
 * Service for classifying French tender documents (DCE)
 * Specialized in identifying CCTP, CCP, BPU, RC document types
 * Uses AI-powered classification with fallback to heuristic analysis
 */
export class DCEClassifierService {
  private readonly openai: OpenAI
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY
    })
  }
  
  private readonly documentPatterns = {
    CCTP: {
      keywords: [
        'cahier des clauses techniques particulières',
        'cctp',
        'spécifications techniques',
        'exigences techniques',
        'caractéristiques techniques',
        'performances requises',
        'contraintes techniques',
        'méthodes d\'exécution',
        'matériaux et fournitures',
        'modalités d\'exécution'
      ],
      sectionIndicators: [
        'objet du marché',
        'consistance des travaux',
        'contraintes particulières',
        'matériaux',
        'modes opératoires',
        'contrôles et essais',
        'garanties techniques'
      ],
      structureWeight: 0.3,
      contentWeight: 0.7
    },

    CCP: {
      keywords: [
        'cahier des clauses particulières',
        'ccp',
        'clauses administratives',
        'conditions particulières',
        'dispositions contractuelles',
        'modalités contractuelles',
        'conditions d\'exécution',
        'pénalités',
        'délais d\'exécution',
        'réception des travaux'
      ],
      sectionIndicators: [
        'objet du marché',
        'durée du marché',
        'prix et règlement',
        'délais d\'exécution',
        'pénalités',
        'garanties',
        'réception',
        'sous-traitance'
      ],
      structureWeight: 0.4,
      contentWeight: 0.6
    },

    BPU: {
      keywords: [
        'bordereau des prix unitaires',
        'bpu',
        'prix unitaires',
        'décomposition des prix',
        'tarifs',
        'barème de prix',
        'coûts unitaires',
        'prix de base',
        'unité de mesure',
        'quantités estimatives'
      ],
      sectionIndicators: [
        'désignation des prestations',
        'unité',
        'prix unitaire',
        'montant',
        'références',
        'forfait',
        'prix global'
      ],
      structureWeight: 0.6,
      contentWeight: 0.4
    },

    RC: {
      keywords: [
        'règlement de consultation',
        'rc',
        'modalités de candidature',
        'constitution des offres',
        'critères de sélection',
        'procédure de consultation',
        'dossier de candidature',
        'critères d\'attribution',
        'calendrier de consultation',
        'remise des offres'
      ],
      sectionIndicators: [
        'objet de la consultation',
        'candidatures',
        'constitution du dossier',
        'critères de jugement',
        'calendrier',
        'renseignements complémentaires',
        'modalités de remise'
      ],
      structureWeight: 0.4,
      contentWeight: 0.6
    }
  }

  /**
   * Classify a document based on its content using AI-powered analysis
   */
  async classifyDocument(
    fileName: string,
    content: string,
    fileSize: number
  ): Promise<ClassificationResult> {
    try {
      // First attempt AI classification
      const aiResult = await this.classifyWithAI(fileName, content, fileSize)
      if (aiResult.confidence >= 0.7) {
        return aiResult
      }

      // Fallback to heuristic classification if AI confidence is low
      console.log(`AI classification confidence too low (${aiResult.confidence}), falling back to heuristic analysis`)
      return await this.classifyWithHeuristics(fileName, content, fileSize)

    } catch (error) {
      console.error('AI classification failed, using heuristic fallback:', error)
      return await this.classifyWithHeuristics(fileName, content, fileSize)
    }
  }

  /**
   * AI-powered document classification using OpenAI
   */
  private async classifyWithAI(
    fileName: string,
    content: string,
    fileSize: number
  ): Promise<ClassificationResult> {
    // Prepare document content (truncate if too long for API)
    const maxContentLength = 8000
    const documentContent = content.length > maxContentLength 
      ? content.substring(0, maxContentLength) + '...' 
      : content

    const systemPrompt = `Tu es un expert en analyse de documents de marchés publics français. Tu dois classifier des documents DCE (Dossier de Consultation des Entreprises).

Types de documents à identifier :
- CCTP (Cahier des Clauses Techniques Particulières) : spécifications techniques détaillées, méthodes d'exécution, matériaux, performances requises
- CCP (Cahier des Clauses Particulières) : clauses administratives et contractuelles, conditions d'exécution, pénalités, délais
- BPU (Bordereau des Prix Unitaires) : prix unitaires, décomposition des coûts, tarifs, quantités estimatives
- RC (Règlement de Consultation) : modalités de candidature, critères de sélection, procédure de consultation
- OTHER : si le document ne correspond à aucun type DCE standard

Analyse le document et retourne un JSON avec la structure exacte suivante :
{
  "documentType": "CCTP|CCP|BPU|RC|OTHER",
  "confidence": 0.95,
  "reasoning": "Explication détaillée de la classification en français",
  "detectedSections": ["section1", "section2"],
  "technicalKeywords": ["mot-clé1", "mot-clé2"],
  "administrativeKeywords": ["mot-clé3", "mot-clé4"],
  "priceIndicators": ["indicateur1", "indicateur2"]
}`

    const userPrompt = `Nom du fichier : ${fileName}
Taille du fichier : ${fileSize} octets

Contenu du document :
${documentContent}

Analyse ce document et fournis la classification JSON.`

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 1000
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('Pas de réponse de l\'IA pour la classification')
    }

    // Parse AI response (remove markdown code blocks if present)
    let cleanResponse = response.trim()
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    }
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    const aiAnalysis = JSON.parse(cleanResponse)
    
    // Extract additional features for metadata
    const features = this.extractFeatures(content)

    return {
      documentType: aiAnalysis.documentType as DocumentType,
      confidence: aiAnalysis.confidence,
      reasoning: aiAnalysis.reasoning,
      detectedSections: aiAnalysis.detectedSections || features.sectionTitles,
      metadata: {
        language: this.detectLanguage(content),
        pageEstimate: this.estimatePageCount(content, fileSize),
        structureScore: this.calculateStructureScore(features),
        contentDensity: this.calculateContentDensity(content)
      }
    }
  }

  /**
   * Heuristic classification fallback method
   */
  private async classifyWithHeuristics(
    fileName: string,
    content: string,
    fileSize: number
  ): Promise<ClassificationResult> {
    // Extract features from the document
    const features = this.extractFeatures(content)
    
    // Calculate scores for each document type
    const scores = this.calculateTypeScores(content, features)
    
    // Determine the best match
    const bestMatch = this.getBestMatch(scores)
    
    // Generate detailed result
    return {
      documentType: bestMatch.type,
      confidence: bestMatch.confidence,
      reasoning: this.generateReasoning(bestMatch.type, features, scores),
      detectedSections: features.sectionTitles,
      metadata: {
        language: this.detectLanguage(content),
        pageEstimate: this.estimatePageCount(content, fileSize),
        structureScore: this.calculateStructureScore(features),
        contentDensity: this.calculateContentDensity(content)
      }
    }
  }

  /**
   * Extract classification features from document content
   */
  private extractFeatures(content: string): ClassificationFeatures {
    const normalizedContent = content.toLowerCase().normalize('NFD')
    
    return {
      hasTableOfContents: this.detectTableOfContents(normalizedContent),
      hasPriceSchedule: this.detectPriceSchedule(normalizedContent),
      hasLegalClauses: this.detectLegalClauses(normalizedContent),
      hasTechnicalSpecs: this.detectTechnicalSpecs(normalizedContent),
      hasArticleNumbers: this.detectArticleNumbers(normalizedContent),
      hasPerformanceRequirements: this.detectPerformanceRequirements(normalizedContent),
      sectionTitles: this.extractSectionTitles(normalizedContent),
      keyTermFrequency: this.calculateTermFrequency(normalizedContent)
    }
  }

  /**
   * Calculate classification scores for each document type
   */
  private calculateTypeScores(content: string, features: ClassificationFeatures): Record<string, number> {
    const scores: Record<string, number> = {}
    const normalizedContent = content.toLowerCase().normalize('NFD')

    Object.entries(this.documentPatterns).forEach(([type, pattern]) => {
      let score = 0

      // Keyword matching score
      const keywordMatches = pattern.keywords.filter(keyword => 
        normalizedContent.includes(keyword.toLowerCase())
      ).length
      const keywordScore = (keywordMatches / pattern.keywords.length) * pattern.contentWeight

      // Section structure score
      const sectionMatches = pattern.sectionIndicators.filter(section =>
        normalizedContent.includes(section.toLowerCase()) ||
        features.sectionTitles.some(title => 
          title.toLowerCase().includes(section.toLowerCase())
        )
      ).length
      const structureScore = (sectionMatches / pattern.sectionIndicators.length) * pattern.structureWeight

      // Type-specific feature scoring
      const featureScore = this.calculateFeatureScore(type as DocumentType, features) * 0.2

      score = keywordScore + structureScore + featureScore

      scores[type] = Math.min(1.0, score)
    })

    return scores
  }

  /**
   * Calculate feature-specific scores for each document type
   */
  private calculateFeatureScore(type: DocumentType, features: ClassificationFeatures): number {
    switch (type) {
      case DocumentType.CCTP:
        return (
          (features.hasTechnicalSpecs ? 0.4 : 0) +
          (features.hasPerformanceRequirements ? 0.3 : 0) +
          (features.hasArticleNumbers ? 0.2 : 0) +
          (features.hasTableOfContents ? 0.1 : 0)
        )

      case DocumentType.CCP:
        return (
          (features.hasLegalClauses ? 0.5 : 0) +
          (features.hasArticleNumbers ? 0.3 : 0) +
          (features.hasTableOfContents ? 0.2 : 0)
        )

      case DocumentType.BPU:
        return (
          (features.hasPriceSchedule ? 0.6 : 0) +
          (this.hasNumericData(features.keyTermFrequency) ? 0.4 : 0)
        )

      case DocumentType.RC:
        return (
          (features.hasLegalClauses ? 0.3 : 0) +
          (features.hasTableOfContents ? 0.2 : 0) +
          (this.hasConsultationTerms(features.keyTermFrequency) ? 0.5 : 0)
        )

      default:
        return 0
    }
  }

  /**
   * Get the best classification match
   */
  private getBestMatch(scores: Record<string, number>): { type: DocumentType, confidence: number } {
    const sortedScores = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)

    const bestType = sortedScores[0][0] as DocumentType
    const bestScore = sortedScores[0][1]
    const secondBestScore = sortedScores[1]?.[1] || 0

    // Adjust confidence based on score separation
    const separation = bestScore - secondBestScore
    let confidence = bestScore

    // Boost confidence if there's clear separation
    if (separation > 0.3) {
      confidence = Math.min(1.0, confidence + 0.1)
    }

    // Reduce confidence if scores are too close
    if (separation < 0.1) {
      confidence = Math.max(0.5, confidence - 0.2)
    }

    // Minimum confidence threshold
    if (confidence < 0.3) {
      return { type: DocumentType.OTHER, confidence: 0.3 }
    }

    return { type: bestType, confidence }
  }

  /**
   * Generate human-readable reasoning for the classification
   */
  private generateReasoning(
    type: DocumentType, 
    features: ClassificationFeatures, 
    scores: Record<string, number>
  ): string {
    const typeNames = {
      CCTP: 'Cahier des Clauses Techniques Particulières',
      CCP: 'Cahier des Clauses Particulières',
      BPU: 'Bordereau des Prix Unitaires',
      RC: 'Règlement de Consultation',
      OTHER: 'Document non classifié'
    }

    const reasons: string[] = []
    const pattern = this.documentPatterns[type as keyof typeof this.documentPatterns]

    if (pattern) {
      reasons.push(`Document identifié comme ${typeNames[type]} avec un score de ${(scores[type] * 100).toFixed(1)}%`)
      
      // Add specific feature reasons
      switch (type) {
        case DocumentType.CCTP:
          if (features.hasTechnicalSpecs) reasons.push("Présence de spécifications techniques détaillées")
          if (features.hasPerformanceRequirements) reasons.push("Exigences de performance identifiées")
          break
        
        case DocumentType.BPU:
          if (features.hasPriceSchedule) reasons.push("Structure de prix unitaires détectée")
          break
        
        case DocumentType.CCP:
          if (features.hasLegalClauses) reasons.push("Clauses contractuelles et administratives présentes")
          break
        
        case DocumentType.RC:
          if (features.hasLegalClauses) reasons.push("Procédures de consultation identifiées")
          break
      }

      if (features.sectionTitles.length > 0) {
        reasons.push(`${features.sectionTitles.length} sections structurées détectées`)
      }
    }

    return reasons.join('. ')
  }

  // Feature detection methods
  private detectTableOfContents(content: string): boolean {
    const tocPatterns = [
      'table des matières',
      'sommaire',
      'index',
      'table des matires' // Without accents
    ]
    return tocPatterns.some(pattern => content.includes(pattern))
  }

  private detectPriceSchedule(content: string): boolean {
    const pricePatterns = [
      'prix unitaire',
      'cout unitaire',
      'tarif',
      'montant',
      '€',
      'euro',
      'ht',
      'ttc'
    ]
    const priceCount = pricePatterns.filter(pattern => content.includes(pattern)).length
    return priceCount >= 3
  }

  private detectLegalClauses(content: string): boolean {
    const legalPatterns = [
      'article',
      'clause',
      'alinéa',
      'paragraphe',
      'dispositions',
      'conditions',
      'obligations',
      'responsabilité'
    ]
    const legalCount = legalPatterns.filter(pattern => content.includes(pattern)).length
    return legalCount >= 4
  }

  private detectTechnicalSpecs(content: string): boolean {
    const techPatterns = [
      'spécification',
      'caractéristique',
      'performance',
      'norme',
      'standard',
      'technique',
      'matériau',
      'équipement'
    ]
    const techCount = techPatterns.filter(pattern => content.includes(pattern)).length
    return techCount >= 3
  }

  private detectArticleNumbers(content: string): boolean {
    const articleRegex = /article\s+\d+|art\.\s*\d+|\d+\.\d+/gi
    const matches = content.match(articleRegex)
    return (matches?.length || 0) >= 3
  }

  private detectPerformanceRequirements(content: string): boolean {
    const perfPatterns = [
      'performance',
      'rendement',
      'efficacité',
      'capacité',
      'débit',
      'vitesse',
      'puissance',
      'résistance'
    ]
    const perfCount = perfPatterns.filter(pattern => content.includes(pattern)).length
    return perfCount >= 2
  }

  private extractSectionTitles(content: string): string[] {
    const titleRegex = /^[\d\s]*[A-Z][^.!?]*$/gm
    const matches = content.match(titleRegex) || []
    
    return matches
      .filter(title => title.length > 10 && title.length < 100)
      .slice(0, 20) // Limit to first 20 matches
      .map(title => title.trim())
  }

  private calculateTermFrequency(content: string): Record<string, number> {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)

    const frequency: Record<string, number> = {}
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1
    })

    // Return only top 50 most frequent terms
    return Object.fromEntries(
      Object.entries(frequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 50)
    )
  }

  private detectLanguage(content: string): string {
    const frenchWords = ['le', 'la', 'les', 'de', 'des', 'du', 'et', 'est', 'pour', 'avec', 'dans', 'sur', 'par']
    const words = content.toLowerCase().split(/\s+/).slice(0, 100)
    const frenchCount = words.filter(word => frenchWords.includes(word)).length
    
    return frenchCount > words.length * 0.1 ? 'fr' : 'unknown'
  }

  private estimatePageCount(content: string, fileSize: number): number {
    const wordsPerPage = 500
    const wordCount = content.split(/\s+/).length
    const pagesByWords = Math.ceil(wordCount / wordsPerPage)
    const pagesBySize = Math.ceil(fileSize / 100000) // 100KB per page estimate
    
    // Use average of both estimates
    return Math.max(1, Math.round((pagesByWords + pagesBySize) / 2))
  }

  private calculateStructureScore(features: ClassificationFeatures): number {
    let score = 0
    
    if (features.hasTableOfContents) score += 0.2
    if (features.hasArticleNumbers) score += 0.3
    if (features.sectionTitles.length > 5) score += 0.3
    if (features.sectionTitles.length > 10) score += 0.2
    
    return Math.min(1.0, score)
  }

  private calculateContentDensity(content: string): number {
    const wordCount = content.split(/\s+/).length
    const charCount = content.length
    
    if (charCount === 0) return 0
    
    const avgWordLength = charCount / wordCount
    const density = Math.min(1.0, avgWordLength / 10) // Normalize to 0-1
    
    return density
  }

  private hasNumericData(termFreq: Record<string, number>): boolean {
    const numericTerms = Object.keys(termFreq).filter(term => 
      /\d/.test(term) || ['euro', 'prix', 'cout', 'montant', 'tarif'].some(p => term.includes(p))
    )
    return numericTerms.length >= 5
  }

  private hasConsultationTerms(termFreq: Record<string, number>): boolean {
    const consultationTerms = ['candidature', 'offre', 'consultation', 'critère', 'sélection', 'attribution']
    const foundTerms = consultationTerms.filter(term => 
      Object.keys(termFreq).some(key => key.includes(term))
    )
    return foundTerms.length >= 3
  }

  /**
   * Batch classify multiple documents
   */
  async batchClassify(
    documents: Array<{ fileName: string, content: string, fileSize: number }>
  ): Promise<ClassificationResult[]> {
    const results = await Promise.all(
      documents.map(doc => this.classifyDocument(doc.fileName, doc.content, doc.fileSize))
    )
    
    return results
  }

  /**
   * Enhanced classification with AI-generated document insights
   */
  async classifyWithInsights(
    fileName: string,
    content: string,
    fileSize: number
  ): Promise<ClassificationResult & { insights: string[], qualityScore: number }> {
    const baseResult = await this.classifyDocument(fileName, content, fileSize)

    try {
      // Generate additional insights using AI
      const insights = await this.generateDocumentInsights(fileName, content, baseResult.documentType)
      const qualityScore = await this.assessDocumentQuality(content, baseResult.documentType)

      return {
        ...baseResult,
        insights,
        qualityScore
      }
    } catch (error) {
      console.error('Failed to generate insights:', error)
      return {
        ...baseResult,
        insights: [],
        qualityScore: 0.5
      }
    }
  }

  /**
   * Generate AI-powered document insights
   */
  private async generateDocumentInsights(
    fileName: string,
    content: string,
    documentType: DocumentType
  ): Promise<string[]> {
    const maxContentLength = 6000
    const documentContent = content.length > maxContentLength 
      ? content.substring(0, maxContentLength) + '...' 
      : content

    const systemPrompt = `Tu es un expert consultant en marchés publics français. Analyse ce document ${documentType} et fournis des insights pratiques pour aider une entreprise à mieux comprendre les exigences.

Retourne un JSON avec un tableau d'insights de 3-5 observations importantes :
{
  "insights": [
    "Insight 1 sur les exigences techniques spécifiques",
    "Insight 2 sur les contraintes administratives",
    "Insight 3 sur les opportunités ou risques identifiés"
  ]
}`

    const userPrompt = `Document : ${fileName}
Type : ${documentType}

Contenu :
${documentContent}

Fournis des insights pratiques en JSON.`

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 500
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      return []
    }

    const analysis = JSON.parse(response)
    return analysis.insights || []
  }

  /**
   * Assess document quality and completeness
   */
  private async assessDocumentQuality(content: string, documentType: DocumentType): Promise<number> {
    const features = this.extractFeatures(content)
    let qualityScore = 0.5

    // Base quality assessment
    if (features.hasTableOfContents) qualityScore += 0.1
    if (features.hasArticleNumbers) qualityScore += 0.1
    if (features.sectionTitles.length > 5) qualityScore += 0.1
    if (features.sectionTitles.length > 10) qualityScore += 0.1

    // Document type specific quality checks
    switch (documentType) {
      case DocumentType.CCTP:
        if (features.hasTechnicalSpecs) qualityScore += 0.1
        if (features.hasPerformanceRequirements) qualityScore += 0.1
        break
      case DocumentType.BPU:
        if (features.hasPriceSchedule) qualityScore += 0.2
        break
      case DocumentType.CCP:
      case DocumentType.RC:
        if (features.hasLegalClauses) qualityScore += 0.1
        break
    }

    // Content density and structure
    const contentDensity = this.calculateContentDensity(content)
    qualityScore += contentDensity * 0.2

    return Math.min(1.0, qualityScore)
  }

  /**
   * Get classification confidence threshold recommendations
   */
  getConfidenceThresholds(): Record<string, number> {
    return {
      high: 0.8,    // Very confident classification
      medium: 0.6,  // Moderately confident
      low: 0.4,     // Low confidence, manual review recommended
      reject: 0.3   // Below this, classify as OTHER
    }
  }
}