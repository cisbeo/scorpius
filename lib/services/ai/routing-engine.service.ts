import { 
  ContextAnalysis, 
  RoutingDecision, 
  ModelCapabilities, 
  ModelName, 
  TaskType,
  UrgencyLevel,
  UserPreferences,
  RouterConfig
} from './types'

/**
 * Moteur de routage intelligent pour sélectionner le modèle IA optimal
 * Basé sur un système de scoring multi-critères
 */
export class RoutingEngineService {
  
  private config: RouterConfig
  private modelCapabilities: Map<ModelName, ModelCapabilities>
  
  constructor(config: RouterConfig) {
    this.config = config
    this.modelCapabilities = this.initializeModelCapabilities()
  }
  
  /**
   * Prise de décision de routage principal
   */
  async makeRoutingDecision(
    context: ContextAnalysis,
    preferences?: UserPreferences
  ): Promise<RoutingDecision> {
    
    // 1. Filtrer les modèles disponibles
    const availableModels = this.getAvailableModels(context, preferences)
    
    if (availableModels.length === 0) {
      throw new Error('Aucun modèle disponible pour cette requête')
    }
    
    // 2. Scorer chaque modèle
    const modelScores = await Promise.all(
      availableModels.map(model => this.scoreModel(model, context, preferences))
    )
    
    // 3. Sélectionner le meilleur
    const bestModel = modelScores.reduce((best, current) => 
      current.totalScore > best.totalScore ? current : best
    )
    
    // 4. Construire la chaîne de fallback
    const fallbackChain = this.buildFallbackChain(bestModel.name, context)
    
    // 5. Générer les paramètres du modèle
    const modelParams = this.generateModelParams(bestModel.name, context)
    
    return {
      selectedModel: bestModel.name,
      reasoning: bestModel.reasoning,
      fallbackChain,
      estimatedCost: bestModel.estimatedCost,
      estimatedTime: bestModel.estimatedTime,
      decisionConfidence: bestModel.confidence,
      modelParams
    }
  }
  
  /**
   * Filtrage des modèles disponibles selon le contexte
   */
  private getAvailableModels(
    context: ContextAnalysis, 
    preferences?: UserPreferences
  ): ModelName[] {
    
    let availableModels = Array.from(this.modelCapabilities.keys())
      .filter(model => {
        const capabilities = this.modelCapabilities.get(model)!
        
        // Vérifier disponibilité
        if (!capabilities.availability.isAvailable) return false
        
        // Vérifier support du français si nécessaire
        if (context.languageOptimization === 'french' && !capabilities.capabilities.supportsFrench) {
          return false
        }
        
        // Vérifier limite de tokens
        if (context.contentSize > capabilities.capabilities.maxTokens) return false
        
        // Vérifier préférences utilisateur
        if (preferences?.excludedModels?.includes(model)) return false
        
        return true
      })
    
    // Prioriser les modèles préférés
    if (preferences?.preferredModels) {
      const preferred = availableModels.filter(m => preferences.preferredModels!.includes(m))
      const others = availableModels.filter(m => !preferences.preferredModels!.includes(m))
      availableModels = [...preferred, ...others]
    }
    
    return availableModels
  }
  
  /**
   * Scoring multi-critères d'un modèle pour un contexte donné
   */
  private async scoreModel(
    modelName: ModelName,
    context: ContextAnalysis,
    preferences?: UserPreferences
  ): Promise<{
    name: ModelName
    totalScore: number
    reasoning: string
    estimatedCost: number
    estimatedTime: number
    confidence: number
  }> {
    
    const capabilities = this.modelCapabilities.get(modelName)!
    
    // Calcul des scores individuels
    const scores = {
      performance: this.scorePerformance(capabilities, context),
      cost: this.scoreCost(capabilities, context),
      quality: this.scoreQuality(capabilities, context),
      speed: this.scoreSpeed(capabilities, context),
      availability: this.scoreAvailability(capabilities),
      taskFit: this.scoreTaskFit(capabilities, context)
    }
    
    // Pondération selon les préférences et l'urgence
    const weights = this.calculateWeights(context.urgency, preferences)
    
    // Score total pondéré
    const totalScore = 
      scores.performance * weights.performance +
      scores.cost * weights.cost +
      scores.quality * weights.quality +
      scores.speed * weights.speed +
      scores.availability * weights.availability +
      scores.taskFit * weights.taskFit
    
    // Estimations
    const estimatedCost = this.estimateCost(capabilities, context)
    const estimatedTime = this.estimateTime(capabilities, context)
    const confidence = this.calculateConfidence(scores, context)
    
    // Génération du raisonnement
    const reasoning = this.generateReasoning(modelName, scores, weights, context)
    
    return {
      name: modelName,
      totalScore,
      reasoning,
      estimatedCost,
      estimatedTime,
      confidence
    }
  }
  
