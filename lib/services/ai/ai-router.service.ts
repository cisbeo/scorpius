import { 
  AIRequest, 
  AIResponse, 
  ContextAnalysis,
  RoutingDecision,
  ModelName,
  UrgencyLevel,
  UserPreferences,
  RouterConfig,
  RouterError,
  AllModelsFailed
} from './types'

import { ContextAnalyzerService } from './context-analyzer.service'
import { RoutingEngineService } from './routing-engine.service'
import { FallbackHandlerService } from './fallback-handler.service'
import { PerformanceMonitorService } from './performance-monitor.service'

/**
 * Service principal de routage IA multi-modèle
 * Orchestrateur central pour l'optimisation intelligente des requêtes IA
 */
export class AIRouterService {
  
  private contextAnalyzer: ContextAnalyzerService
  private routingEngine: RoutingEngineService
  private fallbackHandler: FallbackHandlerService
  private performanceMonitor: PerformanceMonitorService
  private config: RouterConfig
  
  // Cache pour optimiser les décisions répétitives
  private decisionCache: Map<string, RoutingDecision> = new Map()
  private readonly cacheMaxSize = 1000
  private readonly cacheTTL = 5 * 60 * 1000 // 5 minutes
  
  constructor(config: RouterConfig) {
    this.config = config
    this.contextAnalyzer = new ContextAnalyzerService()
    this.routingEngine = new RoutingEngineService(config)
    this.fallbackHandler = new FallbackHandlerService()
    this.performanceMonitor = new PerformanceMonitorService()
    
    // Nettoyage périodique du cache
    setInterval(() => this.cleanupCache(), 60 * 1000) // 1 minute
  }
  
  /**
   * Point d'entrée principal : router une requête IA
   */
  async routeRequest(
    content: string,
    urgency: UrgencyLevel = 'balanced',
    preferences?: UserPreferences,
    metadata?: Record<string, any>
  ): Promise<AIResponse> {
    
    const startTime = Date.now()
    
    try {
      // 1. Analyser le contexte
      const context = await this.contextAnalyzer.analyzeContext(
        content, 
        urgency, 
        metadata
      )
      
      // 2. Construire la requête
      const request: AIRequest = {
        content,
        context,
        preferences
      }
      
      // 3. Vérifier le cache
      const cacheKey = this.generateCacheKey(request)
      const cachedDecision = this.getCachedDecision(cacheKey)
      
      let decision: RoutingDecision
      if (cachedDecision && this.isCacheValid(cacheKey)) {
        decision = cachedDecision
      } else {
        // 4. Prendre décision de routage
        decision = await this.routingEngine.makeRoutingDecision(context, preferences)
        
        // 5. Mettre en cache si approprié
        if (this.shouldCache(context)) {
          this.cacheDecision(cacheKey, decision)
        }
      }
      
      // 6. Exécuter avec fallback
      const response = await this.fallbackHandler.executeWithFallback(
        request,
        decision,
        this.executeModelRequest.bind(this)
      )
      
      // 7. Enrichir la réponse avec métadonnées
      const enrichedResponse = this.enrichResponse(response, decision, startTime)
      
      // 8. Enregistrer métriques
      await this.performanceMonitor.recordMetrics(request, enrichedResponse, decision)
      
      return enrichedResponse
      
    } catch (error) {
      // Gestion d'erreur avec métriques
      await this.handleError(error as Error, content, urgency)
      throw error
    }
  }
  
  /**
   * Exécution d'une requête sur un modèle spécifique
   */
  private async executeModelRequest(
    model: ModelName,
    request: AIRequest,
    params: any
  ): Promise<AIResponse> {
    
    const startTime = Date.now()
    
    try {
      let response: AIResponse
      
      // Router vers le service approprié selon le modèle
      switch (model) {
        case 'claude-3.5-sonnet':
        case 'claude-3-haiku':
          response = await this.executeClaude(model, request, params)
          break
          
        case 'gpt-4o':
        case 'gpt-4-turbo':
          response = await this.executeOpenAI(model, request, params)
          break
          
        case 'voyage-large-2-instruct':
        case 'text-embedding-3-large':
          response = await this.executeEmbedding(model, request, params)
          break
          
        default:
          throw new RouterError(`Modèle non supporté: ${model}`, 'UNSUPPORTED_MODEL', model)
      }
      
      // Enrichir avec informations de base
      response.model = model
      response.processingTime = Date.now() - startTime
      
      return response
      
    } catch (error) {
      throw new RouterError(
        `Erreur exécution ${model}: ${(error as Error).message}`,
        'EXECUTION_ERROR',
        model,
        error as Error
      )
    }
  }
  
