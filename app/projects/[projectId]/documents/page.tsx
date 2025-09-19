'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  FileText, 
  Upload, 
  BarChart3, 
  Lightbulb, 
  RefreshCw,
  AlertCircle,
  Plus,
  ArrowLeft
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { TenderUpload } from '@/app/components/tenders/TenderUpload'
import { TenderAnalysisResults } from '@/app/components/tenders/TenderAnalysisResults'
import { AntaresRecommendations } from '@/app/components/tenders/AntaresRecommendations'

interface AnalysisListItem {
  id: string
  name: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  complexityScore?: number
  overallConfidence?: number
  createdAt: Date
  analysisCompletedAt?: Date
}

export default function DocumentsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [activeTab, setActiveTab] = useState('upload')
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([])
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load analyses for the project
  useEffect(() => {
    if (projectId) {
      loadAnalyses()
    }
  }, [projectId])

  // Load analysis details when selection changes
  useEffect(() => {
    if (selectedAnalysis) {
      loadAnalysisDetails(selectedAnalysis)
    }
  }, [selectedAnalysis])

  const loadAnalyses = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tenders/analyze?projectId=${projectId}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des analyses')
      }

      const result = await response.json()
      setAnalyses(result.data?.analyses || [])
      
      // Auto-select the most recent completed analysis
      const completedAnalyses = result.data?.analyses?.filter((a: any) => a.status === 'COMPLETED') || []
      if (completedAnalyses.length > 0 && !selectedAnalysis) {
        setSelectedAnalysis(completedAnalyses[0].id)
        setActiveTab('results')
      }
    } catch (error) {
      console.error('Load analyses error:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const loadAnalysisDetails = async (analysisId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tenders/${analysisId}/results`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des détails')
      }

      const result = await response.json()
      setAnalysisData(result.data)
      setRecommendations(result.data?.recommendations || [])
    } catch (error) {
      console.error('Load analysis details error:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadComplete = async (uploadId: string, documents: any[]) => {
    // Automatically start analysis if documents were uploaded successfully
    if (documents.length > 0) {
      try {
        const documentIds = documents.map(doc => doc.id)
        const analysisName = `Analyse ${new Date().toLocaleDateString('fr-FR')}`
        
        const response = await fetch('/api/tenders/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'current-user-id' // TODO: Get from auth context
          },
          body: JSON.stringify({
            documentIds,
            analysisName,
            options: {
              includeRecommendations: true,
              detailedExtraction: true
            }
          })
        })

        if (!response.ok) {
          throw new Error('Erreur lors du démarrage de l\'analyse')
        }

        const result = await response.json()
        
        // Refresh analyses list
        await loadAnalyses()
        
        // Select the new analysis
        setSelectedAnalysis(result.data.analysisId)
        setActiveTab('results')
        
      } catch (error) {
        console.error('Start analysis error:', error)
        setError(error instanceof Error ? error.message : 'Erreur lors du démarrage de l\'analyse')
      }
    }
  }

  const handleAnalysisSelect = (analysisId: string) => {
    setSelectedAnalysis(analysisId)
    setActiveTab('results')
  }

  const handleExportAnalysis = async () => {
    if (!selectedAnalysis) return

    try {
      const response = await fetch(`/api/tenders/${selectedAnalysis}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reportTitle: `Rapport d'analyse - ${analysisData?.analysisName || 'Sans titre'}`,
          includeRecommendations: true,
          includeDetailedSections: true,
          format: 'PDF',
          language: 'fr'
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'export')
      }

      const result = await response.json()
      
      // Open download URL in new tab
      if (result.data?.downloadUrl) {
        window.open(result.data.downloadUrl, '_blank')
      }
      
    } catch (error) {
      console.error('Export error:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'export')
    }
  }

  const handleRecommendationAction = (recommendationId: string, action: 'accept' | 'reject' | 'view') => {
    console.log('Recommendation action:', recommendationId, action)
    // TODO: Implement recommendation actions
  }

  const handleGenerateQuote = (services: string[]) => {
    console.log('Generate quote for services:', services)
    // TODO: Implement quote generation
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Analyse de Documents DCE</h1>
            <p className="text-muted-foreground">
              Analysez vos appels d'offres avec l'IA spécialisée Antares
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAnalyses} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2" 
              onClick={() => setError(null)}
            >
              Fermer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Analysis List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analyses ({analyses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2"
                onClick={() => setActiveTab('upload')}
              >
                <Plus className="h-4 w-4" />
                Nouvelle analyse
              </Button>
              
              <Separator />
              
              {analyses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune analyse pour ce projet
                </p>
              ) : (
                <div className="space-y-1">
                  {analyses.map((analysis) => (
                    <button
                      key={analysis.id}
                      onClick={() => handleAnalysisSelect(analysis.id)}
                      className={`
                        w-full text-left p-3 rounded-lg border transition-colors
                        ${selectedAnalysis === analysis.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-transparent hover:border-muted-foreground/20'
                        }
                      `}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">{analysis.analysisName}</span>
                          <div className={`
                            w-2 h-2 rounded-full
                            ${analysis.status === 'COMPLETED' ? 'bg-green-500' :
                              analysis.status === 'PROCESSING' ? 'bg-yellow-500 animate-pulse' :
                              'bg-red-500'}
                          `} />
                        </div>
                        
                        {analysis.status === 'COMPLETED' && analysis.complexityScore && (
                          <div className="text-xs text-muted-foreground">
                            Complexité: {analysis.complexityScore}/10
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          {new Date(analysis.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center gap-2" disabled={!selectedAnalysis}>
                <FileText className="h-4 w-4" />
                Résultats
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="flex items-center gap-2" disabled={!selectedAnalysis || recommendations.length === 0}>
                <Lightbulb className="h-4 w-4" />
                Recommandations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-6">
              <TenderUpload
                projectId={projectId}
                onUploadComplete={handleUploadComplete}
                onUploadError={setError}
              />
            </TabsContent>

            <TabsContent value="results" className="mt-6">
              {selectedAnalysis && analysisData ? (
                <TenderAnalysisResults
                  analysisId={selectedAnalysis}
                  data={analysisData}
                  onExport={handleExportAnalysis}
                  onEdit={() => setActiveTab('upload')}
                  onViewRecommendations={() => setActiveTab('recommendations')}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">Aucune analyse sélectionnée</h3>
                      <p className="text-muted-foreground mb-4">
                        Sélectionnez une analyse dans la liste ou créez-en une nouvelle.
                      </p>
                      <Button onClick={() => setActiveTab('upload')}>
                        Commencer une nouvelle analyse
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="recommendations" className="mt-6">
              {selectedAnalysis && recommendations.length > 0 ? (
                <AntaresRecommendations
                  analysisId={selectedAnalysis}
                  recommendations={recommendations}
                  onRecommendationAction={handleRecommendationAction}
                  onGenerateQuote={handleGenerateQuote}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">Aucune recommandation disponible</h3>
                      <p className="text-muted-foreground mb-4">
                        Les recommandations apparaîtront après la completion de l'analyse.
                      </p>
                      {!selectedAnalysis && (
                        <Button onClick={() => setActiveTab('upload')}>
                          Commencer une analyse
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}