import { AnalysisResult } from './ai-analyzer.service'
import { ExtractionResult } from './dce-extractor.service'

export interface ComplexityFactors {
  documentComplexity: number
  technicalComplexity: number
  contractualComplexity: number
  timeComplexity: number
  competitiveComplexity: number
  riskComplexity: number
}

export interface ComplexityScoreResult {
  overallScore: number
  factors: ComplexityFactors
  reasoning: string
  confidenceLevel: number
  recommendations: string[]
}

/**
 * Service for calculating complexity scores (1-10) for French tender documents
 * Uses multiple factors to determine overall project complexity
 */
export class ComplexityScorerService {

  private readonly factorWeights = {
    documentComplexity: 0.15,    // 15% - Based on document structure and content
    technicalComplexity: 0.30,   // 30% - Technical requirements complexity
    contractualComplexity: 0.20, // 20% - Contract terms and conditions
    timeComplexity: 0.15,        // 15% - Timeline and milestone complexity
    competitiveComplexity: 0.10, // 10% - Market competition factors
    riskComplexity: 0.10         // 10% - Risk factors
  }

  /**
   * Calculate overall complexity score for a tender analysis
   */
  calculateComplexityScore(
    analysisResult: AnalysisResult,
    extractionResults: ExtractionResult[],
    documentCount: number
  ): ComplexityScoreResult {
    
    const factors = this.calculateComplexityFactors(analysisResult, extractionResults, documentCount)
    const overallScore = this.calculateWeightedScore(factors)
    const reasoning = this.generateComplexityReasoning(factors, overallScore)
    const confidenceLevel = this.calculateConfidenceLevel(factors, extractionResults)
    const recommendations = this.generateRecommendations(factors, overallScore)

    return {
      overallScore: Math.round(overallScore),
      factors,
      reasoning,
      confidenceLevel,
      recommendations
    }
  }

  /**
   * Calculate individual complexity factors
   */
  private calculateComplexityFactors(
    analysisResult: AnalysisResult,
    extractionResults: ExtractionResult[],
    documentCount: number
  ): ComplexityFactors {
    
    return {
      documentComplexity: this.calculateDocumentComplexity(extractionResults, documentCount),
      technicalComplexity: this.calculateTechnicalComplexity(analysisResult),
      contractualComplexity: this.calculateContractualComplexity(analysisResult),
      timeComplexity: this.calculateTimeComplexity(analysisResult),
      competitiveComplexity: this.calculateCompetitiveComplexity(analysisResult),
      riskComplexity: this.calculateRiskComplexity(analysisResult)
    }
  }

  /**
   * Calculate document complexity based on structure and content
   */
  private calculateDocumentComplexity(extractionResults: ExtractionResult[], documentCount: number): number {
    let score = 0

    // Base score from document count
    if (documentCount >= 5) score += 3
    else if (documentCount >= 3) score += 2
    else score += 1

    // Analyze document structure complexity
    extractionResults.forEach(result => {
      // Page count factor
      if (result.metadata.pageCount > 50) score += 1.5
      else if (result.metadata.pageCount > 20) score += 1
      else if (result.metadata.pageCount > 10) score += 0.5

      // Section complexity
      if (result.sections.length > 15) score += 1
      else if (result.sections.length > 8) score += 0.5

      // Table complexity
      if (result.tables.length > 10) score += 1
      else if (result.tables.length > 5) score += 0.5

      // Content density
      if (result.metadata.contentDensity > 0.8) score += 0.5
    })

    return Math.min(10, score)
  }

