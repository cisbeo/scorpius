import OpenAI from 'openai';
import { IAIQuestionExtractor, AIServiceConfig } from '@/lib/interfaces/ai-service';
import { ExtractedQuestions, ExtractedQuestionsSchema } from '@/lib/validators/extract-questions';
import { DEFAULT_LANGUAGE_MODEL } from '@/lib/constants';
import { AIServiceError } from '@/lib/errors/api-errors';

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
      const rawData = JSON.parse(assistantMessage);
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
   * Obtenir le prompt système pour l'extraction de questions
   */
  private getSystemPrompt(): string {
    const timestamp = Date.now();
    return `
Vous êtes un expert en analyse de documents d'appels d'offres publics français et en extraction d'informations structurées.
Étant donné un document qui contient des questions d'appel d'offres, extrayez toutes les sections et questions dans un format structuré.

Identifiez soigneusement :
1. Les différentes sections (généralement numérotées comme 1.1, 1.2, etc.)
2. Les questions dans chaque section
3. Tout texte descriptif qui fournit un contexte pour la section

Formatez la sortie comme un objet JSON avec la structure suivante :
{
  "sections": [
    {
      "id": "section_${timestamp}_1",
      "title": "Titre de la Section",
      "description": "Texte de description optionnel pour la section",
      "questions": [
        {
          "id": "q_${timestamp}_1_1",
          "question": "Le texte exact de la question"
        }
      ]
    }
  ]
}

Exigences :
- Générez des IDs de référence uniques en utilisant le format : q_${timestamp}_<section>_<question> pour les questions
- Générez des IDs de référence uniques en utilisant le format : section_${timestamp}_<numéro> pour les sections  
- Préservez le texte exact des questions
- Incluez toutes les questions trouvées dans le document
- Groupez correctement les questions sous leurs sections
- Si une section a des sous-sections, créez des sections séparées pour chaque sous-section
- Le préfixe timestamp (${timestamp}) assure l'unicité entre différents téléchargements de documents

Répondez UNIQUEMENT en JSON valide.
    `.trim();
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