  /**
   * Score de performance générale du modèle
   */
  private scorePerformance(capabilities: ModelCapabilities, context: ContextAnalysis): number {
    let score = capabilities.performance.qualityScore
    
    // Bonus pour l'optimisation française
    if (context.languageOptimization === 'french' && capabilities.performance.frenchAccuracy > 0.8) {
      score += 0.2
    }
    
    // Malus si le modèle est surchargé
    if (capabilities.availability.currentLoad > 0.8) {
      score -= 0.1
    }
    
    return Math.max(0, Math.min(1, score))
  }
  
  /**
   * Score basé sur le coût
   */
  private scoreCost(capabilities: ModelCapabilities, context: ContextAnalysis): number {
    const estimatedCost = capabilities.performance.costPerToken * context.contentSize
    
    // Score inversement proportionnel au coût
    // Budget élevé = score coût moins important
    const costRatio = estimatedCost / context.costBudget
    
    if (costRatio <= 0.5) return 1.0    // Très économique
    if (costRatio <= 0.8) return 0.8    // Économique  
    if (costRatio <= 1.0) return 0.6    // Dans le budget
    if (costRatio <= 1.2) return 0.3    // Légèrement dépassé
    return 0.0                          // Trop cher
  }
  
  /**
   * Score de qualité pour le type de tâche
   */
  private scoreQuality(capabilities: ModelCapabilities, context: ContextAnalysis): number {
    let baseScore = capabilities.performance.qualityScore
    
    // Ajustement selon la complexité requise
    if (context.complexity >= 8 && capabilities.capabilities.maxTokens < 4000) {
      baseScore -= 0.2  // Pénalité pour modèles limités sur tâches complexes
    }
    
    // Bonus pour support de fonctions structurées si nécessaire
    if (context.taskType === 'EXTRACT' && capabilities.capabilities.supportsStructuredOutput) {
      baseScore += 0.1
    }
    
    return Math.max(0, Math.min(1, baseScore))
  }
  
  /**
   * Score de vitesse
   */
  private scoreSpeed(capabilities: ModelCapabilities, context: ContextAnalysis): number {
    const avgTime = capabilities.performance.avgResponseTime
    
    // Score basé sur temps de réponse attendu selon l'urgence
    const targetTimes = {
      fast: 2000,     // 2 secondes
      balanced: 5000, // 5 secondes  
      quality: 10000  // 10 secondes acceptable
    }
    
    const targetTime = targetTimes[context.urgency]
    const timeRatio = avgTime / targetTime
    
    if (timeRatio <= 0.5) return 1.0
    if (timeRatio <= 1.0) return 0.8
    if (timeRatio <= 1.5) return 0.5
    return 0.2
  }
  
  /**
   * Score de disponibilité
   */
  private scoreAvailability(capabilities: ModelCapabilities): number {
    if (!capabilities.availability.isAvailable) return 0
    
    const loadScore = 1 - capabilities.availability.currentLoad
    const rateLimitScore = capabilities.availability.rateLimit > 100 ? 1.0 : 0.5
    
    return (loadScore * 0.7) + (rateLimitScore * 0.3)
  }
  
  /**
   * Score d'adéquation à la tâche
   */
  private scoreTaskFit(capabilities: ModelCapabilities, context: ContextAnalysis): number {
    // Score élevé si le modèle est optimal pour ce type de tâche
    const isOptimal = capabilities.optimalFor.includes(context.taskType)
    
    let score = isOptimal ? 1.0 : 0.5
    
    // Ajustements spécifiques par tâche
    switch (context.taskType) {
      case 'EMBED':
        score = modelName.includes('voyage') || modelName.includes('embedding') ? 1.0 : 0.3
        break
        
      case 'CALCULATE':
        score = modelName.includes('gpt-4o') ? 1.0 : 0.6
        break
        
      case 'EXTRACT':
        if (capabilities.capabilities.supportsStructuredOutput) score += 0.2
        break
    }
    
    return Math.max(0, Math.min(1, score))
  }
  
