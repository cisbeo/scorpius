/**
 * Point d'entrée principal pour les services IA multi-modèle
 * Export centralisé de tous les composants du router IA
 */

// Services principaux
export { AIRouterService } from './ai-router.service'
export { ContextAnalyzerService } from './context-analyzer.service'
export { RoutingEngineService } from './routing-engine.service'
export { FallbackHandlerService } from './fallback-handler.service'
export { PerformanceMonitorService } from './performance-monitor.service'

// Types et interfaces
export * from './types'

// Configuration par défaut
export const DEFAULT_ROUTER_CONFIG = {
  complexityThresholds: {
    simple: 3,
    moderate: 6,
    complex: 8
  },
  
  scoringWeights: {
    cost: 0.2,
    speed: 0.25,
    quality: 0.3,
    availability: 0.15,
    taskFit: 0.1
  },
  
  fallbackConfig: {
    enableFallback: true,
    maxRetries: 3,
    timeoutMs: 10000
  },
  
  cacheConfig: {
    enableCache: true,
    ttlSeconds: 300, // 5 minutes
    maxSize: 1000
  },
  
  monitoringConfig: {
    enableMetrics: true,
    sampleRate: 1.0, // 100% sampling
    alertThresholds: {
      responseTime: 15000, // 15 secondes
      errorRate: 0.1,      // 10%
      costPerHour: 50      // 50€/heure
    }
  }
}

/**
 * Factory pour créer une instance configurée du router IA
 */
export function createAIRouter(config = DEFAULT_ROUTER_CONFIG) {
  return new AIRouterService(config)
}

/**
 * Instance singleton du router IA pour l'application
 */
let routerInstance: AIRouterService | null = null

export function getAIRouter(): AIRouterService {
  if (!routerInstance) {
    routerInstance = createAIRouter()
  }
  return routerInstance
}

/**
 * Configuration et initialisation du router pour l'application
 */
export function initializeAIRouter(config = DEFAULT_ROUTER_CONFIG): AIRouterService {
  routerInstance = createAIRouter(config)
  return routerInstance
}

/**
 * Types de réponse simplifiés pour l'usage en app
 */
export interface SimpleAIRequest {
  content: string
  urgency?: 'fast' | 'balanced' | 'quality'
  taskHint?: 'classify' | 'extract' | 'analyze' | 'calculate' | 'chat'
  metadata?: Record<string, any>
}

/**
 * Helper function pour simplifier l'utilisation du router
 */
export async function queryAI(request: SimpleAIRequest): Promise<AIResponse> {
  const router = getAIRouter()
  
  // Mapper le taskHint vers TaskType
  const taskTypeMap = {
    classify: 'CLASSIFY' as const,
    extract: 'EXTRACT' as const,
    analyze: 'ANALYZE' as const,
    calculate: 'CALCULATE' as const,
    chat: 'ANALYZE' as const // Chat = analyse conversationnelle
  }
  
  return await router.routeRequest(
    request.content,
    request.urgency || 'balanced',
    undefined, // preferences
    {
      ...request.metadata,
      taskHint: request.taskHint ? taskTypeMap[request.taskHint] : undefined
    }
  )
}

/**
 * Helper spécialisé pour l'analyse DCE
 */
export async function analyzeDCE(
  content: string,
  documentType?: 'CCTP' | 'CCP' | 'BPU' | 'RC'
): Promise<AIResponse> {
  return await queryAI({
    content,
    urgency: 'quality', // Privilégier la qualité pour l'analyse DCE
    taskHint: 'analyze',
    metadata: {
      documentType,
      specialization: 'french_public_tenders'
    }
  })
}

/**
 * Helper pour la classification de documents
 */
export async function classifyDocument(content: string): Promise<AIResponse> {
  return await queryAI({
    content,
    urgency: 'fast', // Classification peut être rapide
    taskHint: 'classify',
    metadata: {
      documentClassification: true
    }
  })
}

/**
 * Helper pour les calculs de prix
 */
export async function calculatePricing(
  requirements: string,
  serviceContext?: any
): Promise<AIResponse> {
  return await queryAI({
    content: requirements,
    urgency: 'balanced',
    taskHint: 'calculate',
    metadata: {
      pricingCalculation: true,
      serviceContext
    }
  })
}

/**
 * Helper pour le chat conversationnel
 */
export async function chatWithDCE(
  question: string,
  dceContext: any,
  conversationHistory?: any[]
): Promise<AIResponse> {
  return await queryAI({
    content: question,
    urgency: 'balanced',
    taskHint: 'chat',
    metadata: {
      dceContext,
      conversationHistory,
      conversationalMode: true
    }
  })
}

/**
 * Métriques et monitoring simplifiés
 */
export function getAIMetrics() {
  const router = getAIRouter()
  return router.getStats()
}

export function getAIHealth() {
  const router = getAIRouter()
  return router.healthCheck()
}

export function getAIRecommendations() {
  const router = getAIRouter()
  return router.getOptimizationRecommendations()
}