import { 
  ContextAnalysis, 
  TaskType, 
  UrgencyLevel,
  AIRequest 
} from './types'

/**
 * Service d'analyse de contexte pour déterminer la complexité et le type de tâche
 * Optimisé pour les documents DCE français et les requêtes Antares
 */
export class ContextAnalyzerService {
  
  /**
   * Analyse le contexte complet d'une requête IA
   */
  async analyzeContext(
    content: string,
    urgency: UrgencyLevel = 'balanced',
    metadata?: Record<string, any>
  ): Promise<ContextAnalysis> {
    
    const complexity = this.analyzeComplexity(content)
    const taskType = this.classifyTask(content)
    const contentSize = this.estimateTokens(content)
    const languageOptimization = this.detectLanguageOptimization(content)
    const costBudget = this.estimateBudget(complexity, taskType, urgency)
    
    return {
      complexity,
      contentSize,
      taskType,
      urgency,
      costBudget,
      languageOptimization,
      metadata
    }
  }
  
  /**
   * Analyse la complexité d'une requête sur une échelle 1-10
   */
  private analyzeComplexity(content: string): number {
    const factors = {
      // Facteur longueur (0-3 points)
      length: Math.min(content.length / 1000, 3),
      
      // Facteur termes techniques (0-2 points)
      technicalTerms: this.countTechnicalTerms(content),
      
      // Facteur structure documentaire (0-3 points)  
      documentStructure: this.analyzeDocumentStructure(content),
      
      // Facteur exigences et contraintes (0-2 points)
      requirements: this.countRequirements(content)
    }
    
    const rawScore = 
      factors.length * 1.0 +           // Pondération longueur
      factors.technicalTerms * 2.0 +   // Pondération technique
      factors.documentStructure * 1.5 + // Pondération structure
      factors.requirements * 1.5        // Pondération exigences
    
    // Normalisation 1-10 avec courbe logistique
    return Math.max(1, Math.min(10, Math.round(rawScore)))
  }
  
  /**
   * Compte les termes techniques français spécialisés
   */
  private countTechnicalTerms(content: string): number {
    const technicalPatterns = [
      // Marchés publics
      /\b(CCTP|CCP|BPU|DCE|MAPA|DUME|ACTE)\b/gi,
      
      // Sécurité/ANSSI
      /\b(PASSI|ANSSI|ISO\s?27001|CSPN|RGS|RGPD)\b/gi,
      
      // Infrastructure IT
      /\b(VMware|vSphere|Hyper-V|Docker|Kubernetes|Terraform)\b/gi,
      
      // Cloud
      /\b(Azure|AWS|GCP|SaaS|IaaS|PaaS)\b/gi,
      
      // Réglementaire
      /\b(code\s+marchés?\s+publics?|SRCAE|RGAA|RGI|LPM)\b/gi,
      
      // Méthodologies
      /\b(ITIL|COBIT|Prince2|Agile|DevOps|SCRUM)\b/gi
    ]
    
    let termCount = 0
    technicalPatterns.forEach(pattern => {
      const matches = content.match(pattern)
      termCount += matches ? matches.length : 0
    })
    
    // Normalisation 0-2
    return Math.min(2, termCount / 5)
  }
  
  /**
   * Analyse la structure documentaire pour détecter la complexité
   */
  private analyzeDocumentStructure(content: string): number {
    let structureScore = 0
    
    // Sections et chapitres
    const sectionPatterns = [
      /chapitre\s+\d+/gi,
      /article\s+\d+/gi, 
      /section\s+\d+/gi,
      /^[IVX]+\.\s+/gm,  // Numérotation romaine
      /^\d+\.\d+\.\s+/gm // Numérotation décimale
    ]
    
    sectionPatterns.forEach(pattern => {
      const matches = content.match(pattern)
      if (matches && matches.length > 0) {
        structureScore += Math.min(1, matches.length / 10)
      }
    })
    
    // Éléments structurants
    const structuralElements = [
      /tableau|figure|annexe|schéma/gi,
      /\bvoir\s+annexe\b|\bci-joint\b|\bci-dessous\b/gi,
      /références?\s+normatives?/gi,
      /prescriptions?\s+techniques?/gi
    ]
    
    structuralElements.forEach(pattern => {
      if (pattern.test(content)) {
        structureScore += 0.5
      }
    })
    
    return Math.min(3, structureScore)
  }
  
  /**
   * Compte les exigences et contraintes dans le texte
   */
  private countRequirements(content: string): number {
    const requirementPatterns = [
      // Obligations
      /\b(doit|devra|est\s+tenu|obligation|exigence)\b/gi,
      
      // Contraintes temporelles
      /\b(délai|échéance|date\s+limite|dans\s+les?\s+\d+\s+jours?)\b/gi,
      
      // Normes et standards
      /\b(conforme?\s+à|respect\s+de|selon\s+la\s+norme)\b/gi,
      
      // Pénalités
      /\b(pénalité|sanction|retenue|résiliation)\b/gi,
      
      // Certifications
      /\b(certification|agrément|habilitation|qualification)\b/gi
    ]
    
    let requirementCount = 0
    requirementPatterns.forEach(pattern => {
      const matches = content.match(pattern)
      requirementCount += matches ? matches.length : 0
    })
    
    // Normalisation 0-2
    return Math.min(2, requirementCount / 8)
  }
  