  /**
   * Exécution sur modèles Claude
   */
  private async executeClaude(
    model: ModelName,
    request: AIRequest,
    params: any
  ): Promise<AIResponse> {
    
    // Import dynamique pour éviter les dépendances circulaires
    const { ClaudeAnalysisService } = await import('./claude-analysis.service')
    const claudeService = new ClaudeAnalysisService()
    
    const claudeRequest = {
      prompt: request.content,
      model: model as 'claude-3.5-sonnet' | 'claude-3-haiku',
      maxTokens: params.maxTokens,
      temperature: params.temperature,
      system: this.generateSystemPrompt(request.context),
      conversationHistory: request.conversationHistory
    }
    
    if (model === 'claude-3-haiku') {
      return await claudeService.quickResponse(claudeRequest)
    } else {
      return await claudeService.detailedAnalysis(claudeRequest)
    }
  }
  
  /**
   * Exécution sur modèles OpenAI
   */
  private async executeOpenAI(
    model: ModelName,
    request: AIRequest,
    params: any
  ): Promise<AIResponse> {
    
    const { OpenAIFallbackService } = await import('./openai-fallback.service')
    const openaiService = new OpenAIFallbackService()
    
    return await openaiService.execute({
      model: model as 'gpt-4o' | 'gpt-4-turbo',
      prompt: request.content,
      maxTokens: params.maxTokens,
      temperature: params.temperature,
      functions: request.functions
    })
  }
  
  /**
   * Exécution pour embeddings
   */
  private async executeEmbedding(
    model: ModelName,
    request: AIRequest,
    params: any
  ): Promise<AIResponse> {
    
    const { VoyageEmbeddingsService } = await import('./voyage-embeddings.service')
    const voyageService = new VoyageEmbeddingsService()
    
    if (model === 'voyage-large-2-instruct') {
      return await voyageService.generateEmbeddings(request.content)
    } else {
      // Fallback OpenAI embeddings
      const { OpenAIFallbackService } = await import('./openai-fallback.service')
      const openaiService = new OpenAIFallbackService()
      return await openaiService.generateEmbeddings(request.content)
    }
  }
  
  /**
   * Génération du prompt système adapté au contexte
   */
  private generateSystemPrompt(context: ContextAnalysis): string {
    let systemPrompt = `Tu es un assistant IA expert spécialisé en marchés publics français.`
    
    // Spécialisation selon le type de tâche
    switch (context.taskType) {
      case 'CLASSIFY':
        systemPrompt += ` Ta tâche est de classifier avec précision les documents DCE français (CCTP, CCP, BPU, RC).`
        break
      case 'EXTRACT':
        systemPrompt += ` Tu dois extraire et structurer les informations techniques et contractuelles des documents français.`
        break
      case 'ANALYZE':
        systemPrompt += ` Fournis des analyses expertes et des recommandations stratégiques pour les appels d'offres.`
        break
      case 'CALCULATE':
        systemPrompt += ` Effectue des calculs précis de coûts et d'estimations pour les prestations IT.`
        break
    }
    
    // Adaptation à la complexité
    if (context.complexity >= 8) {
      systemPrompt += ` Le contexte est très complexe, sois particulièrement rigoureux et détaillé.`
    }
    
    // Optimisation française
    if (context.languageOptimization === 'french') {
      systemPrompt += ` Utilise une terminologie française précise et spécialisée.`
    }
    
    return systemPrompt
  }
  
  /**
   * Enrichissement de la réponse avec métadonnées
   */
  private enrichResponse(
    response: AIResponse,
    decision: RoutingDecision,
    startTime: number
  ): AIResponse {
    
    return {
      ...response,
      metadata: {
        ...response.metadata,
        routingDecision: decision.selectedModel,
        decisionReasoning: decision.reasoning,
        decisionConfidence: decision.decisionConfidence,
        totalProcessingTime: Date.now() - startTime,
        cacheHit: response.metadata?.cacheHit || false
      }
    }
  }
  
