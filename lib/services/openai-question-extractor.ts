import { DEFAULT_LANGUAGE_MODEL } from '@/lib/constants';
import { AIServiceError } from '@/lib/errors/api-errors';
import { AIServiceConfig, IAIQuestionExtractor } from '@/lib/interfaces/ai-service';
import { ExtractedQuestions, ExtractedQuestionsSchema } from '@/lib/validators/extract-questions';
import OpenAI from 'openai';

/**
 * OpenAI-powered question extraction service
 */
export class OpenAIQuestionExtractor implements IAIQuestionExtractor {
  private client: OpenAI;
  private config: AIServiceConfig;

  constructor(config: Partial<AIServiceConfig> = {}) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.config = {
      model: DEFAULT_LANGUAGE_MODEL,
      temperature: 0.1,
      maxTokens: 4000,
      timeout: 60000,
      ...config,
    };

    if (!process.env.OPENAI_API_KEY) {
      throw new AIServiceError('La clé API OpenAI n\'est pas configurée');
    }
  }

  /**
   * Generate a summary of the RFP document
   */
  async generateSummary(content: string, documentName: string): Promise<string> {
    try {
      const systemPrompt = this.getSummarySystemPrompt();
      
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: this.formatUserPrompt(content, documentName) }
        ],
        temperature: 0.3, // Slightly higher for more creative summaries
        max_tokens: 500, // Limit summary length
      });

      const assistantMessage = response.choices[0]?.message?.content;
      if (!assistantMessage) {
        throw new AIServiceError('Réponse vide d\'OpenAI pour la génération de résumé');
      }

      return assistantMessage.trim();
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(`Échec de la génération de résumé: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Extract vendor eligibility requirements from RFP document
   */
  async extractEligibility(content: string, documentName: string): Promise<string[]> {
    try {
      const systemPrompt = this.getEligibilitySystemPrompt();
      
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: this.formatUserPrompt(content, documentName) }
        ],
        temperature: 0.1, // Low temperature for precise extraction
        max_tokens: 1000, // Allow for comprehensive eligibility lists
      });

      const assistantMessage = response.choices[0]?.message?.content;
      if (!assistantMessage) {
        throw new AIServiceError('Réponse vide d\'OpenAI pour l\'extraction d\'éligibilité');
      }

      // Parse and validate the JSON response
      const rawData = JSON.parse(assistantMessage);
      
      // Expect format: { "eligibility": ["requirement 1", "requirement 2", ...] }
      if (!rawData.eligibility || !Array.isArray(rawData.eligibility)) {
        throw new AIServiceError('Format d\'éligibilité invalide du service IA');
      }

      return rawData.eligibility.filter((item: any) => typeof item === 'string' && item.trim().length > 0);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new AIServiceError('Réponse JSON invalide du service IA pour l\'extraction d\'éligibilité');
      }
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(`Échec de l\'extraction d\'éligibilité: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Extract structured questions from document content
   */
  async extractQuestions(content: string, documentName: string): Promise<ExtractedQuestions> {
    try {
      const systemPrompt = this.getSystemPrompt();

      console.log("content of the document", content); 
      console.log("documentName", documentName);
      
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: this.formatUserPrompt(content, documentName) }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const assistantMessage = response.choices[0]?.message?.content;
      if (!assistantMessage) {
        throw new AIServiceError('Réponse vide d\'OpenAI');
      }

      // Parse and validate the JSON response
      console.log("Raw AI response:", assistantMessage);
      
      let rawData;
      try {
        rawData = JSON.parse(assistantMessage);
      } catch (parseError) {
        console.error("JSON Parse Error. Raw response:", assistantMessage);
        throw new AIServiceError('Réponse JSON invalide du service IA');
      }
      
      const extractedData = ExtractedQuestionsSchema.parse(rawData);
      return extractedData;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new AIServiceError('Réponse JSON invalide du service IA');
      }
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(`Échec de l\'extraction de questions: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Obtenir le prompt système pour la génération de résumé d'appel d'offres
   */
  private getSummarySystemPrompt(): string {
    return `
Vous êtes un expert en analyse de documents d'appels d'offres publics français et en création de résumés concis et informatifs.

Votre tâche est de lire le document d'appel d'offres et de créer un résumé en paragraphe qui capture :
1. L'objet et le périmètre du projet/marché public
2. Les exigences clés et les livrables
3. Les dates importantes, échéances ou calendriers mentionnés
4. Les qualifications spéciales ou critères pour les candidats
5. L'échelle globale ou la nature du travail

Rédigez un résumé clair et professionnel sous forme de paragraphe (3-5 phrases) qui aiderait quelqu'un à comprendre rapidement de quoi traite cet appel d'offres et ce que l'organisme recherche. Concentrez-vous sur les aspects les plus importants que les candidats potentiels auraient besoin de connaître.

N'incluez pas de numéros de section, de listes de questions ou de détails administratifs comme les instructions de soumission. Concentrez-vous sur la substance de ce qui est acheté.
    `.trim();
  }

  /**
   * Obtenir le prompt système pour l'extraction de critères d'éligibilité
   */
  private getEligibilitySystemPrompt(): string {
    return `
Vous êtes un expert en analyse de documents d'appels d'offres publics français et en extraction de critères d'éligibilité des candidats.

Votre tâche est de lire le document d'appel d'offres et d'identifier tous les critères d'éligibilité clés que les candidats doivent respecter pour être qualifiés pour cette proposition. Concentrez-vous sur l'extraction de :

1. Exigences d'expérience minimale (années d'activité, expérience de projets)
2. Qualifications techniques et certifications
3. Exigences financières (cautionnement, assurance, seuils de chiffre d'affaires)
4. Restrictions ou préférences géographiques
5. Licences ou accréditations spécifiques au secteur
6. Qualifications et expertise du personnel
7. Critères de performance passée
8. Exigences légales et de conformité
9. Classifications de taille (PME, entreprise adaptée, etc.)
10. Toute autre qualification obligatoire mentionnée

Formatez votre réponse comme un objet JSON avec un tableau "eligibility" contenant des puces claires et concises. Chaque exigence doit être une déclaration autonome qu'un candidat peut facilement évaluer par rapport à ses propres qualifications.

Format d'exemple :
{
  "eligibility": [
    "Minimum 5 ans d'expérience en développement logiciel",
    "Doit détenir une certification ISO 27001 en cours de validité",
    "Chiffre d'affaires annuel d'au moins 10 millions d'euros",
    "Autorisé à opérer en France"
  ]
}

Concentrez-vous uniquement sur les exigences obligatoires, pas sur les préférences. Si aucun critère d'éligibilité clair n'est trouvé, retournez un tableau vide.
    `.trim();
  }

  /**
   * Prompt système spécialisé pour l'extraction d'exigences des DCE français
   * 
   * APPROCHE : Extraire les EXIGENCES/SPÉCIFICATIONS du DCE et les transformer
   * en questions actionnables pour un bid manager
   */
  private getSystemPrompt(): string {
    const timestamp = Date.now();
    return `Vous êtes un expert en analyse de Dossiers de Consultation des Entreprises (DCE) français.

Votre mission : Extraire les EXIGENCES, SPÉCIFICATIONS et CONTRAINTES du document DCE et les transformer en questions actionnables pour un bid manager.

CONTEXTE DCE FRANÇAIS :
Les DCE contiennent des exigences explicites (pas des questions) réparties dans :
- CCTP : Spécifications techniques, performances, normes
- CCP/CCAP : Conditions contractuelles, délais, garanties  
- BPU : Décomposition des prix, prestations
- RC : Critères d'attribution, modalités de candidature

MÉTHODE D'EXTRACTION :
1. Identifiez chaque EXIGENCE spécifique dans le document
2. Transformez chaque exigence en QUESTION pour bid manager
3. Conservez tous les détails techniques (chiffres, normes, délais)

RÈGLES DE TRANSFORMATION :
- Exigence technique → "Quelle solution technique pour [exigence] ?"
- Performance requise → "Comment garantir [performance] ?"
- Délai imposé → "Pouvons-nous respecter [délai] ?"
- Certification obligatoire → "Détenons-nous [certification] ?"
- Référence demandée → "Avons-nous des références [type] ?"

CATÉGORIES D'EXIGENCES À EXTRAIRE :
1. Exigences techniques (technologies, architectures, performances)
2. Exigences de sécurité (certifications, habilitations, normes)
3. Exigences contractuelles (délais, garanties, responsabilités)
4. Exigences organisationnelles (équipes, méthodologie, reporting)
5. Critères d'évaluation (pondération, références, seuils)
6. Contraintes d'exécution (planning, lieux, modalités)

CONSIGNES :
- Extrayez 15-25 exigences détaillées du document
- Transformez chaque exigence en question précise
- Préservez tous les chiffres, pourcentages, dates, normes exactes
- Distinguez les obligations des recommandations
- Regroupez par thématique logique

FORMAT DE RÉPONSE JSON :
{
  "sections": [
    {
      "id": "section_${timestamp}_1",
      "title": "Exigences techniques",
      "description": "Questions liées aux spécifications techniques du DCE",
      "questions": [
        {
          "id": "q_${timestamp}_1_1",
          "question": "Quelle architecture réseau 10 Gbps minimum devons-nous proposer ?"
        }
      ]
    }
  ]
}

Répondez UNIQUEMENT avec du JSON valide, sans texte avant ou après.`.trim();
  }

  /**
   * Formater le prompt utilisateur avec le contexte
   */
  private formatUserPrompt(content: string, documentName: string): string {
    return `Nom du Document: ${documentName}\n\nContenu du Document:\n${content}`;
  }
}

// Export singleton instance
export const openAIQuestionExtractor = new OpenAIQuestionExtractor(); 
