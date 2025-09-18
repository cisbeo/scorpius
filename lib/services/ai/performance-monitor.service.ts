import { 
  AIRequest, 
  AIResponse, 
  ModelName, 
  PerformanceMetrics,
  RoutingDecision
} from './types'

/**
 * Service de monitoring des performances IA en temps réel
 * Collecte métriques, détecte anomalies, optimise coûts
 */
export class PerformanceMonitorService {
  
  private metrics: Map<string, any> = new Map()
  private sessionMetrics: PerformanceMetrics[] = []
  private costTracking: Map<ModelName, number> = new Map()
  private responseTimeHistory: Map<ModelName, number[]> = new Map()
  private readonly maxHistorySize = 1000
  
  constructor() {
    this.initializeMetrics()
    
    // Nettoyage périodique toutes les heures
    setInterval(() => this.cleanup(), 60 * 60 * 1000)
  }
  
  /**
   * Enregistrement des métriques pour une requête
   */
  async recordMetrics(
    request: AIRequest,
    response: AIResponse,
    decision: RoutingDecision
  ): Promise<void> {
    
    const timestamp = new Date()
    
    // Métriques de performance
    await this.recordPerformanceMetrics(response, timestamp)
    
    // Métriques de coût
    await this.recordCostMetrics(response, timestamp)
    
    // Métriques de qualité
    await this.recordQualityMetrics(request, response, timestamp)
    
    // Métriques de routage
    await this.recordRoutingMetrics(decision, response, timestamp)
    
    // Détection d'anomalies
    await this.detectAnomalies(response)
    
    // Mise à jour des moyennes mobiles
    this.updateRollingAverages(response)
  }
  