  /**
   * Gestion d'erreur centralisée
   */
  private async handleError(
    error: Error,
    content: string,
    urgency: UrgencyLevel
  ): Promise<void> {
    
    // Log structuré pour monitoring
    console.error('Erreur Router IA:', {
      error: error.message,
      contentLength: content.length,
      urgency,
      timestamp: new Date().toISOString()
    })
    
    // Métriques d'erreur
    // Note: Implémentation future du système de métriques d'erreur
  }
  
  // === GESTION DU CACHE ===
  
  /**
   * Génération de clé de cache
   */
  private generateCacheKey(request: AIRequest): string {
    // Hash simple basé sur contenu + contexte critique
    const keyData = {
      content: request.content.substring(0, 100), // Premier 100 chars
      taskType: request.context.taskType,
      complexity: Math.floor(request.context.complexity), // Arrondi
      urgency: request.context.urgency,
      languageOpt: request.context.languageOptimization
    }
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64').substring(0, 50)
  }
  
  /**
   * Vérification validité cache
   */
  private isCacheValid(key: string): boolean {
    const entry = this.decisionCache.get(key)
    if (!entry) return false
    
    // Vérifier TTL (implémentation simplifiée)
    return true // Pour l'instant, on fait confiance au nettoyage périodique
  }
  
  /**
   * Récupération décision cachée
   */
  private getCachedDecision(key: string): RoutingDecision | null {
    return this.decisionCache.get(key) || null
  }
  
  /**
   * Mise en cache d'une décision
   */
  private cacheDecision(key: string, decision: RoutingDecision): void {
    if (this.decisionCache.size >= this.cacheMaxSize) {
      // Supprimer les entrées les plus anciennes (stratégie FIFO simple)
      const firstKey = this.decisionCache.keys().next().value
      this.decisionCache.delete(firstKey)
    }
    
    this.decisionCache.set(key, decision)
  }
  
  /**
   * Détermine si une décision doit être cachée
   */
  private shouldCache(context: ContextAnalysis): boolean {
    // Ne pas cacher les requêtes très complexes ou uniques
    return context.complexity <= 7 && 
           context.contentSize < 5000 &&
           context.taskType !== 'GENERATE' // Génération souvent unique
  }
  
  /**
   * Nettoyage périodique du cache
   */
  private cleanupCache(): void {
    // Implémentation simple : vider complètement si trop vieux
    // Dans une vraie implémentation, on garderait les timestamps
    if (this.decisionCache.size > this.cacheMaxSize * 0.8) {
      this.decisionCache.clear()
    }
  }
  
  // === MÉTHODES PUBLIQUES D'ADMINISTRATION ===
  
  /**
   * Statistiques du router
   */
  getStats(): {
    performance: any
    costs: any
    health: any
    cache: any
  } {
    return {
      performance: this.performanceMonitor.getCurrentMetrics(),
      costs: this.performanceMonitor.getDashboardData().overview,
      health: this.fallbackHandler.getFailureStats(),
      cache: {
        size: this.decisionCache.size,
        maxSize: this.cacheMaxSize,
        hitRate: 0 // À implémenter
      }
    }
  }
  
  /**
   * Recommandations d'optimisation
   */
  getOptimizationRecommendations(): any[] {
    return this.performanceMonitor.getOptimizationRecommendations()
  }
  
  /**
   * Configuration dynamique
   */
  updateConfig(newConfig: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Recréer le routing engine avec la nouvelle config
    this.routingEngine = new RoutingEngineService(this.config)
    
    // Vider le cache pour forcer re-évaluation
    this.decisionCache.clear()
  }
  
  /**
   * Health check complet
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    details: any
  }> {
    
    const performanceMetrics = this.performanceMonitor.getCurrentMetrics()
    const fallbackStats = this.fallbackHandler.getFailureStats()
    const modelHealth = await this.fallbackHandler.healthCheck()
    
    // Déterminer le statut global
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (performanceMetrics.fallbackRate > 0.2 || performanceMetrics.avgResponseTime > 8000) {
      status = 'degraded'
    }
    
    if (performanceMetrics.successRate < 0.8 || Object.values(modelHealth).includes('unhealthy')) {
      status = 'unhealthy'
    }
    
    return {
      status,
      details: {
        performance: performanceMetrics,
        fallbacks: fallbackStats,
        models: modelHealth,
        cache: {
          size: this.decisionCache.size,
          utilization: this.decisionCache.size / this.cacheMaxSize
        }
      }
    }
  }
  
  /**
   * Reset complet du router
   */
  reset(): void {
    this.decisionCache.clear()
    // Reset des autres composants si nécessaire
  }
}