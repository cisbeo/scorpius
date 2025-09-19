import { PrismaClient, AntaresRecommendation, RecommendationType, RiskLevel } from '@prisma/client'
import { AnalysisResult } from './ai-analyzer.service'
import { ComplexityScoreResult } from './complexity-scorer.service'

const prisma = new PrismaClient()

export interface AntaresService {
  id: string
  name: string
  category: string
  description: string
  competencies: string[]
  certifications: string[]
  averageDuration: number // en jours
  priceRange: {
    min: number
    max: number
  }
  teamSize: {
    min: number
    max: number
  }
  prerequisites: string[]
  deliverables: string[]
}

export interface RecommendationRequest {
  analysisId: string
  analysisResult: AnalysisResult
  complexityScore: ComplexityScoreResult
  projectBudget?: number
  priorityFactors?: string[]
}

export interface RecommendationResult {
  recommendations: Array<{
    id: string
    recommendationType: RecommendationType
    title: string
    description: string
    relevanceScore: number
    antaresServices: string[]
    estimatedEffort: number
    estimatedValue: number
    riskLevel: RiskLevel
    actionable: boolean
    reasoning: string
    implementation: {
      approach: string
      timeline: string
      resources: string[]
      deliverables: string[]
    }
    businessCase: {
      benefits: string[]
      risks: string[]
      successFactors: string[]
    }
  }>
  summary: {
    totalRecommendations: number
    highRelevanceCount: number
    totalEstimatedValue: number
    averageRiskLevel: string
    primaryApproach: RecommendationType
  }
}

/**
 * Service for generating Antares service recommendations based on tender analysis
 * Matches DCE requirements to Antares service catalog
 */
export class AntaresRecommenderService {

  private readonly antaresServicesCatalog: AntaresService[] = [
    {
      id: 'infrastructure_design',
      name: 'Conception Architecture Infrastructure',
      category: 'Infrastructure',
      description: 'Conception et architecture d\'infrastructures IT complexes',
      competencies: ['Architecture système', 'Virtualisation', 'Cloud hybride', 'Haute disponibilité'],
      certifications: ['VMware VCP', 'Microsoft MCSE', 'Cisco CCNP'],
      averageDuration: 30,
      priceRange: { min: 800, max: 1200 },
      teamSize: { min: 2, max: 4 },
      prerequisites: ['Audit infrastructure existante'],
      deliverables: ['Dossier d\'architecture', 'Plan de migration', 'Documentation technique']
    },
    {
      id: 'cloud_migration',
      name: 'Migration Cloud Hybride',
      category: 'Cloud',
      description: 'Migration et modernisation vers architectures cloud hybrides',
      competencies: ['Azure', 'AWS', 'Migration de données', 'Optimisation coûts'],
      certifications: ['Azure Solutions Architect', 'AWS Solutions Architect'],
      averageDuration: 90,
      priceRange: { min: 900, max: 1500 },
      teamSize: { min: 3, max: 6 },
      prerequisites: ['Audit cloud readiness'],
      deliverables: ['Plateforme migrée', 'Plan de sauvegarde', 'Formation équipes']
    },
    {
      id: 'cybersecurity_audit',
      name: 'Audit de Cybersécurité',
      category: 'Sécurité',
      description: 'Audit complet de sécurité et mise en conformité',
      competencies: ['Pentest', 'ISO 27001', 'RGPD', 'SOC', 'Analyse de vulnérabilités'],
      certifications: ['CISSP', 'CEH', 'ISO 27001 Lead Auditor'],
      averageDuration: 20,
      priceRange: { min: 1000, max: 1800 },
      teamSize: { min: 2, max: 3 },
      prerequisites: ['Périmètre d\'audit défini'],
      deliverables: ['Rapport d\'audit', 'Plan de remédiation', 'Cartographie des risques']
    },
    {
      id: 'project_management',
      name: 'Pilotage de Projet IT',
      category: 'Management',
      description: 'Direction et pilotage de projets IT complexes',
      competencies: ['PMP', 'Agile', 'Risk Management', 'Budget Management'],
      certifications: ['PMP', 'Prince2', 'Scrum Master'],
      averageDuration: 180,
      priceRange: { min: 700, max: 1000 },
      teamSize: { min: 1, max: 2 },
      prerequisites: ['Cahier des charges validé'],
      deliverables: ['Planning détaillé', 'Reporting hebdomadaire', 'Livrable final']
    },
    {
      id: 'software_development',
      name: 'Développement Sur Mesure',
      category: 'Développement',
      description: 'Développement d\'applications métier sur mesure',
      competencies: ['Full Stack', '.NET', 'React', 'Node.js', 'DevOps'],
      certifications: ['Microsoft Certified Developer', 'AWS Developer'],
      averageDuration: 120,
      priceRange: { min: 600, max: 900 },
      teamSize: { min: 3, max: 8 },
      prerequisites: ['Spécifications fonctionnelles'],
      deliverables: ['Application complète', 'Tests unitaires', 'Documentation']
    },
    {
      id: 'data_analytics',
      name: 'Analytics et Business Intelligence',
      category: 'Data',
      description: 'Solutions d\'analyse de données et BI',
      competencies: ['Power BI', 'Tableau', 'SQL', 'Data Warehouse', 'Machine Learning'],
      certifications: ['Microsoft Data Analyst', 'Tableau Certified'],
      averageDuration: 60,
      priceRange: { min: 800, max: 1200 },
      teamSize: { min: 2, max: 4 },
      prerequisites: ['Audit des données existantes'],
      deliverables: ['Dashboards interactifs', 'Modèle de données', 'Formation utilisateurs']
    }
  ]

