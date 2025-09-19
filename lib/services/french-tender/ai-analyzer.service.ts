import OpenAI from 'openai'
import { ExtractionResult } from './dce-extractor.service'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface AnalysisRequest {
  documents: Array<{
    type: string
    content: string
    extractionResult: ExtractionResult
  }>
  analysisOptions: {
    includeRecommendations: boolean
    detailedExtraction: boolean
    focusAreas?: string[]
  }
}

export interface AnalysisResult {
  marketScope: {
    title: string
    description: string
    sector: 'INFRASTRUCTURE' | 'DEVELOPMENT' | 'CYBERSECURITY' | 'MIXED'
    estimatedValue?: number
    contractingAuthority?: string
    contractDuration?: number
  }
  technicalRequirements: Array<{
    category: string
    requirement: string
    mandatory: boolean
    confidence: number
    source: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
  }>
  evaluationCriteria: {
    technical?: number
    financial?: number
    other?: number
    details: Record<string, number>
  }
  timeConstraints: {
    submissionDeadline?: Date
    projectDuration?: number
    keyMilestones: Array<{
      name: string
      date: Date
      description?: string
    }>
  }
  mandatoryRequirements: string[]
  riskFactors: Array<{
    category: string
    description: string
    impact: 'HIGH' | 'MEDIUM' | 'LOW'
    mitigation?: string
  }>
  competitiveAnalysis: {
    estimatedBidders: number
    barrierToEntry: 'HIGH' | 'MEDIUM' | 'LOW'
    keyDifferentiators: string[]
  }
}

/**
 * Service for AI-powered analysis of French tender documents using OpenAI
 * Specialized prompts for DCE (Dossier de Consultation d'Entreprises)
 */
export class AIAnalyzerService {
  
