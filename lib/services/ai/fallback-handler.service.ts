import { 
  AIRequest, 
  AIResponse, 
  ModelName, 
  ModelError,
  RoutingDecision,
  AllModelsFailed,
  ModelUnavailableError
} from './types'

/**
 * Service de gestion des fallbacks automatiques
 * Assure la continuité de service en cas d'échec d'un modèle
 */
export class FallbackHandlerService {
  
  private failedModels: Map<ModelName, ModelError[]> = new Map()
  private retryCounters: Map<string, number> = new Map()
  private readonly maxRetries = 3
  private readonly timeoutMs = 10000 // 10 secondes
  
  /**
   * Exécute une requête avec fallback automatique
   */
  async executeWithFallback(
    request: AIRequest,
    decision: RoutingDecision,
    executor: (model: ModelName, request: AIRequest, params: any) => Promise<AIResponse>
  ): Promise<AIResponse> {
    
    const modelsToTry = [decision.selectedModel, ...decision.fallbackChain]
    const errors: ModelError[] = []
    
    for (let i = 0; i < modelsToTry.length; i++) {
      const modelName = modelsToTry[i]
      const retryKey = `${modelName}-${request.content.substring(0, 50)}`
      
      try {
        // Vérifier si le modèle est temporairement indisponible
        if (this.isModelTemporarilyBlocked(modelName)) {
          throw new ModelUnavailableError(modelName)
        }
        
        // Tentative d'exécution avec timeout
        const response = await this.executeWithTimeout(
          modelName, 
          request, 
          decision.modelParams,
          executor
        )
        
        // Validation de la réponse
        if (this.validateResponse(response, request)) {
          // Succès - nettoyer les compteurs d'échec
          this.clearRetryCounter(retryKey)
          this.recordSuccess(modelName)
          
          // Marquer si un fallback a été utilisé
          if (i > 0) {
            response.metadata = {
              ...response.metadata,
              fallbackUsed: true,
              fallbackReason: `Échec modèle principal: ${decision.selectedModel}`
            }
          }
          
          return response
        } else {
          throw new Error(`Réponse invalide du modèle ${modelName}`)
        }
        
      } catch (error) {
        const modelError: ModelError = {
          model: modelName,
          error: error as Error,
          timestamp: new Date(),
          requestContext: {
            content: request.content.substring(0, 200),
            context: request.context
          },
          retryCount: this.getRetryCount(retryKey)
        }
        
        errors.push(modelError)
        await this.recordFailure(modelError)
        
        // Incrémenter le compteur de retry
        this.incrementRetryCounter(retryKey)
        
        // Si c'est le dernier modèle, on lance l'erreur
        if (i === modelsToTry.length - 1) {
          throw new AllModelsFailed(modelsToTry)
        }
        
        // Attendre avant le prochain essai (backoff exponentiel)
        if (i < modelsToTry.length - 1) {
          await this.waitBeforeRetry(i)
        }
      }
    }
    
    // Ne devrait jamais arriver, mais par sécurité
    throw new AllModelsFailed(modelsToTry)
  }
  
  /**
   * Exécution avec timeout
   */
  private async executeWithTimeout(
    modelName: ModelName,
    request: AIRequest,
    params: any,
    executor: (model: ModelName, request: AIRequest, params: any) => Promise<AIResponse>
  ): Promise<AIResponse> {
    
    return new Promise(async (resolve, reject) => {
      // Timer de timeout
      const timeoutTimer = setTimeout(() => {
        reject(new Error(`Timeout après ${this.timeoutMs}ms pour ${modelName}`))
      }, this.timeoutMs)
      
      try {
        const response = await executor(modelName, request, params)
        clearTimeout(timeoutTimer)
        resolve(response)
      } catch (error) {
        clearTimeout(timeoutTimer)
        reject(error)
      }
    })
  }
  
  /**
   * Validation de la qualité de la réponse
   */
  private validateResponse(response: AIResponse, request: AIRequest): boolean {
    // Vérifications de base
    if (!response.content || response.content.trim().length === 0) {
      return false
    }
    
    // Vérification de la longueur minimale
    if (response.content.length < 10) {
      return false
    }
    
    // Vérification du niveau de confiance
    if (response.confidence < 0.3) {
      return false
    }
    
    // Vérifications spécifiques par type de tâche
    switch (request.context.taskType) {
      case 'CLASSIFY':
        return this.validateClassificationResponse(response)
      
      case 'EXTRACT':
        return this.validateExtractionResponse(response)
      
      case 'CALCULATE':
        return this.validateCalculationResponse(response)
      
      default:
        return true
    }
  }
  
  /**
   * Validation spécifique pour les tâches de classification
   */
  private validateClassificationResponse(response: AIResponse): boolean {
    const content = response.content.toLowerCase()
    
    // Doit contenir une réponse de classification
    const classificationPatterns = [
      /cctp|ccp|bpu|rc/,
      /type|catégorie|classification/,
      /document.*de.*type/
    ]
    
    return classificationPatterns.some(pattern => pattern.test(content))
  }
  
  /**
   * Validation spécifique pour les tâches d'extraction
   */
  private validateExtractionResponse(response: AIResponse): boolean {
    const content = response.content
    
    // Doit contenir des éléments structurés
    const hasStructure = 
      content.includes('•') ||
      content.includes('-') ||
      content.includes('\n') ||
      content.match(/\d+\./) ||
      content.includes(':')
    
    return hasStructure && content.length > 50
  }
  
  /**
   * Validation spécifique pour les calculs
   */
  private validateCalculationResponse(response: AIResponse): boolean {
    const content = response.content
    
    // Doit contenir des nombres ou des montants
    const hasNumbers = /\d+/.test(content)
    const hasCurrency = /€|\$|euros?|dollars?/.test(content)
    
    return hasNumbers || hasCurrency
  }
  