  /**
   * Generate recommendations based on tender analysis
   */
  async generateRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    try {
      // Analyze tender requirements
      const matchedServices = this.matchServicesToRequirements(request.analysisResult)
      
      // Generate different types of recommendations
      const recommendations = await this.createRecommendations(
        request,
        matchedServices
      )

      // Calculate summary statistics
      const summary = this.calculateSummary(recommendations)

      return {
        recommendations,
        summary
      }
    } catch (error) {
      throw new Error(`Erreur génération recommandations: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  /**
   * Match Antares services to tender requirements
   */
  private matchServicesToRequirements(analysisResult: AnalysisResult): Array<{
    service: AntaresService
    relevanceScore: number
    matchingRequirements: string[]
  }> {
    const matches: Array<{
      service: AntaresService
      relevanceScore: number
      matchingRequirements: string[]
    }> = []

    this.antaresServicesCatalog.forEach(service => {
      const matchResult = this.calculateServiceRelevance(service, analysisResult)
      if (matchResult.relevanceScore > 0.3) { // Seuil minimum de pertinence
        matches.push({
          service,
          relevanceScore: matchResult.relevanceScore,
          matchingRequirements: matchResult.matchingRequirements
        })
      }
    })

    return matches.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  /**
   * Calculate service relevance to requirements
   */
  private calculateServiceRelevance(
    service: AntaresService,
    analysisResult: AnalysisResult
  ): { relevanceScore: number, matchingRequirements: string[] } {
    let score = 0
    const matchingRequirements: string[] = []

    // Match against technical requirements
    analysisResult.technicalRequirements.forEach(req => {
      const reqLower = req.requirement.toLowerCase()
      const categoryLower = req.category.toLowerCase()

      // Check competency matches
      service.competencies.forEach(competency => {
        if (reqLower.includes(competency.toLowerCase()) || 
            categoryLower.includes(competency.toLowerCase())) {
          score += req.mandatory ? 0.3 : 0.2
          score += req.priority === 'HIGH' ? 0.1 : 0.05
          matchingRequirements.push(req.requirement)
        }
      })

      // Check certification matches
      service.certifications.forEach(cert => {
        if (reqLower.includes(cert.toLowerCase())) {
          score += 0.25
          matchingRequirements.push(req.requirement)
        }
      })
    })

    // Match against sector
    const sectorMapping = {
      'INFRASTRUCTURE': ['infrastructure', 'cloud', 'management'],
      'CYBERSECURITY': ['cybersecurity', 'security'],
      'DEVELOPMENT': ['development', 'software'],
      'MIXED': ['infrastructure', 'security', 'development']
    }

    const relevantCategories = sectorMapping[analysisResult.marketScope.sector] || []
    if (relevantCategories.includes(service.category.toLowerCase())) {
      score += 0.2
    }

    // Match against mandatory requirements
    analysisResult.mandatoryRequirements.forEach(mandatoryReq => {
      service.competencies.forEach(competency => {
        if (mandatoryReq.toLowerCase().includes(competency.toLowerCase())) {
          score += 0.15
          matchingRequirements.push(mandatoryReq)
        }
      })
    })

    return {
      relevanceScore: Math.min(1, score),
      matchingRequirements: [...new Set(matchingRequirements)] // Remove duplicates
    }
  }

  /**
   * Create different types of recommendations
   */
  private async createRecommendations(
    request: RecommendationRequest,
    matchedServices: Array<{
      service: AntaresService
      relevanceScore: number
      matchingRequirements: string[]
    }>
  ): Promise<RecommendationResult['recommendations']> {
    const recommendations: RecommendationResult['recommendations'] = []

    // 1. Direct service match recommendations
    const topMatches = matchedServices.slice(0, 3)
    for (const match of topMatches) {
      const serviceRecommendation = await this.createServiceMatchRecommendation(
        request,
        match
      )
      recommendations.push(serviceRecommendation)
    }

    // 2. Partnership recommendations for complex projects
    if (request.complexityScore.overallScore >= 7) {
      const partnershipRecommendation = await this.createPartnershipRecommendation(
        request,
        matchedServices
      )
      recommendations.push(partnershipRecommendation)
    }

    // 3. Subcontracting recommendations for specialized needs
    const specializationNeeds = this.identifySpecializationNeeds(request.analysisResult)
    if (specializationNeeds.length > 0) {
      const subcontractingRecommendation = await this.createSubcontractingRecommendation(
        request,
        specializationNeeds,
        matchedServices
      )
      recommendations.push(subcontractingRecommendation)
    }

    // 4. Pass recommendation if no good matches or too risky
    if (matchedServices.length === 0 || this.shouldRecommendPass(request)) {
      const passRecommendation = await this.createPassRecommendation(request)
      recommendations.push(passRecommendation)
    }

    return recommendations.filter(rec => rec.relevanceScore > 0.4)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  /**
   * Create service match recommendation
   */
  private async createServiceMatchRecommendation(
    request: RecommendationRequest,
    match: {
      service: AntaresService
      relevanceScore: number
      matchingRequirements: string[]
    }
  ): Promise<RecommendationResult['recommendations'][0]> {
    const service = match.service
    const effort = this.calculateEffort(service, request.complexityScore)
    const value = this.calculateValue(service, effort, request.projectBudget)
    const risk = this.assessRisk(request, service)

    return {
      id: `rec_${service.id}_${Date.now()}`,
      recommendationType: RecommendationType.SERVICE_MATCH,
      title: `${service.name} - Expertise Antares`,
      description: `Notre équipe ${service.category} peut prendre en charge ${service.description.toLowerCase()} en s'appuyant sur nos compétences en ${service.competencies.slice(0, 3).join(', ')}.`,
      relevanceScore: match.relevanceScore,
      antaresServices: [service.id],
      estimatedEffort: effort,
      estimatedValue: value,
      riskLevel: risk,
      actionable: match.relevanceScore > 0.7,
      reasoning: `Correspondance élevée (${(match.relevanceScore * 100).toFixed(0)}%) entre les exigences du DCE et nos compétences certifiées. Exigences couvertes: ${match.matchingRequirements.slice(0, 3).join(', ')}.`,
      implementation: {
        approach: this.generateImplementationApproach(service, request),
        timeline: this.generateTimeline(effort),
        resources: service.competencies.slice(0, 4),
        deliverables: service.deliverables
      },
      businessCase: {
        benefits: this.generateBenefits(service, request),
        risks: this.generateRisks(service, request),
        successFactors: this.generateSuccessFactors(service, request)
      }
    }
  }