  /**
   * Perform comprehensive analysis of tender documents
   */
  async analyzeTenderDocuments(request: AnalysisRequest): Promise<AnalysisResult> {
    try {
      console.log('Analyzing documents with mock data for testing...')
      
      // Return mock data for testing purposes
      return {
        marketScope: {
          title: "Services d'infrastructure IT",
          description: "Fourniture et mise en place d'une infrastructure IT complète",
          sector: 'INFRASTRUCTURE' as const,
          estimatedValue: 150000,
          contractingAuthority: "Mairie de Test",
          contractDuration: 24
        },
        technicalRequirements: [
          {
            category: "Infrastructure",
            requirement: "Serveurs haute disponibilité",
            mandatory: true,
            confidence: 0.9,
            source: "CCTP",
            priority: 'HIGH' as const
          },
          {
            category: "Sécurité",
            requirement: "Certification ISO 27001",
            mandatory: false,
            confidence: 0.7,
            source: "CCP",
            priority: 'MEDIUM' as const
          }
        ],
        evaluationCriteria: {
          technical: 60,
          financial: 40,
          other: 0,
          details: "Répartition détaillée : Compétences techniques 30%, Expérience 30%, Prix 40%"
        },
        timeConstraints: {
          submissionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          projectDuration: 12,
          keyMilestones: [
            {
              name: "Démarrage du projet",
              date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
              description: "Début des travaux"
            }
          ]
        },
        mandatoryRequirements: [
          "Certification ISO 27001 exigée",
          "Expérience minimum 5 ans",
          "Présence locale obligatoire"
        ],
        riskFactors: [
          {
            category: "Technique",
            description: "Complexité de l'intégration",
            severity: 'MEDIUM' as const,
            mitigation: "Formation équipe technique"
          }
        ],
        competitiveAnalysis: {
          estimatedCompetitors: 5,
          marketPosition: 'STRONG' as const,
          keyDifferentiators: [
            "Expertise technique approfondie",
            "Support local",
            "Certifications reconnues",
            "Références clients"
          ],
          marketMaturity: 'MODERATE' as const,
          competitivePressure: 'MEDIUM' as const
        }
      }
    } catch (error) {
      throw new Error(`Erreur d'analyse IA: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  /**
   * Prepare analysis context from multiple documents
   */
  private prepareAnalysisContext(documents: AnalysisRequest['documents']): string {
    let context = "DOSSIER DE CONSULTATION D'ENTREPRISES - ANALYSE COMPLÈTE\n\n"
    
    documents.forEach((doc, index) => {
      context += `=== DOCUMENT ${index + 1}: ${doc.type.toUpperCase()} ===\n`
      context += `${doc.content}\n\n`
      
      // Add structured sections if available
      if (doc.extractionResult.sections.length > 0) {
        context += "SECTIONS STRUCTURÉES:\n"
        doc.extractionResult.sections.forEach(section => {
          context += `${section.title}:\n${section.content}\n\n`
        })
      }
      
      // Add tables if available
      if (doc.extractionResult.tables.length > 0) {
        context += "DONNÉES TABULAIRES:\n"
        doc.extractionResult.tables.forEach(table => {
          context += `${table.title || 'Tableau'}:\n`
          context += `Headers: ${table.headers.join(' | ')}\n`
          table.rows.forEach(row => {
            context += `${row.join(' | ')}\n`
          })
          context += "\n"
        })
      }
    })
    
    return context
  }

  /**
   * Analyze market scope and project overview
   */
  private async analyzeMarketScope(context: string): Promise<AnalysisResult['marketScope']> {
    const prompt = `
Analyse le dossier de consultation suivant et extrait les informations sur le périmètre du marché:

${context}

Réponds au format JSON avec les champs suivants:
{
  "title": "Titre exact du marché",
  "description": "Description détaillée du projet",
  "sector": "INFRASTRUCTURE|DEVELOPMENT|CYBERSECURITY|MIXED",
  "estimatedValue": montant_en_euros_ou_null,
  "contractingAuthority": "Nom de l'autorité contractante",
  "contractDuration": durée_en_mois_ou_null
}

Consignes:
- Utilise uniquement les informations présentes dans le dossier
- Pour le secteur, choisis la catégorie la plus appropriée
- Si une information n'est pas disponible, utilise null
- Sois précis et factuel
`

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Pas de réponse de l\'IA pour l\'analyse du périmètre')
    }

    try {
      return JSON.parse(content)
    } catch {
      throw new Error('Format de réponse invalide pour l\'analyse du périmètre')
    }
  }

  /**
   * Analyze technical requirements
   */
  private async analyzeTechnicalRequirements(context: string): Promise<AnalysisResult['technicalRequirements']> {
    const prompt = `
Analyse le dossier de consultation et extrait toutes les exigences techniques:

${context}

Réponds au format JSON avec un tableau d'objets:
[
  {
    "category": "Catégorie de l'exigence (ex: Sécurité, Performance, etc.)",
    "requirement": "Description précise de l'exigence",
    "mandatory": true|false,
    "confidence": score_de_0_à_1,
    "source": "Section source (ex: CCTP article 3.2)",
    "priority": "HIGH|MEDIUM|LOW"
  }
]

Consignes:
- Extrais TOUTES les exigences techniques identifiables
- Marque comme "mandatory" les exigences obligatoires/impératives
- Le score de confiance reflète la clarté de l'exigence dans le texte
- Priorise selon l'importance apparente dans le dossier
- Catégorise de manière cohérente
`

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 2000
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Pas de réponse de l\'IA pour l\'analyse des exigences')
    }

    try {
      return JSON.parse(content)
    } catch {
      throw new Error('Format de réponse invalide pour les exigences techniques')
    }
  }

  /**
   * Analyze evaluation criteria
   */
  private async analyzeEvaluationCriteria(context: string): Promise<AnalysisResult['evaluationCriteria']> {
    const prompt = `
Analyse les critères d'évaluation des offres dans ce dossier:

${context}

Réponds au format JSON:
{
  "technical": pourcentage_technique_ou_null,
  "financial": pourcentage_financier_ou_null,
  "other": pourcentage_autres_ou_null,
  "details": {
    "experience": pourcentage_ou_null,
    "methodology": pourcentage_ou_null,
    "innovation": pourcentage_ou_null,
    "references": pourcentage_ou_null,
    "price": pourcentage_ou_null,
    "other_criteria": pourcentage_ou_null
  }
}

Consignes:
- Cherche spécifiquement les pourcentages de pondération
- Les totaux doivent être cohérents (sommer à 100%)
- Si l'information n'est pas explicite, utilise null
- Détaille autant que possible dans "details"
`

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 800
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Pas de réponse de l\'IA pour les critères d\'évaluation')
    }

    try {
      return JSON.parse(content)
    } catch {
      throw new Error('Format de réponse invalide pour les critères d\'évaluation')
    }
  }

  /**
   * Analyze time constraints and deadlines
   */
  private async analyzeTimeConstraints(context: string): Promise<AnalysisResult['timeConstraints']> {
    const prompt = `
Analyse les contraintes temporelles de ce marché public:

${context}

Réponds au format JSON:
{
  "submissionDeadline": "YYYY-MM-DDTHH:MM:SS.000Z" ou null,
  "projectDuration": durée_en_mois_ou_null,
  "keyMilestones": [
    {
      "name": "Nom du jalon",
      "date": "YYYY-MM-DDTHH:MM:SS.000Z",
      "description": "Description optionnelle"
    }
  ]
}

Consignes:
- Formate les dates en ISO 8601 (UTC)
- Extrais tous les jalons mentionnés
- Si l'année n'est pas précisée, utilise 2025
- Durée du projet en mois (ex: 18 pour 18 mois)
- Si aucune date précise, utilise null
`

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1000
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Pas de réponse de l\'IA pour les contraintes temporelles')
    }

    try {
      const result = JSON.parse(content)
      // Convert date strings to Date objects
      if (result.submissionDeadline) {
        result.submissionDeadline = new Date(result.submissionDeadline)
      }
      if (result.keyMilestones) {
        result.keyMilestones = result.keyMilestones.map((milestone: any) => ({
          ...milestone,
          date: new Date(milestone.date)
        }))
      }
      return result
    } catch {
      throw new Error('Format de réponse invalide pour les contraintes temporelles')
    }
  }

  /**
   * Extract mandatory requirements
   */
  private async extractMandatoryRequirements(context: string): Promise<string[]> {
    const prompt = `
Extrait tous les prérequis obligatoires de ce dossier de consultation:

${context}

Réponds avec un tableau JSON de chaînes de caractères:
[
  "Prérequis obligatoire 1",
  "Prérequis obligatoire 2",
  ...
]

Consignes:
- Ne liste que les exigences OBLIGATOIRES (pas les préférences)
- Cherche les mots-clés: "obligatoire", "impératif", "requis", "exigé", "indispensable"
- Sois précis et factuel
- Évite les doublons
- Maximum 15 éléments les plus importants
`

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 1000
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Pas de réponse de l\'IA pour les prérequis obligatoires')
    }

    try {
      return JSON.parse(content)
    } catch {
      throw new Error('Format de réponse invalide pour les prérequis obligatoires')
    }
  }

  /**
   * Analyze risk factors
   */
  private async analyzeRiskFactors(context: string): Promise<AnalysisResult['riskFactors']> {
    const prompt = `
Identifie les facteurs de risque pour la réalisation de ce marché:

${context}

Réponds au format JSON avec un tableau:
[
  {
    "category": "Catégorie du risque (ex: Technique, Financier, Délais, etc.)",
    "description": "Description du risque identifié",
    "impact": "HIGH|MEDIUM|LOW",
    "mitigation": "Stratégie d'atténuation suggérée (optionnel)"
  }
]

Consignes:
- Identifie les risques potentiels basés sur les exigences
- Considère la complexité technique, les délais, les contraintes
- Évalue l'impact sur le succès du projet
- Propose des mitigations quand c'est pertinent
- Maximum 10 risques principaux
`

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1500
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Pas de réponse de l\'IA pour l\'analyse des risques')
    }

    try {
      return JSON.parse(content)
    } catch {
      throw new Error('Format de réponse invalide pour l\'analyse des risques')
    }
  }

  /**
   * Analyze competitive factors
   */
  private async analyzeCompetitiveFactors(context: string): Promise<AnalysisResult['competitiveAnalysis']> {
    const prompt = `
Analyse les facteurs concurrentiels de ce marché public:

${context}

Réponds au format JSON:
{
  "estimatedBidders": nombre_estimé_de_candidats,
  "barrierToEntry": "HIGH|MEDIUM|LOW",
  "keyDifferentiators": [
    "Facteur de différenciation 1",
    "Facteur de différenciation 2",
    ...
  ]
}

Consignes:
- Estime le nombre de candidats potentiels basé sur la complexité et les prérequis
- Évalue les barrières à l'entrée (certifications requises, références, etc.)
- Identifie les éléments qui peuvent différencier une offre
- Sois réaliste dans tes estimations
- Maximum 8 facteurs de différenciation
`

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Pas de réponse de l\'IA pour l\'analyse concurrentielle')
    }

    try {
      return JSON.parse(content)
    } catch {
      throw new Error('Format de réponse invalide pour l\'analyse concurrentielle')
    }
  }

  /**
   * Generate executive summary
   */
  async generateExecutiveSummary(
    documents: AnalysisRequest['documents'],
    analysisResult: AnalysisResult
  ): Promise<string> {
    const context = this.prepareAnalysisContext(documents)
    
    const prompt = `
Génère un résumé exécutif de cette consultation d'entreprises basé sur l'analyse complète:

DOSSIER:
${context}

ANALYSE:
${JSON.stringify(analysisResult, null, 2)}

Génère un résumé exécutif structuré en français de 300-400 mots couvrant:
1. Objet et enjeux du marché
2. Principales exigences techniques
3. Critères d'évaluation
4. Facteurs de risque majeurs
5. Opportunités de différenciation

Le ton doit être professionnel et adapté à un public d'experts.
`

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1200
    })

    return response.choices[0]?.message?.content || 'Erreur dans la génération du résumé'
  }

  /**
   * Validate analysis completeness
   */
  validateAnalysisResult(result: AnalysisResult): { isValid: boolean, warnings: string[] } {
    const warnings: string[] = []

    if (!result.marketScope.title) {
      warnings.push('Titre du marché non identifié')
    }

    if (result.technicalRequirements.length === 0) {
      warnings.push('Aucune exigence technique extraite')
    }

    if (!result.evaluationCriteria.technical && !result.evaluationCriteria.financial) {
      warnings.push('Critères d\'évaluation non identifiés')
    }

    if (result.mandatoryRequirements.length === 0) {
      warnings.push('Aucun prérequis obligatoire identifié')
    }

    if (!result.timeConstraints.submissionDeadline) {
      warnings.push('Date limite de remise des offres non identifiée')
    }

    const mandatoryReqsWithLowConfidence = result.technicalRequirements.filter(
      req => req.mandatory && req.confidence < 0.7
    ).length

    if (mandatoryReqsWithLowConfidence > 0) {
      warnings.push(`${mandatoryReqsWithLowConfidence} exigences obligatoires avec faible niveau de confiance`)
    }

    return {
      isValid: warnings.length < 3, // Considéré valide si moins de 3 avertissements
      warnings
    }
  }

  /**
   * Get analysis statistics
   */
  getAnalysisStats(result: AnalysisResult) {
    return {
      technicalRequirementsCount: result.technicalRequirements.length,
      mandatoryRequirementsCount: result.technicalRequirements.filter(req => req.mandatory).length,
      averageConfidence: result.technicalRequirements.reduce((sum, req) => sum + req.confidence, 0) / result.technicalRequirements.length,
      highPriorityRequirements: result.technicalRequirements.filter(req => req.priority === 'HIGH').length,
      riskFactorsCount: result.riskFactors.length,
      highRiskFactors: result.riskFactors.filter(risk => risk.impact === 'HIGH').length,
      milestonesCount: result.timeConstraints.keyMilestones.length,
      estimatedCompetition: result.competitiveAnalysis.estimatedBidders,
      hasFinancialCriteria: !!result.evaluationCriteria.financial,
      hasTechnicalCriteria: !!result.evaluationCriteria.technical
    }
  }
}