  /**
   * Métriques de performance (temps de réponse)
   */
  private async recordPerformanceMetrics(
    response: AIResponse,
    timestamp: Date
  ): Promise<void> {
    
    // Enregistrer le temps de réponse
    if (!this.responseTimeHistory.has(response.model)) {
      this.responseTimeHistory.set(response.model, [])
    }
    
    const history = this.responseTimeHistory.get(response.model)!
    history.push(response.processingTime)
    
    // Garder seulement les N dernières mesures
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize)
    }
    
    // Mise à jour des métriques globales
    this.updateMetric('responseTime', {
      model: response.model,
      time: response.processingTime,
      timestamp
    })
    
    // Calcul percentiles
    const sortedTimes = [...history].sort((a, b) => a - b)
    const p95Index = Math.floor(sortedTimes.length * 0.95)
    const p99Index = Math.floor(sortedTimes.length * 0.99)
    
    this.updateMetric('percentiles', {
      model: response.model,
      p50: sortedTimes[Math.floor(sortedTimes.length * 0.5)],
      p95: sortedTimes[p95Index],
      p99: sortedTimes[p99Index],
      timestamp
    })
  }
  
  /**
   * Métriques de coût
   */
  private async recordCostMetrics(
    response: AIResponse,
    timestamp: Date
  ): Promise<void> {
    
    // Mise à jour du coût total par modèle
    const currentCost = this.costTracking.get(response.model) || 0
    this.costTracking.set(response.model, currentCost + response.cost)
    
    // Métriques détaillées
    this.updateMetric('cost', {
      model: response.model,
      cost: response.cost,
      tokensUsed: response.tokensUsed?.total || 0,
      costPerToken: response.tokensUsed?.total ? response.cost / response.tokensUsed.total : 0,
      timestamp
    })
    
    // Calcul coût par heure
    const hourlyRate = this.calculateHourlyCost(response.model)
    this.updateMetric('hourlyCost', {
      model: response.model,
      rate: hourlyRate,
      timestamp
    })
  }
  
  /**
   * Métriques de qualité
   */
  private async recordQualityMetrics(
    request: AIRequest,
    response: AIResponse,
    timestamp: Date
  ): Promise<void> {
    
    this.updateMetric('quality', {
      model: response.model,
      confidence: response.confidence,
      taskType: request.context.taskType,
      complexity: request.context.complexity,
      fallbackUsed: response.metadata?.fallbackUsed || false,
      timestamp
    })
    
    // Score de qualité composite
    const qualityScore = this.calculateQualityScore(request, response)
    this.updateMetric('compositeQuality', {
      model: response.model,
      score: qualityScore,
      timestamp
    })
  }
  
  /**
   * Métriques de routage
   */
  private async recordRoutingMetrics(
    decision: RoutingDecision,
    response: AIResponse,
    timestamp: Date
  ): Promise<void> {
    
    this.updateMetric('routing', {
      selectedModel: decision.selectedModel,
      actualModel: response.model,
      fallbackUsed: decision.selectedModel !== response.model,
      decisionConfidence: decision.decisionConfidence,
      estimatedCost: decision.estimatedCost,
      actualCost: response.cost,
      estimatedTime: decision.estimatedTime,
      actualTime: response.processingTime,
      timestamp
    })
  }
  
  /**
   * Détection d'anomalies
   */
  private async detectAnomalies(response: AIResponse): Promise<void> {
    const history = this.responseTimeHistory.get(response.model) || []
    
    if (history.length < 10) return // Pas assez de données
    
    const avgTime = history.reduce((sum, time) => sum + time, 0) / history.length
    const threshold = avgTime * 3 // 3x la moyenne = anomalie
    
    if (response.processingTime > threshold) {
      this.recordAnomaly({
        type: 'SLOW_RESPONSE',
        model: response.model,
        value: response.processingTime,
        threshold,
        timestamp: new Date()
      })
    }
    
    // Anomalie de coût
    const avgCost = this.calculateAverageCost(response.model)
    if (response.cost > avgCost * 2) {
      this.recordAnomaly({
        type: 'HIGH_COST',
        model: response.model,
        value: response.cost,
        threshold: avgCost * 2,
        timestamp: new Date()
      })
    }
    
    // Anomalie de confiance
    if (response.confidence < 0.3) {
      this.recordAnomaly({
        type: 'LOW_CONFIDENCE',
        model: response.model,
        value: response.confidence,
        threshold: 0.3,
        timestamp: new Date()
      })
    }
  }
  
  /**
   * Mise à jour des moyennes mobiles
   */
  private updateRollingAverages(response: AIResponse): void {
    const key = `rolling_${response.model}`
    const current = this.metrics.get(key) || {
      responseTime: [],
      cost: [],
      confidence: []
    }
    
    // Ajouter nouvelles valeurs
    current.responseTime.push(response.processingTime)
    current.cost.push(response.cost)
    current.confidence.push(response.confidence)
    
    // Garder seulement les 50 dernières
    const maxSize = 50
    Object.keys(current).forEach(metric => {
      if (current[metric].length > maxSize) {
        current[metric] = current[metric].slice(-maxSize)
      }
    })
    
    this.metrics.set(key, current)
  }
  
  /**
   * Calcul du coût par heure
   */
  private calculateHourlyCost(model: ModelName): number {
    const costHistory = this.getMetricHistory('cost')
      .filter(m => m.model === model)
      .filter(m => Date.now() - m.timestamp.getTime() < 60 * 60 * 1000) // 1 heure
    
    if (costHistory.length === 0) return 0
    
    const totalCost = costHistory.reduce((sum, m) => sum + m.cost, 0)
    return totalCost
  }
  
  /**
   * Calcul du coût moyen
   */
  private calculateAverageCost(model: ModelName): number {
    const costHistory = this.getMetricHistory('cost')
      .filter(m => m.model === model)
      .slice(-100) // 100 dernières requêtes
    
    if (costHistory.length === 0) return 0
    
    return costHistory.reduce((sum, m) => sum + m.cost, 0) / costHistory.length
  }
  
  /**
   * Calcul d'un score de qualité composite
   */
  private calculateQualityScore(request: AIRequest, response: AIResponse): number {
    let score = response.confidence
    
    // Bonus si temps de réponse acceptable
    const targetTime = request.context.urgency === 'fast' ? 2000 : 5000
    if (response.processingTime <= targetTime) {
      score += 0.1
    }
    
    // Bonus si pas de fallback utilisé
    if (!response.metadata?.fallbackUsed) {
      score += 0.1
    }
    
    // Malus si coût élevé par rapport au budget
    if (response.cost > request.context.costBudget) {
      score -= 0.2
    }
    
    return Math.max(0, Math.min(1, score))
  }
  
  /**
   * Enregistrement d'anomalie
   */
  private recordAnomaly(anomaly: {
    type: string
    model: ModelName
    value: number
    threshold: number
    timestamp: Date
  }): void {
    
    console.warn(`ANOMALIE DÉTECTÉE: ${anomaly.type}`, {
      model: anomaly.model,
      value: anomaly.value,
      threshold: anomaly.threshold
    })
    
    this.updateMetric('anomalies', anomaly)
    
    // Notification si critique
    if (anomaly.type === 'SLOW_RESPONSE' && anomaly.value > 15000) { // 15s
      this.sendCriticalAlert(anomaly)
    }
  }
  
  /**
   * Alerte critique
   */
  private async sendCriticalAlert(anomaly: any): Promise<void> {
    // Implémentation future : webhook, email, Slack, etc.
    console.error(`🚨 ALERTE CRITIQUE: ${anomaly.type} sur ${anomaly.model}`)
  }
  
  /**
   * Obtenir les métriques actuelles
   */
  getCurrentMetrics(): PerformanceMetrics {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    // Données de la dernière heure
    const recentData = this.getMetricsInRange(oneHourAgo, now)
    
    return {
      requestCount: recentData.length,
      avgResponseTime: this.calculateAverage(recentData, 'processingTime'),
      p95ResponseTime: this.calculatePercentile(recentData, 'processingTime', 0.95),
      totalCost: recentData.reduce((sum, d) => sum + (d.cost || 0), 0),
      avgCostPerRequest: this.calculateAverage(recentData, 'cost'),
      costByModel: this.calculateCostByModel(recentData),
      avgConfidence: this.calculateAverage(recentData, 'confidence'),
      successRate: this.calculateSuccessRate(recentData),
      fallbackRate: this.calculateFallbackRate(recentData),
      modelUsage: this.calculateModelUsage(recentData),
      period: {
        start: oneHourAgo,
        end: now
      }
    }
  }
  
  /**
   * Obtenir les métriques historiques
   */
  getHistoricalMetrics(hours: number = 24): PerformanceMetrics[] {
    const intervals = []
    const now = new Date()
    
    for (let i = hours; i > 0; i--) {
      const end = new Date(now.getTime() - (i - 1) * 60 * 60 * 1000)
      const start = new Date(end.getTime() - 60 * 60 * 1000)
      
      const data = this.getMetricsInRange(start, end)
      
      intervals.push({
        requestCount: data.length,
        avgResponseTime: this.calculateAverage(data, 'processingTime'),
        p95ResponseTime: this.calculatePercentile(data, 'processingTime', 0.95),
        totalCost: data.reduce((sum, d) => sum + (d.cost || 0), 0),
        avgCostPerRequest: this.calculateAverage(data, 'cost'),
        costByModel: this.calculateCostByModel(data),
        avgConfidence: this.calculateAverage(data, 'confidence'),
        successRate: this.calculateSuccessRate(data),
        fallbackRate: this.calculateFallbackRate(data),
        modelUsage: this.calculateModelUsage(data),
        period: { start, end }
      })
    }
    
    return intervals
  }
  
  /**
   * Dashboard de métriques temps réel
   */
  getDashboardData(): {
    overview: any
    byModel: any
    trends: any
    alerts: any
  } {
    const current = this.getCurrentMetrics()
    const previous = this.getHistoricalMetrics(2)[0] // Heure précédente
    
    return {
      overview: {
        requestsPerHour: current.requestCount,
        avgResponseTime: current.avgResponseTime,
        totalCostPerHour: current.totalCost,
        successRate: current.successRate,
        trends: {
          requests: this.calculateTrend(current.requestCount, previous?.requestCount),
          responseTime: this.calculateTrend(current.avgResponseTime, previous?.avgResponseTime),
          cost: this.calculateTrend(current.totalCost, previous?.totalCost)
        }
      },
      
      byModel: Object.entries(current.modelUsage).map(([model, stats]) => ({
        model,
        requests: stats.requests,
        avgTime: stats.avgTime,
        avgCost: stats.avgCost,
        successRate: stats.successRate,
        costEfficiency: stats.avgCost / stats.avgTime * 1000 // coût par seconde
      })),
      
      trends: this.getHistoricalMetrics(24).map(h => ({
        timestamp: h.period.end,
        requests: h.requestCount,
        responseTime: h.avgResponseTime,
        cost: h.totalCost,
        quality: h.avgConfidence
      })),
      
      alerts: this.getRecentAnomalies(24)
    }
  }
  
  /**
   * Optimisations recommandées
   */
  getOptimizationRecommendations(): Array<{
    type: string
    priority: 'high' | 'medium' | 'low'
    description: string
    expectedImpact: string
  }> {
    const recommendations = []
    const metrics = this.getCurrentMetrics()
    
    // Recommandation coût
    if (metrics.totalCost > 10) { // 10€/heure
      recommendations.push({
        type: 'COST_OPTIMIZATION',
        priority: 'high' as const,
        description: 'Coût élevé détecté. Privilégier Claude Haiku pour tâches simples.',
        expectedImpact: '-30% coût estimé'
      })
    }
    
    // Recommandation performance
    if (metrics.avgResponseTime > 5000) {
      recommendations.push({
        type: 'PERFORMANCE_OPTIMIZATION',
        priority: 'medium' as const,
        description: 'Temps de réponse lent. Réviser seuils de complexité du router.',
        expectedImpact: '-40% temps réponse'
      })
    }
    
    // Recommandation fallback
    if (metrics.fallbackRate > 0.1) { // 10%
      recommendations.push({
        type: 'RELIABILITY_OPTIMIZATION',
        priority: 'high' as const,
        description: 'Taux de fallback élevé. Vérifier disponibilité modèles principaux.',
        expectedImpact: '+20% fiabilité'
      })
    }
    
    return recommendations
  }
  
  // Méthodes utilitaires privées
  
  private initializeMetrics(): void {
    this.metrics.set('anomalies', [])
    this.metrics.set('responseTime', [])
    this.metrics.set('cost', [])
    this.metrics.set('quality', [])
    this.metrics.set('routing', [])
  }
  
  private updateMetric(key: string, value: any): void {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, [])
    }
    
    const current = this.metrics.get(key)
    current.push(value)
    
    // Limiter la taille
    if (current.length > this.maxHistorySize) {
      current.splice(0, current.length - this.maxHistorySize)
    }
  }
  
  private getMetricHistory(key: string): any[] {
    return this.metrics.get(key) || []
  }
  
  private getMetricsInRange(start: Date, end: Date): any[] {
    const allMetrics = []
    
    // Combiner toutes les métriques dans la plage
    for (const [key, values] of this.metrics.entries()) {
      if (Array.isArray(values)) {
        const filtered = values.filter(v => 
          v.timestamp && v.timestamp >= start && v.timestamp <= end
        )
        allMetrics.push(...filtered)
      }
    }
    
    return allMetrics
  }
  
  private calculateAverage(data: any[], field: string): number {
    const values = data.filter(d => d[field] !== undefined).map(d => d[field])
    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
  }
  
  private calculatePercentile(data: any[], field: string, percentile: number): number {
    const values = data.filter(d => d[field] !== undefined).map(d => d[field]).sort((a, b) => a - b)
    if (values.length === 0) return 0
    
    const index = Math.floor(values.length * percentile)
    return values[index] || 0
  }
  
  private calculateCostByModel(data: any[]): Record<ModelName, number> {
    const costs: Record<string, number> = {}
    
    data.filter(d => d.model && d.cost).forEach(d => {
      costs[d.model] = (costs[d.model] || 0) + d.cost
    })
    
    return costs as Record<ModelName, number>
  }
  
  private calculateSuccessRate(data: any[]): number {
    const total = data.length
    const failures = data.filter(d => d.fallbackUsed || d.confidence < 0.5).length
    return total > 0 ? (total - failures) / total : 1
  }
  
  private calculateFallbackRate(data: any[]): number {
    const total = data.length
    const fallbacks = data.filter(d => d.fallbackUsed).length
    return total > 0 ? fallbacks / total : 0
  }
  
  private calculateModelUsage(data: any[]): Record<ModelName, any> {
    const usage: Record<string, any> = {}
    
    data.filter(d => d.model).forEach(d => {
      if (!usage[d.model]) {
        usage[d.model] = {
          requests: 0,
          totalTime: 0,
          totalCost: 0,
          successes: 0
        }
      }
      
      usage[d.model].requests++
      usage[d.model].totalTime += d.processingTime || 0
      usage[d.model].totalCost += d.cost || 0
      if (!d.fallbackUsed && d.confidence > 0.5) {
        usage[d.model].successes++
      }
    })
    
    // Calculer moyennes
    Object.keys(usage).forEach(model => {
      const stats = usage[model]
      stats.avgTime = stats.requests > 0 ? stats.totalTime / stats.requests : 0
      stats.avgCost = stats.requests > 0 ? stats.totalCost / stats.requests : 0
      stats.successRate = stats.requests > 0 ? stats.successes / stats.requests : 0
    })
    
    return usage as Record<ModelName, any>
  }
  
  private calculateTrend(current: number, previous: number): number {
    if (!previous || previous === 0) return 0
    return ((current - previous) / previous) * 100
  }
  
  private getRecentAnomalies(hours: number): any[] {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.getMetricHistory('anomalies').filter(a => a.timestamp >= since)
  }
  
  private cleanup(): void {
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 jours
    const cutoff = new Date(Date.now() - maxAge)
    
    for (const [key, values] of this.metrics.entries()) {
      if (Array.isArray(values)) {
        const filtered = values.filter(v => !v.timestamp || v.timestamp >= cutoff)
        this.metrics.set(key, filtered)
      }
    }
  }
}