  /**
   * Create partnership recommendation
   */
  private async createPartnershipRecommendation(
    request: RecommendationRequest,
    matchedServices: any[]
  ): Promise<RecommendationResult['recommendations'][0]> {
    const primaryServices = matchedServices.slice(0, 2)
    const combinedEffort = primaryServices.reduce((sum, match) => 
      sum + this.calculateEffort(match.service, request.complexityScore), 0
    )
    const combinedValue = combinedEffort * 950 // Prix moyen pondéré

    return {
      id: `rec_partnership_${Date.now()}`,
      recommendationType: RecommendationType.OPPORTUNITY,
      title: 'Partenariat Stratégique Multi-Compétences',
      description: 'Approche partenariat combinant plusieurs expertises Antares pour une couverture complète des exigences complexes du marché.',
      relevanceScore: 0.85,
      antaresServices: primaryServices.map(s => s.service.id),
      estimatedEffort: combinedEffort,
      estimatedValue: combinedValue,
      riskLevel: RiskLevel.MEDIUM,
      actionable: true,
      reasoning: 'Projet de haute complexité nécessitant une approche multi-expertises pour couvrir l\'ensemble des besoins identifiés.',
      implementation: {
        approach: 'Équipe projet transverse avec coordination centralisée et livraisons par phases',
        timeline: `${Math.ceil(combinedEffort / 30)} mois avec jalons mensuels`,
        resources: ['Chef de projet senior', 'Experts techniques', 'Coordinateur qualité'],
        deliverables: ['Plan projet détaillé', 'Livrables par expertise', 'Rapport de synthèse']
      },
      businessCase: {
        benefits: [
          'Couverture complète des exigences',
          'Synergie entre expertises',
          'Réduction des risques d\'interface',
          'Interlocuteur unique'
        ],
        risks: [
          'Coordination complexe',
          'Dépendances entre équipes',
          'Coût global élevé'
        ],
        successFactors: [
          'Gouvernance projet forte',
          'Communication régulière',
          'Planning détaillé'
        ]
      }
    }
  }