  /**
   * Calcul des poids selon l'urgence et les préférences
   */
  private calculateWeights(
    urgency: UrgencyLevel,
    preferences?: UserPreferences
  ): Record<string, number> {
    
    // Poids de base selon l'urgence
    const baseWeights = {
      fast: {
        performance: 0.15,
        cost: 0.15,
        quality: 0.15,
        speed: 0.35,        // Priorité vitesse
        availability: 0.10,
        taskFit: 0.10
      },
      balanced: {
        performance: 0.20,
        cost: 0.20,
        quality: 0.25,
        speed: 0.20,
        availability: 0.10,
        taskFit: 0.05
      },
      quality: {
        performance: 0.30,  // Priorité performance
        cost: 0.10,
        quality: 0.35,     // Priorité qualité
        speed: 0.10,
        availability: 0.10,
        taskFit: 0.05
      }
    }
    
    let weights = { ...baseWeights[urgency] }
    
    // Ajustement selon les préférences utilisateur
    if (preferences?.priority) {
      switch (preferences.priority) {
        case 'cost':
          weights.cost *= 1.5
          weights.performance *= 0.8
          break
        case 'speed':
          weights.speed *= 1.5
          weights.quality *= 0.8
          break
        case 'quality':
          weights.quality *= 1.5
          weights.cost *= 0.8
          break
      }
    }
    
    // Normalisation pour que la somme = 1
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0)
    Object.keys(weights).forEach(key => {
      weights[key] /= total
    })
    