  /**
   * Calculate technical complexity
   */
  private calculateTechnicalComplexity(analysisResult: AnalysisResult): number {
    let score = 0

    const techReqs = analysisResult.technicalRequirements
    
    // Base score from requirement count
    if (techReqs.length > 20) score += 3
    else if (techReqs.length > 10) score += 2
    else if (techReqs.length > 5) score += 1

    // Mandatory requirements weight
    const mandatoryCount = techReqs.filter(req => req.mandatory).length
    if (mandatoryCount > 15) score += 2
    else if (mandatoryCount > 8) score += 1

    // High priority requirements
    const highPriorityCount = techReqs.filter(req => req.priority === 'HIGH').length
    if (highPriorityCount > 8) score += 2
    else if (highPriorityCount > 4) score += 1

    // Technical categories diversity
    const categories = new Set(techReqs.map(req => req.category))
    if (categories.size > 8) score += 1.5
    else if (categories.size > 5) score += 1

    // Sector-specific complexity
    switch (analysisResult.marketScope.sector) {
      case 'CYBERSECURITY':
        score += 2
        break
      case 'INFRASTRUCTURE':
        score += 1.5
        break
      case 'MIXED':
        score += 1
        break
      case 'DEVELOPMENT':
        score += 0.5
        break
    }

    // Contract value impact
    if (analysisResult.marketScope.estimatedValue) {
      if (analysisResult.marketScope.estimatedValue > 1000000) score += 1.5
      else if (analysisResult.marketScope.estimatedValue > 500000) score += 1
      else if (analysisResult.marketScope.estimatedValue > 100000) score += 0.5
    }

    return Math.min(10, score)
  }

  /**
   * Calculate contractual complexity
   */
  private calculateContractualComplexity(analysisResult: AnalysisResult): number {
    let score = 0

    // Contract duration complexity
    if (analysisResult.marketScope.contractDuration) {
      if (analysisResult.marketScope.contractDuration > 36) score += 2
      else if (analysisResult.marketScope.contractDuration > 18) score += 1.5
      else if (analysisResult.marketScope.contractDuration > 12) score += 1
    }

    // Evaluation criteria complexity
    const criteria = analysisResult.evaluationCriteria
    const detailsCount = Object.keys(criteria.details || {}).length
    if (detailsCount > 6) score += 1.5
    else if (detailsCount > 3) score += 1

    // Balanced criteria (more complex)
    if (criteria.technical && criteria.financial) {
      const techFinancialRatio = criteria.technical / criteria.financial
      if (techFinancialRatio > 0.5 && techFinancialRatio < 2) score += 1
    }

    // Mandatory requirements complexity
    const mandatoryReqsCount = analysisResult.mandatoryRequirements.length
    if (mandatoryReqsCount > 10) score += 2
    else if (mandatoryReqsCount > 5) score += 1

    // Administrative complexity indicators
    const complexTerms = [
      'sous-traitance',
      'groupement',
      'marché alloti',
      'tranches conditionnelles',
      'reconduction',
      'avenant'
    ]
    
    const foundComplexTerms = complexTerms.filter(term =>
      analysisResult.mandatoryRequirements.some(req => 
        req.toLowerCase().includes(term)
      )
    )
    
    score += foundComplexTerms.length * 0.5

    return Math.min(10, score)
  }

  /**
   * Calculate time complexity
   */
  private calculateTimeComplexity(analysisResult: AnalysisResult): number {
    let score = 0

    const timeConstraints = analysisResult.timeConstraints

    // Project duration
    if (timeConstraints.projectDuration) {
      if (timeConstraints.projectDuration > 24) score += 2
      else if (timeConstraints.projectDuration > 12) score += 1.5
      else if (timeConstraints.projectDuration > 6) score += 1
    }

    // Milestones complexity
    const milestonesCount = timeConstraints.keyMilestones.length
    if (milestonesCount > 8) score += 2
    else if (milestonesCount > 4) score += 1
    else if (milestonesCount > 2) score += 0.5

    // Tight deadline pressure
    if (timeConstraints.submissionDeadline) {
      const now = new Date()
      const deadline = new Date(timeConstraints.submissionDeadline)
      const daysToDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysToDeadline < 30) score += 2
      else if (daysToDeadline < 45) score += 1
      else if (daysToDeadline < 60) score += 0.5
    }

    // Overlapping phases complexity
    const phaseKeywords = ['phase', 'étape', 'tranche', 'lot']
    const phaseCount = timeConstraints.keyMilestones.filter(milestone =>
      phaseKeywords.some(keyword => 
        milestone.name.toLowerCase().includes(keyword)
      )
    ).length

    if (phaseCount > 4) score += 1.5
    else if (phaseCount > 2) score += 1