  /**
   * Create subcontracting recommendation
   */
  private async createSubcontractingRecommendation(
    request: RecommendationRequest,
    specializationNeeds: string[],
    matchedServices: any[]
  ): Promise<RecommendationResult['recommendations'][0]> {
    const specializedService = matchedServices.find(match => 
      match.service.category === 'Sécurité' || match.service.category === 'Data'
    )?.service || matchedServices[0]?.service

    if (!specializedService) {
      throw new Error('Aucun service spécialisé trouvé pour la sous-traitance')
    }

    const effort = this.calculateEffort(specializedService, request.complexityScore) * 0.7 // Scope réduit
    const value = effort * specializedService.priceRange.min

    return {
      id: `rec_subcontracting_${Date.now()}`,
      recommendationType: RecommendationType.STRATEGY,
      title: `Sous-traitance ${specializedService.name}`,
      description: `Sous-traitance spécialisée pour ${specializationNeeds.join(' et ')} en s'appuyant sur notre expertise ${specializedService.category}.`,
      relevanceScore: 0.75,
      antaresServices: [specializedService.id],
      estimatedEffort: effort,
      estimatedValue: value,
      riskLevel: RiskLevel.LOW,
      actionable: true,
      reasoning: `Besoin spécialisé identifié nécessitant une expertise pointue en ${specializedService.category}.`,
      implementation: {
        approach: 'Intervention ciblée en support du titulaire principal',
        timeline: `${Math.ceil(effort / 22)} mois d'intervention`,
        resources: specializedService.competencies.slice(0, 3),
        deliverables: specializedService.deliverables.slice(0, 2)
      },
      businessCase: {
        benefits: [
          'Expertise spécialisée',
          'Réduction des risques techniques',
          'Coût maîtrisé',
          'Flexibilité d\'intervention'
        ],
        risks: [
          'Coordination avec titulaire',
          'Scope limité',
          'Dépendance partenaire'
        ],
        successFactors: [
          'Définition claire du périmètre',
          'Interface bien définie',
          'Suivi régulier'
        ]
      }
    }
  }

  /**
   * Create pass recommendation
   */
  private async createPassRecommendation(
    request: RecommendationRequest
  ): Promise<RecommendationResult['recommendations'][0]> {
    return {
      id: `rec_pass_${Date.now()}`,
      recommendationType: RecommendationType.RISK,
      title: 'Ne Pas Candidater - Marché Non Adapté',
      description: 'Analyse du marché indiquant un niveau de risque ou une inadéquation trop élevés pour justifier une candidature.',
      relevanceScore: 0.3,
      antaresServices: [],
      estimatedEffort: 0,
      estimatedValue: 0,
      riskLevel: RiskLevel.HIGH,
      actionable: false,
      reasoning: this.generatePassReasoning(request),
      implementation: {
        approach: 'Ne pas candidater',
        timeline: 'Immédiat',
        resources: [],
        deliverables: []
      },
      businessCase: {
        benefits: [
          'Éviter un projet à risque',
          'Concentrer les ressources sur des opportunités plus adaptées',
          'Préserver la réputation'
        ],
        risks: [
          'Manque d\'opportunité',
          'Concurrence renforcée sur autres marchés'
        ],
        successFactors: [
          'Veille continue du marché',
          'Réorientation vers marchés plus adaptés'
        ]
      }
    }
  }