  /**
   * Vérification si un modèle est temporairement bloqué
   */
  private isModelTemporarilyBlocked(modelName: ModelName): boolean {
    const errors = this.failedModels.get(modelName) || []
    
    // Bloquer si plus de 5 échecs dans les 5 dernières minutes
    const recentErrors = errors.filter(
      error => Date.now() - error.timestamp.getTime() < 5 * 60 * 1000
    )
    
    return recentErrors.length > 5
  }
  
  /**
   * Enregistrement d'un échec
   */
  private async recordFailure(error: ModelError): Promise<void> {
    if (!this.failedModels.has(error.model)) {
      this.failedModels.set(error.model, [])
    }
    
    const errors = this.failedModels.get(error.model)!
    errors.push(error)
    
    // Garder seulement les 100 dernières erreurs
    if (errors.length > 100) {
      errors.splice(0, errors.length - 100)
    }
    
    // Log pour monitoring
    console.warn(`Fallback: Échec modèle ${error.model}`, {
      error: error.error.message,
      retryCount: error.retryCount,
      timestamp: error.timestamp
    })
    
    // Notification d'alerte si trop d'échecs
    if (this.isModelTemporarilyBlocked(error.model)) {
      console.error(`ALERTE: Modèle ${error.model} temporairement bloqué après échecs répétés`)
    }
  }
  
  /**
   * Enregistrement d'un succès
   */
  private recordSuccess(modelName: ModelName): void {
    // Nettoyer les erreurs anciennes en cas de succès
    const errors = this.failedModels.get(modelName) || []
    const recentErrors = errors.filter(
      error => Date.now() - error.timestamp.getTime() < 10 * 60 * 1000 // 10 minutes
    )
    
    if (recentErrors.length !== errors.length) {
      this.failedModels.set(modelName, recentErrors)
    }
  }
  
  /**
   * Gestion des compteurs de retry
   */
  private getRetryCount(key: string): number {
    return this.retryCounters.get(key) || 0
  }
  
  private incrementRetryCounter(key: string): void {
    const current = this.getRetryCount(key)
    this.retryCounters.set(key, current + 1)
  }
  
  private clearRetryCounter(key: string): void {
    this.retryCounters.delete(key)
  }
  
  /**
   * Attente avant retry avec backoff exponentiel
   */
  private async waitBeforeRetry(attemptNumber: number): Promise<void> {
    const baseDelay = 1000 // 1 seconde
    const delay = baseDelay * Math.pow(2, attemptNumber) + Math.random() * 1000
    
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  
  /**
   * Obtenir les statistiques d'échec par modèle
   */
  getFailureStats(): Record<ModelName, {
    totalFailures: number
    recentFailures: number
    isBlocked: boolean
    lastFailure?: Date
  }> {
    const stats: any = {}
    
    for (const [modelName, errors] of this.failedModels.entries()) {
      const recentErrors = errors.filter(
        error => Date.now() - error.timestamp.getTime() < 60 * 60 * 1000 // 1 heure
      )
      
      stats[modelName] = {
        totalFailures: errors.length,
        recentFailures: recentErrors.length,
        isBlocked: this.isModelTemporarilyBlocked(modelName),
        lastFailure: errors.length > 0 ? errors[errors.length - 1].timestamp : undefined
      }
    }
    
    return stats
  }
  
  /**
   * Réinitialisation des stats d'un modèle
   */
  resetModelStats(modelName: ModelName): void {
    this.failedModels.delete(modelName)
    
    // Nettoyer les compteurs de retry associés
    for (const [key, _] of this.retryCounters.entries()) {
      if (key.startsWith(modelName)) {
        this.retryCounters.delete(key)
      }
    }
  }
  
  /**
   * Vérification de santé des modèles
   */
  async healthCheck(): Promise<Record<ModelName, 'healthy' | 'degraded' | 'unhealthy'>> {
    const health: any = {}
    const stats = this.getFailureStats()
    
    for (const modelName of Object.keys(stats) as ModelName[]) {
      const modelStats = stats[modelName]
      
      if (modelStats.isBlocked) {
        health[modelName] = 'unhealthy'
      } else if (modelStats.recentFailures > 2) {
        health[modelName] = 'degraded'
      } else {
        health[modelName] = 'healthy'
      }
    }
    
    return health
  }
  
  /**
   * Nettoyage périodique des données
   */
  cleanup(): void {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 heures
    
    // Nettoyer les erreurs anciennes
    for (const [modelName, errors] of this.failedModels.entries()) {
      const recentErrors = errors.filter(
        error => now - error.timestamp.getTime() < maxAge
      )
      
      if (recentErrors.length === 0) {
        this.failedModels.delete(modelName)
      } else {
        this.failedModels.set(modelName, recentErrors)
      }
    }
    
    // Nettoyer les compteurs de retry anciens
    for (const [key, _] of this.retryCounters.entries()) {
      // Supprimer les compteurs non utilisés depuis 1 heure
      // (approximation basée sur l'absence d'activité récente)
      if (Math.random() < 0.1) { // 10% de chance de nettoyage
        this.retryCounters.delete(key)
      }
    }
  }
  
  /**
   * Configuration du circuit breaker par modèle
   */
  configureCircuitBreaker(modelName: ModelName, config: {
    maxFailures: number
    timeWindowMs: number
    recoveryTimeMs: number
  }): void {
    // Implémentation future du circuit breaker plus sophistiqué
    // Pour l'instant, utilise la logique de blocage temporaire existante
  }
}