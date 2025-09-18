// Types et interfaces pour le système de router IA multi-modèle

export type TaskType = 
  | 'CLASSIFY'    // Classification de documents (CCTP, CCP, BPU)
  | 'EXTRACT'     // Extraction d'informations structurées
  | 'GENERATE'    // Génération de réponses/contenus
  | 'CALCULATE'   // Calculs de prix et estimations
  | 'EMBED'       // Création d'embeddings pour recherche
  | 'ANALYZE'     // Analyse complexe de contexte DCE

export type UrgencyLevel = 'fast' | 'balanced' | 'quality'

export type ModelName = 
  | 'claude-3-haiku'
  | 'claude-3.5-sonnet' 
  | 'gpt-4o'
  | 'gpt-4-turbo'
  | 'voyage-large-2-instruct'
  | 'text-embedding-3-large'

export interface ContextAnalysis {
  // Complexité de la requête (1-10)
  complexity: number
  
  // Taille estimée du contenu en tokens
  contentSize: number
  
  // Type de tâche à effectuer
  taskType: TaskType
  
  // Niveau d'urgence souhaité
  urgency: UrgencyLevel
  
  // Budget maximum en euros pour cette requête
  costBudget: number
  
  // Optimisation pour le français
  languageOptimization: 'french' | 'general'
  
  // Métadonnées contextuelles
  metadata?: {
    documentType?: string
    organizationId?: string
    userId?: string
    sessionId?: string
  }
}

export interface AIRequest {
  // Contenu principal de la requête
  content: string
  
  // Contexte analysé
  context: ContextAnalysis
  
  // Préférences utilisateur
  preferences?: UserPreferences
  
  // Messages de conversation précédents
  conversationHistory?: ChatMessage[]
  
  // Fonctions disponibles pour le modèle
  functions?: AIFunction[]
}

export interface AIResponse {
  // Contenu de la réponse
  content: string
  
  // Modèle utilisé pour générer la réponse
  model: ModelName
  
  // Temps de traitement en millisecondes
  processingTime: number
  
  // Coût de la requête en euros
  cost: number
  
  // Niveau de confiance de la réponse (0-1)
  confidence: number
  
  // Sources documentaires utilisées
  sources?: DocumentSource[]
  
  // Tokens utilisés
  tokensUsed?: {
    input: number
    output: number
    total: number
  }
  
  // Métadonnées de la réponse
  metadata?: {
    fallbackUsed?: boolean
    fallbackReason?: string
    cacheHit?: boolean
  }
}

export interface RoutingDecision {
  // Modèle sélectionné
  selectedModel: ModelName
  
  // Explication du choix
  reasoning: string
  
  // Chaîne de fallback
  fallbackChain: ModelName[]
  
  // Coût estimé
  estimatedCost: number
  
  // Temps estimé
  estimatedTime: number
  
  // Score de confiance dans la décision
  decisionConfidence: number
  
  // Paramètres du modèle
  modelParams: {
    maxTokens?: number
    temperature?: number
    topP?: number
    presencePenalty?: number
    frequencyPenalty?: number
  }
}

export interface ModelCapabilities {
  name: ModelName
  
  // Capacités du modèle
  capabilities: {
    maxTokens: number
    supportsFunction: boolean
    supportsFrench: boolean
    supportsStructuredOutput: boolean
  }
  
  // Métriques de performance
  performance: {
    avgResponseTime: number  // millisecondes
    costPerToken: number     // euros
    qualityScore: number     // 0-1
    frenchAccuracy: number   // 0-1
  }
  
  // Disponibilité
  availability: {
    isAvailable: boolean
    rateLimit: number        // requêtes par minute
    currentLoad: number      // 0-1
  }
  
  // Cas d'usage optimaux
  optimalFor: TaskType[]
}

export interface UserPreferences {
  // Priorité utilisateur
  priority: 'cost' | 'speed' | 'quality' | 'balanced'
  
  // Modèles préférés
  preferredModels?: ModelName[]
  
  // Modèles à éviter
  excludedModels?: ModelName[]
  
  // Limite de coût par requête
  maxCostPerRequest?: number
  
  // Temps maximum acceptable
  maxResponseTime?: number
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: ModelName
}

export interface AIFunction {
  name: string
  description: string
  parameters: Record<string, any>
}

export interface DocumentSource {
  fileName: string
  pageNumber?: number
  section?: string
  relevance: number
  content: string
}

export interface PerformanceMetrics {
  // Métriques temporelles
  requestCount: number
  avgResponseTime: number
  p95ResponseTime: number
  
  // Métriques de coût
  totalCost: number
  avgCostPerRequest: number
  costByModel: Record<ModelName, number>
  
  // Métriques de qualité
  avgConfidence: number
  successRate: number
  fallbackRate: number
  
  // Métriques par modèle
  modelUsage: Record<ModelName, {
    requests: number
    avgTime: number
    avgCost: number
    successRate: number
  }>
  
  // Période de mesure
  period: {
    start: Date
    end: Date
  }
}

export interface RouterConfig {
  // Seuils de complexité
  complexityThresholds: {
    simple: number      // <= 3
    moderate: number    // 4-6  
    complex: number     // >= 7
  }
  
  // Poids pour le scoring
  scoringWeights: {
    cost: number
    speed: number
    quality: number
    availability: number
  }
  
  // Configuration des fallbacks
  fallbackConfig: {
    enableFallback: boolean
    maxRetries: number
    timeoutMs: number
  }
  
  // Cache configuration
  cacheConfig: {
    enableCache: boolean
    ttlSeconds: number
    maxSize: number
  }
  
  // Monitoring
  monitoringConfig: {
    enableMetrics: boolean
    sampleRate: number
    alertThresholds: {
      responseTime: number
      errorRate: number
      costPerHour: number
    }
  }
}

export interface CacheEntry {
  key: string
  response: AIResponse
  timestamp: Date
  ttl: number
  hitCount: number
}

export interface ModelError {
  model: ModelName
  error: Error
  timestamp: Date
  requestContext: Partial<AIRequest>
  retryCount: number
}

// Types d'erreur spécifiques
export class RouterError extends Error {
  constructor(
    message: string,
    public code: string,
    public model?: ModelName,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'RouterError'
  }
}

export class ModelUnavailableError extends RouterError {
  constructor(model: ModelName, originalError?: Error) {
    super(`Model ${model} is currently unavailable`, 'MODEL_UNAVAILABLE', model, originalError)
  }
}

export class AllModelsFailed extends RouterError {
  constructor(attemptedModels: ModelName[]) {
    super(`All models failed: ${attemptedModels.join(', ')}`, 'ALL_MODELS_FAILED')
  }
}

export class BudgetExceededError extends RouterError {
  constructor(requestedCost: number, budget: number) {
    super(`Request cost ${requestedCost}€ exceeds budget ${budget}€`, 'BUDGET_EXCEEDED')
  }
}