  // Helper methods

  private calculateEffort(service: AntaresService, complexityScore: ComplexityScoreResult): number {
    const baseEffort = service.averageDuration
    const complexityMultiplier = 0.5 + (complexityScore.overallScore / 10) * 1.5
    return Math.round(baseEffort * complexityMultiplier)
  }

  private calculateValue(service: AntaresService, effort: number, projectBudget?: number): number {
    const dailyRate = (service.priceRange.min + service.priceRange.max) / 2
    let estimatedValue = effort * dailyRate

    // Adjust based on project budget if available
    if (projectBudget && estimatedValue > projectBudget * 0.8) {
      estimatedValue = projectBudget * 0.7 // Conservative estimate
    }

    return Math.round(estimatedValue)
  }

  private assessRisk(request: RecommendationRequest, service: AntaresService): RiskLevel {
    const complexity = request.complexityScore.overallScore
    const highRiskFactors = request.analysisResult.riskFactors.filter(r => r.impact === 'HIGH').length

    if (complexity >= 8 || highRiskFactors >= 3) return RiskLevel.HIGH
    if (complexity >= 6 || highRiskFactors >= 1) return RiskLevel.MEDIUM
    return RiskLevel.LOW
  }

  private identifySpecializationNeeds(analysisResult: AnalysisResult): string[] {
    const needs: string[] = []
    
    const securityTerms = ['sécurité', 'cybersécurité', 'rgpd', 'iso 27001']
    const dataTerms = ['données', 'analytics', 'bi', 'reporting']
    
    const allText = [
      ...analysisResult.technicalRequirements.map(r => r.requirement),
      ...analysisResult.mandatoryRequirements
    ].join(' ').toLowerCase()

    if (securityTerms.some(term => allText.includes(term))) {
      needs.push('cybersécurité')
    }
    
    if (dataTerms.some(term => allText.includes(term))) {
      needs.push('analytics')
    }

    return needs
  }

  private shouldRecommendPass(request: RecommendationRequest): boolean {
    const complexity = request.complexityScore.overallScore
    const highRisks = request.analysisResult.riskFactors.filter(r => r.impact === 'HIGH').length
    const lowBarrier = request.analysisResult.competitiveAnalysis.barrierToEntry === 'LOW'
    const highCompetition = request.analysisResult.competitiveAnalysis.estimatedBidders > 10

    return complexity >= 9 || highRisks >= 4 || (lowBarrier && highCompetition)
  }

  private generateImplementationApproach(service: AntaresService, request: RecommendationRequest): string {
    const approaches = {
      'Infrastructure': 'Approche par phases avec audit initial, conception détaillée et implémentation progressive',
      'Cloud': 'Migration par vagues avec environnement de test, formation et bascule maîtrisée',
      'Sécurité': 'Audit de sécurité complet suivi de la mise en œuvre des recommandations',
      'Management': 'Pilotage projet avec méthodologie Agile et reporting continu',
      'Développement': 'Développement itératif avec prototypage et tests utilisateurs',
      'Data': 'Approche data-driven avec modélisation, développement et formation'
    }

    return approaches[service.category as keyof typeof approaches] || 'Approche structurée adaptée aux spécificités du projet'
  }

  private generateTimeline(effort: number): string {
    const months = Math.ceil(effort / 22)
    if (months <= 2) return `${effort} jours répartis sur ${months} mois`
    if (months <= 6) return `${months} mois avec jalons mensuels`
    return `${months} mois avec jalons bimensuels et revues trimestrielles`
  }

  private generateBenefits(service: AntaresService, request: RecommendationRequest): string[] {
    const baseBenefits = [
      'Expertise certifiée et reconnue',
      'Réduction des risques techniques',
      'Respect des délais et budgets',
      'Accompagnement et formation'
    ]

    const sectorBenefits = {
      'INFRASTRUCTURE': ['Haute disponibilité garantie', 'Évolutivité de l\'architecture'],
      'CYBERSECURITY': ['Conformité réglementaire', 'Protection renforcée'],
      'DEVELOPMENT': ['Solution sur mesure', 'Maintenance évolutive'],
      'MIXED': ['Approche globale', 'Cohérence d\'ensemble']
    }

    return [
      ...baseBenefits,
      ...(sectorBenefits[request.analysisResult.marketScope.sector] || [])
    ]
  }

