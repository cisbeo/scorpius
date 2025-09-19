import { z } from 'zod'
import { SectionType, RecommendationType, RiskLevel } from '@prisma/client'

// Schema pour lancer une analyse de documents DCE
export const TenderAnalysisRequestSchema = z.object({
  documentIds: z.array(z.string().cuid())
    .min(1, 'Au moins un document est requis pour l\'analyse')
    .max(10, 'Maximum 10 documents par analyse'),
  
  analysisName: z.string()
    .min(1, 'Le nom de l\'analyse est requis')
    .max(100, 'Le nom de l\'analyse ne peut pas dépasser 100 caractères')
    .optional(),
  
  options: z.object({
    includeRecommendations: z.boolean().default(true),
    detailedExtraction: z.boolean().default(false),
    generateReport: z.boolean().default(false)
  }).optional()
})

// Schema pour les résultats d'analyse DCE
export const TenderAnalysisResultsSchema = z.object({
  success: z.boolean(),
  data: z.object({
    analysisId: z.string(),
    status: z.enum(['PROCESSING', 'COMPLETED', 'ERROR', 'ANALYZED']),
    
    // Métadonnées analyse
    analysisName: z.string(),
    complexityScore: z.number().min(1).max(10),
    overallConfidence: z.number().min(0).max(1),
    analysisCompletedAt: z.date().nullable(),
    estimatedPreparationDays: z.number().positive().nullable(),
    
    // Contenu extrait
    marketScope: z.object({
      title: z.string(),
      description: z.string(),
      sector: z.enum(['INFRASTRUCTURE', 'DEVELOPMENT', 'CYBERSECURITY', 'MIXED']),
      estimatedValue: z.number().nullable(),
      contractingAuthority: z.string().nullable()
    }).optional(),
    
    technicalRequirements: z.array(z.object({
      category: z.string(),
      requirement: z.string(),
      mandatory: z.boolean(),
      confidence: z.number().min(0).max(1),
      source: z.string().optional() // Section source (CCTP, CCP, etc.)
    })).optional(),
    
    evaluationCriteria: z.object({
      technical: z.number().min(0).max(100).nullable(),
      financial: z.number().min(0).max(100).nullable(),
      other: z.number().min(0).max(100).nullable(),
      details: z.union([z.string(), z.record(z.any())]).nullable()
    }).optional(),
    
    timeConstraints: z.object({
      submissionDeadline: z.date().optional(),
      projectDuration: z.number().nullable(), // en mois
      keyMilestones: z.array(z.object({
        name: z.string(),
        date: z.date(),
        description: z.string().optional()
      })).optional()
    }).optional(),
    
    mandatoryRequirements: z.array(z.string()).optional(),
    
    // Sections analysées
    sections: z.array(z.object({
      id: z.string(),
      type: z.nativeEnum(SectionType),
      title: z.string(),
      confidence: z.number().min(0).max(1),
      pageCount: z.number().positive(),
      extractedData: z.record(z.any()).optional()
    })).optional()
    
  }).optional(),
  
  error: z.object({
    code: z.enum(['DOCUMENTS_NOT_FOUND', 'ANALYSIS_FAILED', 'TIMEOUT', 'INVALID_DOCUMENTS']),
    message: z.string(),
    details: z.record(z.any()).optional()
  }).optional()
})

// Schema pour les recommandations Antares
export const AntaresRecommendationSchema = z.object({
  id: z.string(),
  recommendationType: z.nativeEnum(RecommendationType),
  title: z.string(),
  description: z.string(),
  relevanceScore: z.number().min(0).max(1),
  
  // Détails business
  antaresServices: z.array(z.string()), // IDs des services du catalogue
  estimatedEffort: z.number().positive().optional(), // jours-homme
  estimatedValue: z.number().positive().optional(), // euros
  riskLevel: z.nativeEnum(RiskLevel),
  actionable: z.boolean(),
  
  // Métadonnées
  createdAt: z.date(),
  reasoning: z.string().optional() // Justification de la recommandation
})

// Schema pour la progression d'analyse en temps réel
export const AnalysisProgressSchema = z.object({
  analysisId: z.string(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'ERROR']),
  progress: z.number().min(0).max(100), // Pourcentage de completion
  currentStep: z.string().optional(),
  estimatedTimeRemaining: z.number().optional(), // en secondes
  
  steps: z.array(z.object({
    name: z.string(),
    status: z.enum(['pending', 'processing', 'completed', 'error']),
    startedAt: z.date().optional(),
    completedAt: z.date().optional(),
    duration: z.number().optional() // en ms
  })).optional()
})

// Schema pour l'export de rapport
export const ReportGenerationRequestSchema = z.object({
  analysisId: z.string().cuid(),
  reportTitle: z.string().min(1).max(200),
  includeRecommendations: z.boolean().default(true),
  includeDetailedSections: z.boolean().default(true),
  format: z.enum(['PDF', 'DOCX']).default('PDF'),
  language: z.enum(['fr', 'en']).default('fr')
})

export const ReportGenerationResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    reportId: z.string(),
    downloadUrl: z.string(),
    expiresAt: z.date(),
    fileSize: z.number().optional()
  }).optional(),
  error: z.object({
    code: z.enum(['ANALYSIS_NOT_FOUND', 'GENERATION_FAILED', 'ACCESS_DENIED']),
    message: z.string()
  }).optional()
})

// Types TypeScript dérivés
export type TenderAnalysisRequest = z.infer<typeof TenderAnalysisRequestSchema>
export type TenderAnalysisResults = z.infer<typeof TenderAnalysisResultsSchema>
export type AntaresRecommendation = z.infer<typeof AntaresRecommendationSchema>
export type AnalysisProgress = z.infer<typeof AnalysisProgressSchema>
export type ReportGenerationRequest = z.infer<typeof ReportGenerationRequestSchema>
export type ReportGenerationResponse = z.infer<typeof ReportGenerationResponseSchema>

// Utilitaires de validation
export const validateComplexityScore = (score: number): boolean => {
  return Number.isInteger(score) && score >= 1 && score <= 10
}

export const validateConfidenceScore = (confidence: number): boolean => {
  return confidence >= 0 && confidence <= 1
}

export const validateAnalysisName = (name: string): boolean => {
  return name.length > 0 && name.length <= 100 && /^[a-zA-Z0-9\s\-_àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]+$/.test(name)
}

// Helpers pour la création d'analyses
export const createDefaultAnalysisName = (): string => {
  const now = new Date()
  return `Analyse DCE ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

export const getEstimatedAnalysisTime = (documentCount: number, totalSizeBytes: number): number => {
  // Estimation basée sur le nombre de documents et leur taille
  const baseTimePerDoc = 5000 // 5 secondes par document
  const timePerMB = 2000 // 2 secondes par MB
  const totalSizeMB = totalSizeBytes / (1024 * 1024)
  
  return Math.max(10000, (documentCount * baseTimePerDoc) + (totalSizeMB * timePerMB)) // minimum 10 secondes
}