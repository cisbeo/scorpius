'use client'

import { useState } from 'react'
import { 
  Star, 
  TrendingUp, 
  Clock, 
  Euro, 
  AlertTriangle, 
  CheckCircle2, 
  Target,
  Lightbulb,
  ArrowRight,
  Filter,
  SortAsc,
  Eye,
  ExternalLink,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AntaresRecommendation {
  id: string
  recommendationType: 'SERVICE_MATCH' | 'COMPETENCY_GAP' | 'RISK_MITIGATION' | 'OPPORTUNITY' | 'STRATEGIC'
  title: string
  description: string
  relevanceScore: number
  antaresServices: string[]
  estimatedEffort: number
  estimatedValue: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  actionable: boolean
  reasoning: string
  createdAt: Date
}

interface AntaresRecommendationsProps {
  analysisId: string
  recommendations: AntaresRecommendation[]
  onRecommendationAction?: (recommendationId: string, action: 'accept' | 'reject' | 'view') => void
  onGenerateQuote?: (services: string[]) => void
}

export function AntaresRecommendations({ 
  analysisId, 
  recommendations, 
  onRecommendationAction,
  onGenerateQuote 
}: AntaresRecommendationsProps) {
  const [sortBy, setSortBy] = useState<'relevance' | 'value' | 'effort' | 'risk'>('relevance')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedServices, setSelectedServices] = useState<string[]>([])

  const getRecommendationTypeLabel = (type: string) => {
    switch (type) {
      case 'SERVICE_MATCH': return 'Correspondance de service'
      case 'COMPETENCY_GAP': return 'Manque de compétences'
      case 'RISK_MITIGATION': return 'Réduction des risques'
      case 'OPPORTUNITY': return 'Opportunité'
      case 'STRATEGIC': return 'Stratégique'
      default: return type
    }
  }

  const getRecommendationTypeColor = (type: string) => {
    switch (type) {
      case 'SERVICE_MATCH': return 'bg-blue-100 text-blue-800'
      case 'COMPETENCY_GAP': return 'bg-orange-100 text-orange-800'
      case 'RISK_MITIGATION': return 'bg-red-100 text-red-800'
      case 'OPPORTUNITY': return 'bg-green-100 text-green-800'
      case 'STRATEGIC': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-600'
      case 'MEDIUM': return 'text-yellow-600'
      case 'HIGH': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'Faible'
      case 'MEDIUM': return 'Moyen'
      case 'HIGH': return 'Élevé'
      default: return risk
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const sortedRecommendations = [...recommendations].sort((a, b) => {
    switch (sortBy) {
      case 'relevance':
        return b.relevanceScore - a.relevanceScore
      case 'value':
        return b.estimatedValue - a.estimatedValue
      case 'effort':
        return a.estimatedEffort - b.estimatedEffort
      case 'risk':
        const riskOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3 }
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
      default:
        return 0
    }
  })

  const filteredRecommendations = filterType === 'all' 
    ? sortedRecommendations 
    : sortedRecommendations.filter(rec => rec.recommendationType === filterType)

  const toggleService = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    )
  }

  const allServices = Array.from(new Set(recommendations.flatMap(rec => rec.antaresServices)))

  const totalEstimatedValue = filteredRecommendations.reduce((sum, rec) => sum + rec.estimatedValue, 0)
  const averageRelevance = filteredRecommendations.length > 0 
    ? filteredRecommendations.reduce((sum, rec) => sum + rec.relevanceScore, 0) / filteredRecommendations.length 
    : 0

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Recommandations Antares
          </CardTitle>
          <CardDescription>
            Aucune recommandation disponible pour cette analyse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Les recommandations n'ont pas pu être générées. Cela peut arriver si l'analyse n'a pas identifié 
              suffisamment d'éléments exploitables ou si une erreur s'est produite lors de la génération.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6" />
            Recommandations Antares
          </h2>
          <p className="text-muted-foreground">
            {recommendations.length} recommandation{recommendations.length !== 1 ? 's' : ''} basée{recommendations.length !== 1 ? 's' : ''} sur votre analyse DCE
          </p>
        </div>
        
        {selectedServices.length > 0 && onGenerateQuote && (
          <Button onClick={() => onGenerateQuote(selectedServices)} className="gap-2">
            <Euro className="h-4 w-4" />
            Générer devis ({selectedServices.length} services)
          </Button>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valeur Totale Estimée</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalEstimatedValue)}</p>
              </div>
              <Euro className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pertinence Moyenne</p>
                <p className="text-2xl font-bold text-blue-600">{Math.round(averageRelevance * 100)}%</p>
              </div>
              <Star className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Services Identifiés</p>
                <p className="text-2xl font-bold text-purple-600">{allServices.length}</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Actions Directes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {recommendations.filter(r => r.actionable).length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrer par type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="SERVICE_MATCH">Correspondances de service</SelectItem>
              <SelectItem value="COMPETENCY_GAP">Manques de compétences</SelectItem>
              <SelectItem value="RISK_MITIGATION">Réduction des risques</SelectItem>
              <SelectItem value="OPPORTUNITY">Opportunités</SelectItem>
              <SelectItem value="STRATEGIC">Stratégiques</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <SortAsc className="h-4 w-4" />
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Pertinence</SelectItem>
              <SelectItem value="value">Valeur estimée</SelectItem>
              <SelectItem value="effort">Effort requis</SelectItem>
              <SelectItem value="risk">Niveau de risque</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filteredRecommendations.map((recommendation, index) => (
          <Card key={recommendation.id} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getRecommendationTypeColor(recommendation.recommendationType)}>
                      {getRecommendationTypeLabel(recommendation.recommendationType)}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Star className="h-3 w-3" />
                      {Math.round(recommendation.relevanceScore * 100)}%
                    </Badge>
                    {recommendation.actionable && (
                      <Badge variant="outline" className="gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Action directe
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                </div>
                
                <div className="flex gap-2">
                  {onRecommendationAction && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onRecommendationAction(recommendation.id, 'view')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onRecommendationAction(recommendation.id, 'accept')}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onRecommendationAction(recommendation.id, 'reject')}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{recommendation.description}</p>
              
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(recommendation.estimatedValue)}
                  </div>
                  <div className="text-xs text-muted-foreground">Valeur estimée</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">
                    {recommendation.estimatedEffort}j
                  </div>
                  <div className="text-xs text-muted-foreground">Effort requis</div>
                </div>
                
                <div className="text-center">
                  <div className={`text-xl font-bold ${getRiskColor(recommendation.riskLevel)}`}>
                    {getRiskLabel(recommendation.riskLevel)}
                  </div>
                  <div className="text-xs text-muted-foreground">Niveau de risque</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600">
                    {recommendation.antaresServices.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Services impliqués</div>
                </div>
              </div>
              
              {/* Services */}
              {recommendation.antaresServices.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Services Antares Recommandés:</h4>
                  <div className="flex flex-wrap gap-2">
                    {recommendation.antaresServices.map((service, serviceIndex) => (
                      <Badge 
                        key={serviceIndex}
                        variant={selectedServices.includes(service) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleService(service)}
                      >
                        {service}
                        {selectedServices.includes(service) && (
                          <CheckCircle2 className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Reasoning */}
              <div>
                <h4 className="font-medium mb-2">Justification:</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {recommendation.reasoning}
                </p>
              </div>
              
              {/* Action Button */}
              {recommendation.actionable && (
                <div className="pt-2 border-t">
                  <Button variant="outline" className="w-full gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Passer à l'action
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecommendations.length === 0 && filterType !== 'all' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Aucune recommandation trouvée</h3>
              <p className="text-muted-foreground mb-4">
                Aucune recommandation ne correspond aux critères de filtrage sélectionnés.
              </p>
              <Button variant="outline" onClick={() => setFilterType('all')}>
                Afficher toutes les recommandations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Summary */}
      {allServices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Catalogue de Services Identifiés
            </CardTitle>
            <CardDescription>
              Services Antares recommandés pour ce marché
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {allServices.map((service, index) => (
                <div 
                  key={index}
                  className={`
                    p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedServices.includes(service) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:border-primary/50'
                    }
                  `}
                  onClick={() => toggleService(service)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{service}</span>
                    {selectedServices.includes(service) && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {recommendations.filter(r => r.antaresServices.includes(service)).length} recommandation{recommendations.filter(r => r.antaresServices.includes(service)).length !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
            
            {selectedServices.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} sélectionné{selectedServices.length !== 1 ? 's' : ''}
                  </p>
                  {onGenerateQuote && (
                    <Button onClick={() => onGenerateQuote(selectedServices)} size="sm">
                      Générer un devis
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}