  private generateRisks(service: AntaresService, request: RecommendationRequest): string[] {
    const baseRisks = ['Dépendance fournisseur', 'Coordination projet']
    
    if (request.complexityScore.overallScore >= 7) {
      baseRisks.push('Complexité technique élevée', 'Délais serrés')
    }
    
    if (request.analysisResult.competitiveAnalysis.estimatedBidders > 8) {
      baseRisks.push('Concurrence intense')
    }

    return baseRisks
  }

  private generateSuccessFactors(service: AntaresService, request: RecommendationRequest): string[] {
    return [
      'Équipe projet dédiée et expérimentée',
      'Communication régulière avec le client',
      'Planification détaillée et suivi rigoureux',
      'Gestion proactive des risques',
      'Formation et accompagnement utilisateurs'
    ]
  }

  private generatePassReasoning(request: RecommendationRequest): string {
    const reasons: string[] = []
    
    if (request.complexityScore.overallScore >= 9) {
      reasons.push('Complexité technique excessive')
    }
    
    const highRisks = request.analysisResult.riskFactors.filter(r => r.impact === 'HIGH').length
    if (highRisks >= 4) {
      reasons.push('Facteurs de risque trop nombreux')
    }
    
    if (request.analysisResult.competitiveAnalysis.barrierToEntry === 'LOW' && 
        request.analysisResult.competitiveAnalysis.estimatedBidders > 10) {
      reasons.push('Concurrence trop intense avec faibles barrières')
    }

    return reasons.length > 0 
      ? `Marché non recommandé: ${reasons.join(', ')}.`
      : 'Analyse indiquant un rapport risque/opportunité défavorable.'
  }

  private calculateSummary(recommendations: RecommendationResult['recommendations']): RecommendationResult['summary'] {
    // Handle empty recommendations array
    if (recommendations.length === 0) {
      return {
        totalRecommendations: 0,
        highRelevanceCount: 0,
        totalEstimatedValue: 0,
        averageRiskLevel: 'LOW',
        primaryApproach: 'OPTIMIZATION'
      }
    }

    const highRelevanceCount = recommendations.filter(r => r.relevanceScore > 0.8).length
    const totalValue = recommendations.reduce((sum, r) => sum + r.estimatedValue, 0)
    
    const riskCounts = recommendations.reduce((acc, r) => {
      acc[r.riskLevel] = (acc[r.riskLevel] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const avgRisk = Object.entries(riskCounts).length > 0 
      ? Object.entries(riskCounts).reduce((a, b) => 
          riskCounts[a[0]] > riskCounts[b[0]] ? a : b
        )[0]
      : 'LOW'

    const typeCounts = recommendations.reduce((acc, r) => {
      acc[r.recommendationType] = (acc[r.recommendationType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const primaryType = Object.entries(typeCounts).reduce((a, b) => 
      typeCounts[a[0]] > typeCounts[b[0]] ? a : b
    )[0] as RecommendationType

    return {
      totalRecommendations: recommendations.length,
      highRelevanceCount,
      totalEstimatedValue: totalValue,
      averageRiskLevel: avgRisk,
      primaryApproach: primaryType
    }
  }

  /**
   * Save recommendations to database
   */
  async saveRecommendations(
    analysisId: string,
    recommendations: RecommendationResult['recommendations']
  ): Promise<AntaresRecommendation[]> {
    const savedRecommendations: AntaresRecommendation[] = []

    for (const rec of recommendations) {
      const saved = await prisma.antaresRecommendation.create({
        data: {
          recommendationType: rec.recommendationType,
          title: rec.title,
          description: rec.description,
          relevanceScore: rec.relevanceScore,
          antaresServices: rec.antaresServices,
          estimatedEffort: rec.estimatedEffort,
          estimatedValue: rec.estimatedValue,
          riskLevel: rec.riskLevel,
          actionable: rec.actionable,
          analysisId
        }
      })
      
      savedRecommendations.push(saved)
    }

    return savedRecommendations
  }

  /**
   * Get service catalog
   */
  getServicesCatalog(): AntaresService[] {
    return this.antaresServicesCatalog
  }

  /**
   * Get service by ID
   */
  getServiceById(serviceId: string): AntaresService | undefined {
    return this.antaresServicesCatalog.find(s => s.id === serviceId)
  }
}