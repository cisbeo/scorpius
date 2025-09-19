'use client'

import { useState } from 'react'
import { 
  FileText, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Star,
  Calendar,
  Euro,
  Building,
  Users,
  Download,
  Eye,
  Edit,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface TenderAnalysisResultsProps {
  analysisId: string
  data: {
    analysisName: string
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
    complexityScore: number
    overallConfidence: number
    analysisCompletedAt?: Date
    estimatedPreparationDays: number
    
    marketScope?: {
      title: string
      description: string
      sector: string
      estimatedValue?: number
      contractingAuthority?: string
      contractDuration?: string
    }
    
    technicalRequirements?: Array<{
      category: string
      requirement: string
      mandatory: boolean
      priority: 'HIGH' | 'MEDIUM' | 'LOW'
      confidence: number
      source: string
    }>
    
    evaluationCriteria?: {
      technical?: number
      financial?: number
      other?: number
      details?: string
    }
    
    timeConstraints?: {
      submissionDeadline?: Date
      projectDuration?: string
      keyMilestones?: Array<{
        name: string
        date: Date
        description?: string
      }>
    }
    
    mandatoryRequirements?: string[]
    
    sections?: Array<{
      id: string
      type: 'CCTP' | 'CCP' | 'BPU' | 'RC' | 'OTHER'
      title: string
      confidence: number
      pageCount: number
      extractedData?: any
    }>
    
    metadata: {
      documentsAnalyzed: number
      processingTime?: number
      errorMessage?: string
    }
  }
  onExport?: () => void
  onEdit?: () => void
  onViewRecommendations?: () => void
}

export function TenderAnalysisResults({ 
  analysisId, 
  data, 
  onExport, 
  onEdit, 
  onViewRecommendations 
}: TenderAnalysisResultsProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  const getComplexityColor = (score: number) => {
    if (score <= 3) return 'text-green-600'
    if (score <= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getComplexityLabel = (score: number) => {
    if (score <= 3) return 'Faible'
    if (score <= 6) return 'Moyenne'
    return 'Élevée'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Non défini'
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      if (isNaN(dateObj.getTime())) return 'Date invalide'
      
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(dateObj)
    } catch (error) {
      return 'Date invalide'
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}min`
    if (minutes > 0) return `${minutes}min ${seconds % 60}s`
    return `${seconds}s`
  }

  const getSectionTypeColor = (type: string) => {
    switch (type) {
      case 'CCTP': return 'bg-blue-100 text-blue-800'
      case 'CCP': return 'bg-green-100 text-green-800'
      case 'BPU': return 'bg-purple-100 text-purple-800'
      case 'RC': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (data.status === 'PROCESSING') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 animate-spin" />
            Analyse en cours...
          </CardTitle>
          <CardDescription>
            L'analyse de vos documents DCE est en cours de traitement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={undefined} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Cette opération peut prendre quelques minutes selon la taille des documents.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.status === 'FAILED') {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Erreur lors de l'analyse</p>
            {data.metadata.errorMessage && (
              <p className="text-sm">{data.metadata.errorMessage}</p>
            )}
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{data.analysisName}</h2>
          <p className="text-muted-foreground">
            Analyse terminée le {formatDate(data.analysisCompletedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          )}
          {onViewRecommendations && (
            <Button variant="outline" onClick={onViewRecommendations}>
              <Eye className="h-4 w-4 mr-2" />
              Recommandations
            </Button>
          )}
          {onExport && (
            <Button onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Score de Complexité</p>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${getComplexityColor(data.complexityScore)}`}>
                    {data.complexityScore}/10
                  </span>
                  <Badge variant="outline" className={getComplexityColor(data.complexityScore)}>
                    {getComplexityLabel(data.complexityScore)}
                  </Badge>
                </div>
              </div>
              <TrendingUp className={`h-8 w-8 ${getComplexityColor(data.complexityScore)}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Niveau de Confiance</p>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${getConfidenceColor(data.overallConfidence)}`}>
                    {Math.round(data.overallConfidence * 100)}%
                  </span>
                </div>
              </div>
              <CheckCircle2 className={`h-8 w-8 ${getConfidenceColor(data.overallConfidence)}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Préparation Estimée</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{data.estimatedPreparationDays}</span>
                  <span className="text-sm text-muted-foreground">jours</span>
                </div>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Documents Analysés</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{data.metadata.documentsAnalyzed}</span>
                  <span className="text-sm text-muted-foreground">
                    {data.metadata.processingTime && 
                      `en ${formatDuration(data.metadata.processingTime)}`
                    }
                  </span>
                </div>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="market" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="market">Marché</TabsTrigger>
          <TabsTrigger value="technical">Technique</TabsTrigger>
          <TabsTrigger value="evaluation">Évaluation</TabsTrigger>
          <TabsTrigger value="timeline">Planning</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="market" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Périmètre du Marché
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.marketScope ? (
                <>
                  <div>
                    <h4 className="font-medium mb-2">Titre du marché</h4>
                    <p className="text-sm text-muted-foreground">{data.marketScope.title}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{data.marketScope.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-medium mb-1">Secteur</h4>
                      <Badge variant="outline">{data.marketScope.sector}</Badge>
                    </div>
                    
                    {data.marketScope.estimatedValue && (
                      <div>
                        <h4 className="font-medium mb-1">Valeur estimée</h4>
                        <p className="text-sm font-mono">{formatCurrency(data.marketScope.estimatedValue)}</p>
                      </div>
                    )}
                    
                    {data.marketScope.contractingAuthority && (
                      <div>
                        <h4 className="font-medium mb-1">Autorité contractante</h4>
                        <p className="text-sm text-muted-foreground">{data.marketScope.contractingAuthority}</p>
                      </div>
                    )}
                  </div>
                  
                  {data.marketScope.contractDuration && (
                    <div>
                      <h4 className="font-medium mb-1">Durée du contrat</h4>
                      <p className="text-sm text-muted-foreground">{data.marketScope.contractDuration}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune information de périmètre disponible.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Exigences Techniques ({data.technicalRequirements?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.technicalRequirements && data.technicalRequirements.length > 0 ? (
                <div className="space-y-4">
                  {data.technicalRequirements.map((req, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{req.category}</Badge>
                          <Badge variant={req.mandatory ? "default" : "secondary"}>
                            {req.mandatory ? "Obligatoire" : "Optionnel"}
                          </Badge>
                          <Badge variant={
                            req.priority === 'HIGH' ? "destructive" : 
                            req.priority === 'MEDIUM' ? "default" : "secondary"
                          }>
                            {req.priority === 'HIGH' ? 'Haute' : 
                             req.priority === 'MEDIUM' ? 'Moyenne' : 'Basse'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">{Math.round(req.confidence * 100)}%</span>
                        </div>
                      </div>
                      <p className="text-sm mb-2">{req.requirement}</p>
                      <p className="text-xs text-muted-foreground">Source: {req.source}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune exigence technique identifiée.
                </p>
              )}
            </CardContent>
          </Card>

          {data.mandatoryRequirements && data.mandatoryRequirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Prérequis Obligatoires
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.mandatoryRequirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="evaluation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Critères d'Évaluation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.evaluationCriteria ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data.evaluationCriteria.technical && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {data.evaluationCriteria.technical}%
                        </div>
                        <div className="text-sm text-muted-foreground">Technique</div>
                      </div>
                    )}
                    
                    {data.evaluationCriteria.financial && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {data.evaluationCriteria.financial}%
                        </div>
                        <div className="text-sm text-muted-foreground">Financier</div>
                      </div>
                    )}
                    
                    {data.evaluationCriteria.other && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {data.evaluationCriteria.other}%
                        </div>
                        <div className="text-sm text-muted-foreground">Autres</div>
                      </div>
                    )}
                  </div>
                  
                  {data.evaluationCriteria.details && (
                    <div>
                      <h4 className="font-medium mb-2">Détails</h4>
                      <p className="text-sm text-muted-foreground">{data.evaluationCriteria.details}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Critères d'évaluation non spécifiés.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Contraintes Temporelles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.timeConstraints ? (
                <div className="space-y-4">
                  {data.timeConstraints.submissionDeadline && (
                    <div>
                      <h4 className="font-medium mb-1">Date limite de soumission</h4>
                      <p className="text-sm text-red-600 font-medium">
                        {formatDate(data.timeConstraints.submissionDeadline)}
                      </p>
                    </div>
                  )}
                  
                  {data.timeConstraints.projectDuration && (
                    <div>
                      <h4 className="font-medium mb-1">Durée du projet</h4>
                      <p className="text-sm text-muted-foreground">{data.timeConstraints.projectDuration}</p>
                    </div>
                  )}
                  
                  {data.timeConstraints.keyMilestones && data.timeConstraints.keyMilestones.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Jalons clés</h4>
                      <div className="space-y-2">
                        {data.timeConstraints.keyMilestones.map((milestone, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <p className="font-medium">{milestone.name}</p>
                              {milestone.description && (
                                <p className="text-sm text-muted-foreground">{milestone.description}</p>
                              )}
                            </div>
                            <div className="text-sm font-medium">{formatDate(milestone.date)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune contrainte temporelle identifiée.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sections de Documents Analysées
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.sections && data.sections.length > 0 ? (
                <div className="space-y-2">
                  {data.sections.map((section) => (
                    <Collapsible 
                      key={section.id}
                      open={expandedSections[section.id]}
                      onOpenChange={() => toggleSection(section.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            {expandedSections[section.id] ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                            <Badge className={getSectionTypeColor(section.type)}>
                              {section.type}
                            </Badge>
                            <span className="font-medium">{section.title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{section.pageCount} pages</span>
                            <span>•</span>
                            <span>{Math.round(section.confidence * 100)}% confiance</span>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-3 pb-3">
                        {section.extractedData && (
                          <div className="mt-2 p-3 bg-muted/30 rounded text-sm">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(section.extractedData, null, 2)}
                            </pre>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune section de document identifiée.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}