    return Math.min(10, score)
  }

  /**
   * Calculate competitive complexity
   */
  private calculateCompetitiveComplexity(analysisResult: AnalysisResult): number {
    let score = 0

    const competitive = analysisResult.competitiveAnalysis

    // High competition = higher complexity
    if (competitive.estimatedBidders > 15) score += 2
    else if (competitive.estimatedBidders > 8) score += 1.5
    else if (competitive.estimatedBidders > 4) score += 1

    // Barrier to entry
    switch (competitive.barrierToEntry) {
      case 'HIGH':
        score += 2
        break
      case 'MEDIUM':
        score += 1
        break
      case 'LOW':
        score += 0.5
        break
    }

    // Differentiation factors
    const diffCount = competitive.keyDifferentiators.length
    if (diffCount > 6) score += 1.5
    else if (diffCount > 3) score += 1

    // Market maturity indicators
    const matureMarketIndicators = [
      'références similaires',
      'expérience minimale',
      'certification requise',
      'agrément'
    ]

    const maturityScore = matureMarketIndicators.filter(indicator =>
      analysisResult.mandatoryRequirements.some(req =>
        req.toLowerCase().includes(indicator.toLowerCase())
      )
    ).length

    score += maturityScore * 0.5

    return Math.min(10, score)
  }

  /**
   * Calculate risk complexity
   */
  private calculateRiskComplexity(analysisResult: AnalysisResult): number {
    let score = 0

    const risks = analysisResult.riskFactors

    // Total risk count
    if (risks.length > 8) score += 2
    else if (risks.length > 4) score += 1

    // High impact risks
    const highRisks = risks.filter(risk => risk.impact === 'HIGH')
    if (highRisks.length > 3) score += 3
    else if (highRisks.length > 1) score += 2
    else if (highRisks.length > 0) score += 1

    // Medium impact risks
    const mediumRisks = risks.filter(risk => risk.impact === 'MEDIUM')
    score += Math.min(2, mediumRisks.length * 0.5)

    // Risk category diversity
    const riskCategories = new Set(risks.map(risk => risk.category))
    if (riskCategories.size > 4) score += 1
    else if (riskCategories.size > 2) score += 0.5

    // Unmitigated risks
    const unmitigatedRisks = risks.filter(risk => !risk.mitigation || risk.mitigation.length < 10)
    score += Math.min(2, unmitigatedRisks.length * 0.3)

    return Math.min(10, score)
  }

  /**
   * Calculate weighted overall score
   */
  private calculateWeightedScore(factors: ComplexityFactors): number {
    const score = 
      factors.documentComplexity * this.factorWeights.documentComplexity +
      factors.technicalComplexity * this.factorWeights.technicalComplexity +
      factors.contractualComplexity * this.factorWeights.contractualComplexity +
      factors.timeComplexity * this.factorWeights.timeComplexity +
      factors.competitiveComplexity * this.factorWeights.competitiveComplexity +
      factors.riskComplexity * this.factorWeights.riskComplexity

    return Math.max(1, Math.min(10, score))
  }

  /**
   * Calculate confidence level for the complexity score
   */
  private calculateConfidenceLevel(factors: ComplexityFactors, extractionResults: ExtractionResult[]): number {
    let confidence = 0.5 // Base confidence

    // Higher confidence with more extraction data
    const avgExtractionConfidence = extractionResults.reduce(
      (sum, result) => sum + result.metadata.confidence, 0
    ) / extractionResults.length
    confidence += avgExtractionConfidence * 0.3

    // Factor consistency check
    const factorValues = Object.values(factors)
    const factorVariance = this.calculateVariance(factorValues)
    
    // Lower variance = higher confidence
    if (factorVariance < 2) confidence += 0.2
    else if (factorVariance < 4) confidence += 0.1

    // Completeness of analysis
    const hasAllFactors = factorValues.every(value => value > 0)
    if (hasAllFactors) confidence += 0.1

    return Math.min(1, confidence)
  }

  /**
   * Generate reasoning for the complexity score
   */
  private generateComplexityReasoning(factors: ComplexityFactors, overallScore: number): string {
    const reasons: string[] = []

    // Overall assessment
    if (overallScore >= 8) {
      reasons.push("Marché de très haute complexité nécessitant une expertise pointue et des ressources importantes")
    } else if (overallScore >= 6) {
      reasons.push("Marché de complexité élevée demandant une préparation approfondie")
    } else if (overallScore >= 4) {
      reasons.push("Marché de complexité modérée avec quelques défis techniques")
    } else {
      reasons.push("Marché de complexité faible avec des exigences standards")
    }

    // Factor-specific reasoning
    if (factors.technicalComplexity >= 7) {
      reasons.push("Exigences techniques très complexes avec de nombreuses contraintes obligatoires")
    } else if (factors.technicalComplexity >= 5) {
      reasons.push("Spécifications techniques détaillées nécessitant une expertise spécialisée")
    }

    if (factors.contractualComplexity >= 6) {
      reasons.push("Structure contractuelle complexe avec critères d'évaluation sophistiqués")
    }

    if (factors.timeComplexity >= 6) {
      reasons.push("Contraintes temporelles serrées avec planning de réalisation exigeant")
    }

    if (factors.riskComplexity >= 6) {
      reasons.push("Facteurs de risque élevés nécessitant des stratégies d'atténuation robustes")
    }

    if (factors.competitiveComplexity >= 6) {
      reasons.push("Environnement concurrentiel intense avec barrières à l'entrée significatives")
    }

    if (factors.documentComplexity >= 6) {
      reasons.push("Documentation volumineuse et structurée nécessitant une analyse approfondie")
    }

    return reasons.join('. ') + '.'
  }

  /**
   * Generate recommendations based on complexity
   */
  private generateRecommendations(factors: ComplexityFactors, overallScore: number): string[] {
    const recommendations: string[] = []

    if (overallScore >= 8) {
      recommendations.push("Constituer une équipe projet dédiée avec expertise métier spécialisée")
      recommendations.push("Prévoir un délai de préparation d'offre de 3-4 semaines minimum")
      recommendations.push("Effectuer une analyse de risques détaillée avant engagement")
    } else if (overallScore >= 6) {
      recommendations.push("Affecter des ressources expérimentées à la préparation de l'offre")
      recommendations.push("Prévoir 2-3 semaines pour une réponse complète et structurée")
    } else if (overallScore >= 4) {
      recommendations.push("Préparation standard avec révision par un expert métier")
      recommendations.push("Délai de 1-2 semaines suffisant pour une réponse de qualité")
    } else {
      recommendations.push("Réponse rapide possible avec les ressources habituelles")
    }

    // Factor-specific recommendations
    if (factors.technicalComplexity >= 7) {
      recommendations.push("Faire appel à des experts techniques pour valider la faisabilité")
      recommendations.push("Prévoir des études de faisabilité détaillées")
    }

    if (factors.riskComplexity >= 6) {
      recommendations.push("Élaborer un plan de gestion des risques complet")
      recommendations.push("Considérer une approche par phases pour réduire les risques")
    }

    if (factors.competitiveComplexity >= 6) {
      recommendations.push("Développer une stratégie de différenciation claire")
      recommendations.push("Mettre en avant les références et certifications spécifiques")
    }

    if (factors.timeComplexity >= 6) {
      recommendations.push("Optimiser le planning de réalisation et prévoir des marges")
      recommendations.push("Identifier les dépendances critiques du projet")
    }

    return recommendations
  }

  /**
   * Calculate variance for factor consistency
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
  }

  /**
   * Get complexity level description
   */
  getComplexityLevelDescription(score: number): string {
    if (score >= 9) return "Très haute complexité - Expertise exceptionnelle requise"
    if (score >= 7) return "Haute complexité - Expertise avancée nécessaire"
    if (score >= 5) return "Complexité modérée à élevée - Compétences spécialisées"
    if (score >= 3) return "Complexité modérée - Compétences standards"
    if (score >= 2) return "Faible complexité - Compétences de base"
    return "Très faible complexité - Marché simple"
  }

  /**
   * Validate complexity score result
   */
  validateComplexityScore(result: ComplexityScoreResult): { isValid: boolean, issues: string[] } {
    const issues: string[] = []

    if (result.overallScore < 1 || result.overallScore > 10) {
      issues.push("Score global hors de la plage valide (1-10)")
    }

    if (result.confidenceLevel < 0 || result.confidenceLevel > 1) {
      issues.push("Niveau de confiance hors de la plage valide (0-1)")
    }

    const factorValues = Object.values(result.factors)
    if (factorValues.some(value => value < 0 || value > 10)) {
      issues.push("Certains facteurs de complexité sont hors de la plage valide")
    }

    if (result.reasoning.length < 50) {
      issues.push("Justification du score trop courte")
    }

    if (result.recommendations.length === 0) {
      issues.push("Aucune recommandation générée")
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }
}