    return weights
  }
  
  /**
   * Construction de la chaîne de fallback
   */
  private buildFallbackChain(selectedModel: ModelName, context: ContextAnalysis): ModelName[] {
    const fallbackChains: Record<string, ModelName[]> = {
      'claude-3.5-sonnet': ['claude-3-haiku', 'gpt-4o', 'gpt-4-turbo'],
      'claude-3-haiku': ['claude-3.5-sonnet', 'gpt-4o'],
      'gpt-4o': ['gpt-4-turbo', 'claude-3.5-sonnet'],
      'gpt-4-turbo': ['gpt-4o', 'claude-3.5-sonnet'],
      'voyage-large-2-instruct': ['text-embedding-3-large'],
      'text-embedding-3-large': ['voyage-large-2-instruct']
    }
    
    let chain = fallbackChains[selectedModel] || []
    
    // Filtrer selon disponibilité et contexte
    chain = chain.filter(model => {
      const capabilities = this.modelCapabilities.get(model)
      return capabilities?.availability.isAvailable && 
             capabilities.capabilities.maxTokens >= context.contentSize
    })
    
    return chain.slice(0, 3) // Max 3 fallbacks
  }
  
  /**
   * Génération des paramètres optimaux pour le modèle
   */
  private generateModelParams(model: ModelName, context: ContextAnalysis) {
    const baseParams = {
      maxTokens: Math.min(2000, Math.max(500, context.contentSize * 1.5)),
      temperature: 0.3,
      topP: 0.9,
      presencePenalty: 0.0,
      frequencyPenalty: 0.0
    }
    
    // Ajustements par modèle et tâche
    switch (context.taskType) {
      case 'CLASSIFY':
        baseParams.temperature = 0.1  // Plus déterministe
        break
      case 'GENERATE':
        baseParams.temperature = 0.7  // Plus créatif
        break
      case 'CALCULATE':
        baseParams.temperature = 0.0  // Très déterministe
        break
    }
    
    // Ajustements par modèle
    if (model.includes('claude')) {
      baseParams.maxTokens = Math.min(4000, baseParams.maxTokens)
    }
    
    return baseParams
  }
  
  /**
   * Estimation du coût
   */
  private estimateCost(capabilities: ModelCapabilities, context: ContextAnalysis): number {
    const tokenCost = capabilities.performance.costPerToken * context.contentSize
    return Math.round(tokenCost * 100) / 100
  }
  
  /**
   * Estimation du temps
   */
  private estimateTime(capabilities: ModelCapabilities, context: ContextAnalysis): number {
    const baseTime = capabilities.performance.avgResponseTime
    const complexityMultiplier = 1 + (context.complexity - 5) * 0.1
    return Math.round(baseTime * complexityMultiplier)
  }
  
  /**
   * Calcul de la confiance dans la décision
   */
  private calculateConfidence(scores: Record<string, number>, context: ContextAnalysis): number {
    const avgScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length
    
    // Réduction de confiance si contexte ambiguë ou très complexe
    let confidence = avgScore
    if (context.complexity >= 9) confidence *= 0.9
    if (context.contentSize > 8000) confidence *= 0.95
    
    return Math.round(confidence * 100) / 100
  }
  
  /**
   * Génération du raisonnement explicite
   */
  private generateReasoning(
    model: ModelName,
    scores: Record<string, number>, 
    weights: Record<string, number>,
    context: ContextAnalysis
  ): string {
    
    const strongPoints = Object.entries(scores)
      .filter(([_, score]) => score > 0.7)
      .map(([criterion, _]) => criterion)
    
    const weakPoints = Object.entries(scores)
      .filter(([_, score]) => score < 0.4)
      .map(([criterion, _]) => criterion)
    
    let reasoning = `${model} sélectionné pour ${context.taskType.toLowerCase()}`
    
    if (strongPoints.length > 0) {
      reasoning += ` - Points forts: ${strongPoints.join(', ')}`
    }
    
    if (context.urgency === 'fast') {
      reasoning += ` - Optimisé vitesse (${context.urgency})`
    }
    
    if (context.languageOptimization === 'french') {
      reasoning += ` - Optimisé français`
    }
    
    return reasoning
  }
  
  /**
   * Initialisation des capacités des modèles
   */
  private initializeModelCapabilities(): Map<ModelName, ModelCapabilities> {
    const capabilities = new Map<ModelName, ModelCapabilities>()
    
    // Claude 3.5 Sonnet
    capabilities.set('claude-3.5-sonnet', {
      name: 'claude-3.5-sonnet',
      capabilities: {
        maxTokens: 8000,
        supportsFunction: true,
        supportsFrench: true,
        supportsStructuredOutput: true
      },
      performance: {
        avgResponseTime: 4000,
        costPerToken: 0.00003,
        qualityScore: 0.95,
        frenchAccuracy: 0.92
      },
      availability: {
        isAvailable: true,
        rateLimit: 200,
        currentLoad: 0.3
      },
      optimalFor: ['ANALYZE', 'EXTRACT', 'GENERATE']
    })
    
    // Claude 3 Haiku
    capabilities.set('claude-3-haiku', {
      name: 'claude-3-haiku',
      capabilities: {
        maxTokens: 4000,
        supportsFunction: true,
        supportsFrench: true,
        supportsStructuredOutput: true
      },
      performance: {
        avgResponseTime: 1500,
        costPerToken: 0.00001,
        qualityScore: 0.85,
        frenchAccuracy: 0.88
      },
      availability: {
        isAvailable: true,
        rateLimit: 300,
        currentLoad: 0.2
      },
      optimalFor: ['CLASSIFY', 'EXTRACT']
    })
    
    // GPT-4o
    capabilities.set('gpt-4o', {
      name: 'gpt-4o',
      capabilities: {
        maxTokens: 4000,
        supportsFunction: true,
        supportsFrench: true,
        supportsStructuredOutput: true
      },
      performance: {
        avgResponseTime: 3000,
        costPerToken: 0.00005,
        qualityScore: 0.92,
        frenchAccuracy: 0.78
      },
      availability: {
        isAvailable: true,
        rateLimit: 150,
        currentLoad: 0.4
      },
      optimalFor: ['CALCULATE', 'ANALYZE', 'GENERATE']
    })
    
    // Voyage embeddings
    capabilities.set('voyage-large-2-instruct', {
      name: 'voyage-large-2-instruct',
      capabilities: {
        maxTokens: 8000,
        supportsFunction: false,
        supportsFrench: true,
        supportsStructuredOutput: false
      },
      performance: {
        avgResponseTime: 800,
        costPerToken: 0.000005,
        qualityScore: 0.90,
        frenchAccuracy: 0.94
      },
      availability: {
        isAvailable: true,
        rateLimit: 500,
        currentLoad: 0.1
      },
      optimalFor: ['EMBED']
    })
    
    return capabilities
  }
}