  /**
   * Classification automatique du type de tâche
   */
  private classifyTask(content: string): TaskType {
    const taskPatterns = {
      CLASSIFY: [
        /classifier|catégoriser|identifier\s+le\s+type|quelle?\s+catégorie/i,
        /\b(CCTP|CCP|BPU|RC)\b.*document/i
      ],
      
      EXTRACT: [
        /extraire|identifier|analyser|détecter/i,
        /quels?\s+sont\s+les?|liste\s+des?|énumérer/i,
        /exigences?|contraintes?|obligations?/i
      ],
      
      GENERATE: [
        /générer|rédiger|créer|produire|élaborer/i,
        /réponse|proposition|offre|devis/i
      ],
      
      CALCULATE: [
        /calculer|estimer|évaluer|chiffrer/i,
        /prix|coût|tarif|budget|montant/i,
        /combien|quel\s+est\s+le\s+coût/i
      ],
      
      EMBED: [
        /recherche|similarité|comparable|ressemblant/i,
        /matching|correspondance|références?/i
      ],
      
      ANALYZE: [
        /analyser|évaluer|examiner|étudier/i,
        /complexité|risques?|opportunités?/i,
        /stratégie|recommandation|conseil/i
      ]
    }
    
    // Score chaque type de tâche
    const scores: Record<TaskType, number> = {
      CLASSIFY: 0,
      EXTRACT: 0, 
      GENERATE: 0,
      CALCULATE: 0,
      EMBED: 0,
      ANALYZE: 0
    }
    
    Object.entries(taskPatterns).forEach(([taskType, patterns]) => {
      patterns.forEach(pattern => {
        if (pattern.test(content)) {
          scores[taskType as TaskType] += 1
        }
      })
    })
    
    // Retourne le type avec le score le plus élevé
    const bestMatch = Object.entries(scores).reduce((best, [type, score]) => 
      score > best.score ? { type: type as TaskType, score } : best,
      { type: 'ANALYZE' as TaskType, score: 0 }
    )
    
    return bestMatch.type
  }
  
  /**
   * Estimation du nombre de tokens
   */
  private estimateTokens(content: string): number {
    // Estimation approximative : ~4 caractères par token en français
    // Plus précis que l'estimation anglaise standard (3.5 chars/token)
    return Math.ceil(content.length / 4)
  }
  
  /**
   * Détection du besoin d'optimisation française
   */
  private detectLanguageOptimization(content: string): 'french' | 'general' {
    const frenchIndicators = [
      // Mots typiquement français
      /\b(dont|où|lorsque|tandis|néanmoins|toutefois)\b/gi,
      
      // Termes marchés publics français
      /\b(marché|collectivité|préfecture|ministère|conseil\s+général)\b/gi,
      
      // Accents et caractères français
      /[àâäéèêëïîôöùûüÿñç]/g,
      
      // Structures syntaxiques françaises
      /qu'est-ce\s+que|c'est-à-dire|par\s+conséquent/gi
    ]
    
    let frenchScore = 0
    frenchIndicators.forEach(pattern => {
      const matches = content.match(pattern)
      frenchScore += matches ? matches.length : 0
    })
    
    // Si plus de 5 indicateurs français détectés
    return frenchScore > 5 ? 'french' : 'general'
  }
  
  /**
   * Estimation du budget nécessaire selon la complexité et le type de tâche
   */
  private estimateBudget(
    complexity: number, 
    taskType: TaskType, 
    urgency: UrgencyLevel
  ): number {
    // Budget de base par type de tâche (en euros)
    const baseBudgets = {
      CLASSIFY: 0.05,
      EXTRACT: 0.15,
      GENERATE: 0.25,
      CALCULATE: 0.10,
      EMBED: 0.02,
      ANALYZE: 0.30
    }
    
    // Multiplicateurs
    const complexityMultiplier = 1 + (complexity - 1) * 0.2 // 1.0 à 2.8
    const urgencyMultipliers = {
      fast: 1.0,      // Modèles rapides moins chers
      balanced: 1.2,  // Mix optimal
      quality: 1.5    // Modèles premium plus chers
    }
    
    const baseBudget = baseBudgets[taskType]
    const finalBudget = baseBudget * complexityMultiplier * urgencyMultipliers[urgency]
    
    return Math.round(finalBudget * 100) / 100 // Arrondi à 2 décimales
  }
  
  /**
   * Analyse contextuelle avancée pour les documents DCE
   */
  analyzeDocumentContext(content: string): {
    documentType: string | null
    estimatedPages: number
    hasStructuredData: boolean
    requiresDeepAnalysis: boolean
  } {
    // Détection type de document
    let documentType = null
    if (/CCTP|cahier.*clauses.*techniques/i.test(content)) {
      documentType = 'CCTP'
    } else if (/CCP|cahier.*clauses.*particulières/i.test(content)) {
      documentType = 'CCP'
    } else if (/BPU|bordereau.*prix.*unitaires/i.test(content)) {
      documentType = 'BPU'
    } else if (/règlement.*consultation/i.test(content)) {
      documentType = 'RC'
    }
    
    // Estimation nombre de pages (approximatif)
    const estimatedPages = Math.ceil(content.length / 2500) // ~2500 chars par page
    
    // Détection données structurées
    const hasStructuredData = /tableau|grille|matrice|\|.*\|.*\|/i.test(content)
    
    // Besoin d'analyse approfondie
    const requiresDeepAnalysis = 
      estimatedPages > 10 || 
      documentType === 'CCTP' ||
      /complexe|critique|sécurit[éèe]/i.test(content)
    
    return {
      documentType,
      estimatedPages,
      hasStructuredData,
      requiresDeepAnalysis
    }
  }
}