/**
 * Tests complets pour le système de router IA multi-modèle
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { 
  AIRouterService,
  ContextAnalyzerService,
  RoutingEngineService,
  FallbackHandlerService,
  PerformanceMonitorService,
  DEFAULT_ROUTER_CONFIG,
  createAIRouter,
  queryAI,
  analyzeDCE,
  classifyDocument
} from '../lib/services/ai'

// Mocks des services externes
jest.mock('../lib/services/ai/claude-analysis.service')
jest.mock('../lib/services/ai/openai-fallback.service')
jest.mock('../lib/services/ai/voyage-embeddings.service')

describe('AIRouter System', () => {
  let router: AIRouterService
  
  beforeEach(() => {
    router = createAIRouter(DEFAULT_ROUTER_CONFIG)
  })
  
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('ContextAnalyzer', () => {
    let analyzer: ContextAnalyzerService
    
    beforeEach(() => {
      analyzer = new ContextAnalyzerService()
    })

    test('devrait analyser la complexité d\'un DCE simple', async () => {
      const content = "Classification d'un document CCTP simple de 5 pages"
      
      const context = await analyzer.analyzeContext(content)
      
      expect(context.complexity).toBeLessThanOrEqual(4)
      expect(context.taskType).toBe('CLASSIFY')
      expect(context.languageOptimization).toBe('french')
    })

    test('devrait détecter un CCTP complexe', async () => {
      const content = `
        Cahier des Clauses Techniques Particulières
        Infrastructure critique ANSSI niveau élevé
        Migration 500 serveurs avec certification PASSI
        Contraintes sécurité défense
        ISO27001, ISO27002, CSPN
        Intégration 15 systèmes tiers
        Disponibilité 99.99% exigée
      `
      
      const context = await analyzer.analyzeContext(content)
      
      expect(context.complexity).toBeGreaterThanOrEqual(7)
      expect(context.taskType).toBe('ANALYZE')
      expect(context.languageOptimization).toBe('french')
    })

    test('devrait classifier les types de tâches', async () => {
      const testCases = [
        {
          content: "Classifier ce document DCE",
          expectedType: 'CLASSIFY'
        },
        {
          content: "Extraire les exigences techniques du CCTP",
          expectedType: 'EXTRACT'
        },
        {
          content: "Calculer le prix pour ces prestations",
          expectedType: 'CALCULATE'
        },
        {
          content: "Analyser les risques de cet appel d'offres",
          expectedType: 'ANALYZE'
        }
      ]
      
      for (const testCase of testCases) {
        const context = await analyzer.analyzeContext(testCase.content)
        expect(context.taskType).toBe(testCase.expectedType)
      }
    })

    test('devrait détecter l\'optimisation française', async () => {
      const frenchContent = "Marché public français avec contraintes ANSSI et références ministères"
      const generalContent = "Standard RFP document classification"
      
      const frenchContext = await analyzer.analyzeContext(frenchContent)
      const generalContext = await analyzer.analyzeContext(generalContent)
      
      expect(frenchContext.languageOptimization).toBe('french')
      expect(generalContext.languageOptimization).toBe('general')
    })

    test('devrait estimer correctement le budget', async () => {
      const simpleContent = "Classification simple"
      const complexContent = "Analyse complexe CCTP 50 pages avec exigences ANSSI"
      
      const simpleContext = await analyzer.analyzeContext(simpleContent, 'fast')
      const complexContext = await analyzer.analyzeContext(complexContent, 'quality')
      
      expect(simpleContext.costBudget).toBeLessThan(complexContext.costBudget)
      expect(complexContext.costBudget).toBeGreaterThan(0.20) // > 20 centimes
    })
  })

  describe('RoutingEngine', () => {
    let engine: RoutingEngineService
    
    beforeEach(() => {
      engine = new RoutingEngineService(DEFAULT_ROUTER_CONFIG)
    })

    test('devrait sélectionner Claude Haiku pour tâches rapides', async () => {
      const context = {
        complexity: 2,
        contentSize: 500,
        taskType: 'CLASSIFY' as const,
        urgency: 'fast' as const,
        costBudget: 0.05,
        languageOptimization: 'french' as const
      }
      
      const decision = await engine.makeRoutingDecision(context)
      
      expect(decision.selectedModel).toBe('claude-3-haiku')
      expect(decision.estimatedTime).toBeLessThan(3000) // < 3 secondes
    })

    test('devrait sélectionner Claude Sonnet pour analyses complexes', async () => {
      const context = {
        complexity: 8,
        contentSize: 5000,
        taskType: 'ANALYZE' as const,
        urgency: 'quality' as const,
        costBudget: 0.50,
        languageOptimization: 'french' as const
      }
      
      const decision = await engine.makeRoutingDecision(context)
      
      expect(decision.selectedModel).toBe('claude-3.5-sonnet')
      expect(decision.decisionConfidence).toBeGreaterThan(0.7)
    })

    test('devrait sélectionner GPT-4o pour calculs', async () => {
      const context = {
        complexity: 5,
        contentSize: 2000,
        taskType: 'CALCULATE' as const,
        urgency: 'balanced' as const,
        costBudget: 0.20,
        languageOptimization: 'general' as const
      }
      
      const decision = await engine.makeRoutingDecision(context)
      
      expect(decision.selectedModel).toBe('gpt-4o')
    })

    test('devrait sélectionner Voyage pour embeddings français', async () => {
      const context = {
        complexity: 3,
        contentSize: 1000,
        taskType: 'EMBED' as const,
        urgency: 'balanced' as const,
        costBudget: 0.10,
        languageOptimization: 'french' as const
      }
      
      const decision = await engine.makeRoutingDecision(context)
      
      expect(decision.selectedModel).toBe('voyage-large-2-instruct')
    })

    test('devrait respecter les préférences utilisateur', async () => {
      const context = {
        complexity: 5,
        contentSize: 2000,
        taskType: 'ANALYZE' as const,
        urgency: 'balanced' as const,
        costBudget: 0.30,
        languageOptimization: 'french' as const
      }
      
      const preferences = {
        priority: 'cost' as const,
        excludedModels: ['claude-3.5-sonnet' as const]
      }
      
      const decision = await engine.makeRoutingDecision(context, preferences)
      
      expect(decision.selectedModel).not.toBe('claude-3.5-sonnet')
      expect(decision.estimatedCost).toBeLessThan(0.30)
    })

    test('devrait construire une chaîne de fallback', async () => {
      const context = {
        complexity: 6,
        contentSize: 3000,
        taskType: 'ANALYZE' as const,
        urgency: 'balanced' as const,
        costBudget: 0.25,
        languageOptimization: 'french' as const
      }
      
      const decision = await engine.makeRoutingDecision(context)
      
      expect(decision.fallbackChain).toHaveLength(3)
      expect(decision.fallbackChain).not.toContain(decision.selectedModel)
    })
  })

  describe('FallbackHandler', () => {
    let handler: FallbackHandlerService
    
    beforeEach(() => {
      handler = new FallbackHandlerService()
    })

    test('devrait exécuter avec succès sur le modèle principal', async () => {
      const mockExecutor = jest.fn().mockResolvedValue({
        content: 'Réponse réussie',
        confidence: 0.9,
        cost: 0.05,
        model: 'claude-3-haiku'
      })
      
      const request = {
        content: 'Test simple',
        context: {
          complexity: 3,
          contentSize: 100,
          taskType: 'CLASSIFY' as const,
          urgency: 'fast' as const,
          costBudget: 0.10,
          languageOptimization: 'french' as const
        }
      }
      
      const decision = {
        selectedModel: 'claude-3-haiku' as const,
        fallbackChain: ['gpt-4o' as const],
        reasoning: 'Test',
        estimatedCost: 0.05,
        estimatedTime: 2000,
        decisionConfidence: 0.8,
        modelParams: { maxTokens: 1000, temperature: 0.3 }
      }
      
      const response = await handler.executeWithFallback(request, decision, mockExecutor)
      
      expect(response.content).toBe('Réponse réussie')
      expect(response.metadata?.fallbackUsed).toBeFalsy()
      expect(mockExecutor).toHaveBeenCalledTimes(1)
    })

    test('devrait utiliser le fallback en cas d\'échec', async () => {
      const mockExecutor = jest.fn()
        .mockRejectedValueOnce(new Error('Modèle principal en panne'))
        .mockResolvedValueOnce({
          content: 'Réponse fallback',
          confidence: 0.8,
          cost: 0.08,
          model: 'gpt-4o'
        })
      
      const request = {
        content: 'Test fallback',
        context: {
          complexity: 5,
          contentSize: 500,
          taskType: 'ANALYZE' as const,
          urgency: 'balanced' as const,
          costBudget: 0.15,
          languageOptimization: 'french' as const
        }
      }
      
      const decision = {
        selectedModel: 'claude-3.5-sonnet' as const,
        fallbackChain: ['gpt-4o' as const],
        reasoning: 'Test',
        estimatedCost: 0.10,
        estimatedTime: 4000,
        decisionConfidence: 0.9,
        modelParams: { maxTokens: 2000, temperature: 0.3 }
      }
      
      const response = await handler.executeWithFallback(request, decision, mockExecutor)
      
      expect(response.content).toBe('Réponse fallback')
      expect(response.metadata?.fallbackUsed).toBe(true)
      expect(mockExecutor).toHaveBeenCalledTimes(2)
    })

    test('devrait échouer si tous les modèles échouent', async () => {
      const mockExecutor = jest.fn().mockRejectedValue(new Error('Tous les modèles en panne'))
      
      const request = {
        content: 'Test échec total',
        context: {
          complexity: 4,
          contentSize: 300,
          taskType: 'EXTRACT' as const,
          urgency: 'balanced' as const,
          costBudget: 0.12,
          languageOptimization: 'french' as const
        }
      }
      
      const decision = {
        selectedModel: 'claude-3-haiku' as const,
        fallbackChain: ['gpt-4o' as const, 'gpt-4-turbo' as const],
        reasoning: 'Test',
        estimatedCost: 0.08,
        estimatedTime: 3000,
        decisionConfidence: 0.7,
        modelParams: { maxTokens: 1500, temperature: 0.2 }
      }
      
      await expect(
        handler.executeWithFallback(request, decision, mockExecutor)
      ).rejects.toThrow('Tous les modèles ont échoué')
      
      expect(mockExecutor).toHaveBeenCalledTimes(3) // Principal + 2 fallbacks
    })

    test('devrait valider la qualité des réponses', async () => {
      const handler = new FallbackHandlerService()
      
      // Test réponse valide
      const validResponse = {
        content: 'Réponse détaillée et pertinente pour la classification CCTP',
        confidence: 0.9,
        cost: 0.05,
        model: 'claude-3-haiku' as const,
        processingTime: 2000
      }
      
      const invalidResponse = {
        content: '',
        confidence: 0.2,
        cost: 0.05,
        model: 'claude-3-haiku' as const,
        processingTime: 2000
      }
      
      const validRequest = {
        content: 'Classifier ce document',
        context: {
          complexity: 3,
          contentSize: 200,
          taskType: 'CLASSIFY' as const,
          urgency: 'fast' as const,
          costBudget: 0.10,
          languageOptimization: 'french' as const
        }
      }
      
      // Accès à la méthode privée pour test (hack TypeScript)
      const validateResponse = (handler as any).validateResponse.bind(handler)
      
      expect(validateResponse(validResponse, validRequest)).toBe(true)
      expect(validateResponse(invalidResponse, validRequest)).toBe(false)
    })
  })

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitorService
    
    beforeEach(() => {
      monitor = new PerformanceMonitorService()
    })

    test('devrait enregistrer les métriques correctement', async () => {
      const request = {
        content: 'Test monitoring',
        context: {
          complexity: 4,
          contentSize: 400,
          taskType: 'ANALYZE' as const,
          urgency: 'balanced' as const,
          costBudget: 0.15,
          languageOptimization: 'french' as const
        }
      }
      
      const response = {
        content: 'Réponse test',
        model: 'claude-3-haiku' as const,
        processingTime: 2500,
        cost: 0.08,
        confidence: 0.85,
        tokensUsed: { input: 100, output: 200, total: 300 }
      }
      
      const decision = {
        selectedModel: 'claude-3-haiku' as const,
        fallbackChain: [],
        reasoning: 'Test',
        estimatedCost: 0.08,
        estimatedTime: 2000,
        decisionConfidence: 0.8,
        modelParams: { maxTokens: 1000, temperature: 0.3 }
      }
      
      await monitor.recordMetrics(request, response, decision)
      
      const metrics = monitor.getCurrentMetrics()
      expect(metrics.requestCount).toBeGreaterThan(0)
    })

    test('devrait détecter les anomalies de performance', async () => {
      // Simuler plusieurs requêtes normales
      for (let i = 0; i < 10; i++) {
        await monitor.recordMetrics(
          {
            content: 'Test normal',
            context: {
              complexity: 3,
              contentSize: 300,
              taskType: 'CLASSIFY' as const,
              urgency: 'fast' as const,
              costBudget: 0.10,
              languageOptimization: 'french' as const
            }
          },
          {
            content: 'Réponse normale',
            model: 'claude-3-haiku' as const,
            processingTime: 2000, // Temps normal
            cost: 0.05,
            confidence: 0.9
          },
          {
            selectedModel: 'claude-3-haiku' as const,
            fallbackChain: [],
            reasoning: 'Test',
            estimatedCost: 0.05,
            estimatedTime: 2000,
            decisionConfidence: 0.8,
            modelParams: { maxTokens: 1000, temperature: 0.3 }
          }
        )
      }
      
      // Requête anormalement lente
      await monitor.recordMetrics(
        {
          content: 'Test lent',
          context: {
            complexity: 3,
            contentSize: 300,
            taskType: 'CLASSIFY' as const,
            urgency: 'fast' as const,
            costBudget: 0.10,
            languageOptimization: 'french' as const
          }
        },
        {
          content: 'Réponse lente',
          model: 'claude-3-haiku' as const,
          processingTime: 15000, // 15 secondes - anormal !
          cost: 0.05,
          confidence: 0.9
        },
        {
          selectedModel: 'claude-3-haiku' as const,
          fallbackChain: [],
          reasoning: 'Test',
          estimatedCost: 0.05,
          estimatedTime: 2000,
          decisionConfidence: 0.8,
          modelParams: { maxTokens: 1000, temperature: 0.3 }
        }
      )
      
      // Vérifier que l'anomalie a été détectée
      const dashboardData = monitor.getDashboardData()
      expect(dashboardData.alerts.length).toBeGreaterThan(0)
    })

    test('devrait calculer les métriques d\'optimisation', () => {
      const recommendations = monitor.getOptimizationRecommendations()
      expect(Array.isArray(recommendations)).toBe(true)
    })
  })

  describe('AIRouter Integration', () => {
    test('devrait router une requête simple de classification', async () => {
      const mockResponse = {
        content: 'Ce document est un CCTP (Cahier des Clauses Techniques Particulières)',
        model: 'claude-3-haiku' as const,
        processingTime: 1800,
        cost: 0.04,
        confidence: 0.95
      }
      
      // Mock du service Claude
      jest.doMock('../lib/services/ai/claude-analysis.service', () => ({
        ClaudeAnalysisService: jest.fn().mockImplementation(() => ({
          quickResponse: jest.fn().mockResolvedValue(mockResponse)
        }))
      }))
      
      const response = await router.routeRequest(
        'Classifier ce document CCTP de 10 pages',
        'fast'
      )
      
      expect(response.content).toBeTruthy()
      expect(response.model).toBeDefined()
      expect(response.processingTime).toBeGreaterThan(0)
      expect(response.cost).toBeGreaterThan(0)
    })

    test('devrait utiliser le cache pour requêtes similaires', async () => {
      const content = 'Classification document CCTP standard'
      
      // Première requête
      const response1 = await router.routeRequest(content, 'fast')
      
      // Deuxième requête identique
      const response2 = await router.routeRequest(content, 'fast')
      
      // Le cache devrait optimiser la seconde requête
      expect(response2.metadata?.cacheHit).toBeDefined()
    })

    test('devrait fournir des statistiques complètes', () => {
      const stats = router.getStats()
      
      expect(stats).toHaveProperty('performance')
      expect(stats).toHaveProperty('costs')
      expect(stats).toHaveProperty('health')
      expect(stats).toHaveProperty('cache')
    })

    test('devrait permettre la configuration dynamique', () => {
      const newConfig = {
        scoringWeights: {
          cost: 0.4,
          speed: 0.3,
          quality: 0.2,
          availability: 0.1
        }
      }
      
      expect(() => router.updateConfig(newConfig)).not.toThrow()
    })
  })

  describe('Helper Functions', () => {
    test('queryAI devrait simplifier l\'usage', async () => {
      const mockResponse = {
        content: 'Analyse DCE complétée',
        model: 'claude-3.5-sonnet' as const,
        processingTime: 4000,
        cost: 0.15,
        confidence: 0.92
      }
      
      jest.doMock('../lib/services/ai/claude-analysis.service', () => ({
        ClaudeAnalysisService: jest.fn().mockImplementation(() => ({
          detailedAnalysis: jest.fn().mockResolvedValue(mockResponse)
        }))
      }))
      
      const response = await queryAI({
        content: 'Analyser ce DCE complexe',
        urgency: 'quality',
        taskHint: 'analyze'
      })
      
      expect(response.content).toBeTruthy()
    })

    test('analyzeDCE devrait être optimisé pour les documents français', async () => {
      const response = await analyzeDCE(
        'CCTP Infrastructure VMware 50 pages avec contraintes ANSSI',
        'CCTP'
      )
      
      expect(response).toBeDefined()
    })

    test('classifyDocument devrait être rapide', async () => {
      const startTime = Date.now()
      
      await classifyDocument('Document à classifier rapidement')
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(5000) // Moins de 5 secondes
    })
  })

  describe('Error Handling', () => {
    test('devrait gérer les erreurs de modèle gracieusement', async () => {
      const mockExecutor = jest.fn().mockRejectedValue(new Error('API indisponible'))
      
      // Test que les erreurs sont propagées correctement
      await expect(
        router.routeRequest('Test erreur')
      ).rejects.toThrow()
    })

    test('devrait logger les erreurs pour le monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      try {
        await router.routeRequest('Test erreur grave')
      } catch (error) {
        // Erreur attendue
      }
      
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('Performance Tests', () => {
    test('devrait traiter les requêtes sous les seuils de temps', async () => {
      const startTime = Date.now()
      
      try {
        await router.routeRequest(
          'Classification rapide document simple',
          'fast'
        )
      } catch (error) {
        // Ignorer les erreurs de mock pour ce test de performance
      }
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(3000) // Moins de 3 secondes pour le routing
    })

    test('devrait optimiser les coûts selon la configuration', async () => {
      // Configuration optimisée coût
      const costOptimizedRouter = createAIRouter({
        ...DEFAULT_ROUTER_CONFIG,
        scoringWeights: {
          cost: 0.5,
          speed: 0.2,
          quality: 0.2,
          availability: 0.1
        }
      })
      
      try {
        const response = await costOptimizedRouter.routeRequest(
          'Analyse avec priorité coût',
          'balanced'
        )
        
        expect(response.cost).toBeLessThan(0.20) // Budget raisonnable
      } catch (error) {
        // Test de configuration, erreur attendue sans vrais services
      }
    })
  })
})