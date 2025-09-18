# 🏗️ **ARCHITECTURE TECHNIQUE - ANTARES TENDER ASSISTANT**

*Architecture détaillée pour l'extension spécialisée marchés publics français*

## 📊 **VUE D'ENSEMBLE ARCHITECTURE**

### **Principes Architecturaux**
- **Extension non-disruptive** : Préservation totale de l'existant
- **Separation of Concerns** : Nouveaux services indépendants  
- **Scalabilité** : Architecture préparée pour phases suivantes
- **Performance** : Pas de dégradation existant
- **Maintenabilité** : Code modulaire et documenté

### **Stack Technique Conservée**
```typescript
// Base existante préservée
Frontend: Next.js 15 + React 19 + TypeScript
Styling: Tailwind CSS + Shadcn/ui  
Backend: Next.js API Routes + Prisma ORM
Database: PostgreSQL + Vector extensions
Auth: Supabase (magic links)
AI: OpenAI GPT-4o + LlamaIndex + LlamaCloud
Deployment: Vercel (recommandé)
```

### **Extensions Ajoutées**
```typescript
// Nouveaux composants Phase 1
Parsing: LlamaParse + OpenAI classification
Vector DB: pgvector pour recherche similitude
ML: TensorFlow.js (préparatif Phase 2)
Export: Puppeteer pour PDF professionnels
Cache: Redis pour optimisation performance
```

---

## 🗄️ **ARCHITECTURE DONNÉES**

### **Extension Schéma Prisma**

```typescript
// Extension du schéma existant - Phase 1
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// === MODÈLES EXISTANTS PRÉSERVÉS ===
// User, Organization, Project, Question, Answer, etc.

// === NOUVEAUX MODÈLES PHASE 1 ===

model FrenchTender {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Identification officielle AO
  tenderNumber         String    // N° SIRET/PLACE/AWS-Achat
  publicationDate      DateTime
  submissionDeadline   DateTime
  estimatedValue       Decimal?  // Valeur estimée marché
  
  // Entité contractante
  contractingAuthority String
  authorityType        AuthorityType // COLLECTIVITE, ETAT, ETABLISSEMENT
  authoritySize        AuthoritySize // SMALL, MEDIUM, LARGE
  
  // Classification AO
  tenderType          TenderType    // APPEL_OFFRE, MARCHE_NEGOCIE, etc.
  sector              TenderSector  // IT_INFRASTRUCTURE, DEVELOPMENT, etc.
  
  // Documents analysés
  dceFiles            Json          // Liste fichiers uploadés avec métadonnées
  dceStructure        Json          // Structure analysée du DCE
  technicalRequirements Json        // CCTP extrait et structuré
  administrativeRequirements Json   // CCP/RC analysé
  evaluationCriteria  Json          // Critères de jugement détaillés
  
  // Analyse automatique
  complexityScore         Int      // 1-10 calculé automatiquement
  estimatedPreparationDays Int     // Estimation IA durée préparation
  mandatoryRequirements   String[] // Exigences obligatoires extraites
  
  // Intelligence business (Phase 2)
  winProbability      Float?       // Calculé par ML
  competitorAnalysis  Json?        // Analyse concurrentielle
  pricingInsights     Json?        // Recommandations prix
  
  // Relations
  project           Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId         String
  responses         TenderResponse[]
  
  @@index([tenderNumber])
  @@index([submissionDeadline])
  @@index([authorityType, sector])
  @@map("french_tenders")
}

model AntaresService {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Classification service
  serviceType     ServiceType    // INFRASTRUCTURE, DEVELOPMENT, CYBERSECURITY
  category        String         // Sous-catégorie (ex: "Virtualisation", "Web Dev")
  name            String         // Nom commercial du service
  description     String @db.Text // Description détaillée
  
  // Spécifications techniques
  technologies    String[]       // Technologies utilisées
  methodologies   String[]       // Méthodologies (Agile, ITIL, etc.)
  certifications  String[]       // Certifications requises/apportées
  
  // Pricing et ressources
  unitType        UnitType       // JOUR_HOMME, PROJET, FORFAIT
  basePrice       Decimal        // Prix de base en euros
  competencyLevel Int            // Niveau expertise requis 1-5
  teamSize        Int            // Taille équipe type
  duration        Int?           // Durée moyenne en jours
  
  // Facteurs de pricing
  complexityFactor    Float @default(1.0) // Multiplicateur complexité
  urgencyFactor      Float @default(1.0) // Multiplicateur urgence  
  riskFactor         Float @default(1.0) // Multiplicateur risque
  
  // Méta-données
  isActive        Boolean @default(true)
  displayOrder    Int     @default(0)
  
  // Relations
  references      ServiceReference[]
  tenderResponses TenderServiceMapping[]
  
  @@index([serviceType, isActive])
  @@index([category])
  @@map("antares_services")
}

model ServiceReference {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Client (avec anonymisation possible)
  clientName          String
  clientDisplayName   String?        // Nom affiché (anonymisé si besoin)
  clientSector        ClientSector   // BANQUE, TRANSPORT, COLLECTIVITE...
  clientSize          ClientSize     // PME, ETI, GRAND_COMPTE
  isConfidential      Boolean @default(false)
  
  // Projet réalisé
  projectName         String
  projectDescription  String @db.Text
  projectValue        Decimal?       // Valeur contrat si communiquable
  startDate          DateTime
  endDate            DateTime?
  duration           Int            // Durée en mois
  teamSize           Int            // Taille équipe mobilisée
  
  // Résultats et métriques
  successMetrics      Json           // KPIs, économies, performances
  clientSatisfaction  Int?           // Note 1-5
  clientTestimonial   String? @db.Text
  
  // Contexte technique
  challengesFaced     String[] // Défis techniques relevés
  solutionsProvided   String[] // Solutions apportées
  technologiesUsed    String[] // Stack technique utilisée
  
  // Relations
  service         AntaresService @relation(fields: [serviceId], references: [id])
  serviceId       String
  
  @@index([clientSector, isConfidential])
  @@index([serviceId])
  @@map("service_references")
}

model HistoricalTender {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  
  // Identification AO historique
  tenderNumber        String
  year               Int
  submissionDate     DateTime
  
  // Contexte marché
  contractingAuthority String
  authorityType       AuthorityType
  estimatedValue      Decimal
  actualValue         Decimal?      // Valeur réelle si connue
  
  // Classification
  sector              TenderSector
  tenderType          TenderType  
  complexity          Int           // 1-10
  
  // Contexte concurrentiel
  competitorsCount    Int?
  estimatedCompetitors String[]     // ["Capgemini", "Atos", "Sopra"]
  winnerCompany       String?
  winningPrice        Decimal?
  
  // Résultat Antares
  antaresResult       TenderResult  // WON, LOST, NOT_SUBMITTED
  antaresRank         Int?          // Position finale
  antaresPrice        Decimal?      // Prix proposé
  antaresScore        Json?         // Scores techniques/prix détaillés
  
  // Documents historiques
  originalDCE         String? @db.Text // DCE complet si disponible
  antaresResponse     String? @db.Text // Réponse Antares complète
  
  // Post-mortem et apprentissages
  winFactors          String[]      // Facteurs de succès
  lossReasons         String[]      // Raisons d'échec
  lessonsLearned      String? @db.Text
  competitorAnalysis  Json?         // Analyse concurrence
  
  // Métriques business
  preparationDays     Int?          // Temps de préparation
  preparationCost     Decimal?      // Coût interne préparation
  
  @@index([antaresResult, sector])
  @@index([year, authorityType])
  @@index([contractingAuthority])
  @@map("historical_tenders")
}

model TenderResponse {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Lien avec AO
  tender          FrenchTender @relation(fields: [tenderId], references: [id])
  tenderId        String
  
  // Stratégie réponse
  responseStrategy ResponseStrategy // AGGRESSIVE, BALANCED, PREMIUM
  targetMargin     Decimal         // Marge cible %
  
  // Proposition technique
  proposedServices TenderServiceMapping[]
  totalPrice       Decimal
  deliveryTime     Int             // Délai livraison jours
  
  // Évaluation
  technicalScore   Int?            // Score technique obtenu
  priceScore      Int?            // Score prix obtenu  
  finalScore      Int?            // Score final
  finalRank       Int?            // Classement final
  result          TenderResult?   // Résultat final
  
  // Métadonnées
  submittedAt     DateTime?
  submittedBy     String?         // User ID qui a soumis
  
  @@index([tenderId])
  @@map("tender_responses")
}

model TenderServiceMapping {
  id        String   @id @default(cuid())
  
  // Relations
  response    TenderResponse @relation(fields: [responseId], references: [id])
  responseId  String
  service     AntaresService @relation(fields: [serviceId], references: [id])
  serviceId   String
  
  // Quantités et pricing
  quantity        Decimal         // Quantité (JH, forfait, etc.)
  unitPrice       Decimal         // Prix unitaire appliqué
  totalPrice      Decimal         // Prix total ligne
  
  // Justification
  justification   String? @db.Text // Pourquoi ce service
  
  @@index([responseId])
  @@map("tender_service_mappings")
}

// === ENUMS ===

enum AuthorityType {
  COLLECTIVITE      // Commune, Département, Région
  ETAT             // Ministères, Services État
  ETABLISSEMENT    // EPA, EPIC, Hôpitaux
  AUTRE
}

enum AuthoritySize {
  SMALL    // < 10k habitants, budget < 10M€
  MEDIUM   // 10k-100k habitants, 10M€-100M€
  LARGE    // > 100k habitants, budget > 100M€
}

enum TenderType {
  APPEL_OFFRE_OUVERT
  APPEL_OFFRE_RESTREINT  
  MARCHE_NEGOCIE
  DIALOGUE_COMPETITIF
  PROCEDURE_ADAPTEE
}

enum TenderSector {
  IT_INFRASTRUCTURE
  IT_DEVELOPMENT
  IT_CYBERSECURITY
  IT_SUPPORT
  IT_CONSULTING
  IT_MIXED
}

enum ServiceType {
  INFRASTRUCTURE
  DEVELOPMENT
  CYBERSECURITY
  SUPPORT
  CONSULTING
}

enum UnitType {
  JOUR_HOMME       // Facturation au jour
  PROJET          // Forfait projet
  FORFAIT         // Forfait service
  ABONNEMENT      // Récurrent mensuel/annuel
}

enum ClientSector {
  BANQUE_FINANCE
  TRANSPORT_LOGISTIQUE
  COLLECTIVITE_PUBLIQUE
  SANTE
  INDUSTRIE
  RETAIL
  ENERGIE
  ASSURANCE
  EDUCATION
  DEFENSE
}

enum ClientSize {
  TPE      // < 10 employés
  PME      // 10-250 employés  
  ETI      // 250-5000 employés
  GE       // > 5000 employés
}

enum TenderResult {
  WON              // Marché gagné
  LOST             // Marché perdu
  NOT_SUBMITTED    // Non soumissionné
  CANCELLED        // AO annulé
  PENDING          // En cours évaluation
}

enum ResponseStrategy {
  AGGRESSIVE       // Prix bas, marge réduite
  BALANCED         // Équilibre prix/marge
  PREMIUM          // Prix élevé, forte marge
  STRATEGIC        // Prix stratégique (perte acceptable)
}
```

---

## 🔧 **ARCHITECTURE SERVICES**

### **Structure Services Existants**
```typescript
// Services préservés
lib/services/
├── question-extraction-service.ts    // Existant
├── response-generation-service.ts    // Existant  
├── llamacloud-client.ts              // Existant
├── organization-auth.ts              // Existant
└── ...autres services existants
```

### **Nouveaux Services Phase 1**
```typescript
// Extension services - Phase 1
lib/services/french-tender/
├── dce-parser.service.ts              // Classification et parsing DCE
├── dce-chat.service.ts                // 🆕 Dialogue conversationnel DCE
├── complexity-scorer.service.ts       // Algorithme scoring complexité
├── antares-catalog.service.ts         // Gestion catalogue services
├── reference-matcher.service.ts       // Matching références projets
├── historical-ingestion.service.ts    // Ingestion données historiques
├── pricing-calculator.service.ts      // Calculs prix de base
└── tender-analyzer.service.ts         // Orchestrateur analyse AO

lib/parsers/
├── cctp-parser.ts                     // Spécialisé CCTP
├── ccp-parser.ts                      // Spécialisé CCP
├── bpu-parser.ts                      // Spécialisé BPU
└── document-classifier.ts             // Classification IA documents

lib/algorithms/
├── complexity-algorithm.ts            // Calcul complexité
├── similarity-matcher.ts              // Matching similarité
└── pricing-factors.ts                 // Facteurs correction prix
```

### **DCE Parser Service - Architecture**
```typescript
// lib/services/french-tender/dce-parser.service.ts
export class DCEParserService {
  private documentClassifier: DocumentClassifier;
  private cctpParser: CCTPParser;
  private ccpParser: CCPParser;
  private bpuParser: BPUParser;
  private complexityScorer: ComplexityScorer;

  async parseDCE(files: File[]): Promise<ParsedDCE> {
    // 1. Classification des documents
    const classifiedDocs = await this.classifyDocuments(files);
    
    // 2. Parsing spécialisé par type
    const parsedData = await this.parseByType(classifiedDocs);
    
    // 3. Analyse croisée et cohérence
    const analysis = await this.performCrossAnalysis(parsedData);
    
    // 4. Scoring et métriques
    const metrics = await this.calculateMetrics(analysis);
    
    return {
      structure: analysis,
      complexity: metrics.complexityScore,
      estimatedDays: metrics.preparationDays,
      criticalRequirements: analysis.mandatory,
      timeline: this.generateTimeline(analysis),
      confidence: this.calculateConfidence(classifiedDocs)
    };
  }

  private async classifyDocuments(files: File[]): Promise<ClassifiedDocument[]> {
    const classifications = await Promise.all(
      files.map(file => this.documentClassifier.classify(file))
    );
    
    return classifications.map((classification, index) => ({
      file: files[index],
      type: classification.type,
      confidence: classification.confidence,
      pages: classification.pageCount,
      structure: classification.documentStructure
    }));
  }

  private async parseByType(docs: ClassifiedDocument[]): Promise<ParsedData> {
    const cctp = docs.find(d => d.type === 'CCTP');
    const ccp = docs.find(d => d.type === 'CCP');
    const bpu = docs.find(d => d.type === 'BPU');
    
    return {
      technical: cctp ? await this.cctpParser.parse(cctp) : null,
      administrative: ccp ? await this.ccpParser.parse(ccp) : null,
      pricing: bpu ? await this.bpuParser.parse(bpu) : null
    };
  }
}
```

### **DCE Chat Service** 🆕
```typescript
// lib/services/french-tender/dce-chat.service.ts
export class DCEChatService {
  private openai: OpenAI;
  private multiStepService: MultiStepResponseService;
  
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.multiStepService = new MultiStepResponseService();
  }

  async analyzeDCEContext(tender: FrenchTender): Promise<DCEChatContext> {
    // Construit contexte enrichi pour dialogue
    return {
      parsedDocuments: tender.dceStructure,
      antaresContext: await this.buildAntaresContext(tender),
      marketIntelligence: await this.buildMarketIntelligence(tender),
      complexityAnalysis: {
        score: tender.complexityScore,
        factors: tender.technicalRequirements,
        justification: await this.generateComplexityJustification(tender)
      },
      riskAssessment: await this.analyzeRisks(tender),
      opportunityScore: await this.calculateOpportunityScore(tender)
    };
  }

  async generateContextualResponse(
    query: string, 
    context: DCEChatContext,
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatResponse> {
    const prompt = this.buildExpertPrompt(query, context, conversationHistory);
    
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: DCE_EXPERT_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      functions: this.getAvailableFunctions(),
      temperature: 0.3
    });

    return {
      content: completion.choices[0].message.content,
      sources: await this.extractSources(completion),
      suggestedQuestions: await this.generateSuggestedQuestions(context, query),
      confidence: this.calculateConfidence(completion),
      timestamp: new Date()
    };
  }

  async generateSuggestedQuestions(
    context: DCEChatContext, 
    currentQuery?: string
  ): Promise<SuggestedQuestion[]> {
    // Questions contextuelles intelligentes basées sur l'analyse DCE
    const baseQuestions: SuggestedQuestion[] = [
      {
        category: "risks",
        text: "Quels sont les risques contractuels majeurs ?",
        priority: this.calculateRiskPriority(context)
      },
      {
        category: "differentiation", 
        text: "Sur quoi Antares peut se différencier ?",
        priority: this.calculateDifferentiationPriority(context)
      },
      {
        category: "strategy",
        text: "Dois-je soumissionner sur cet AO ?",
        priority: this.calculateGoNoGoPriority(context)
      }
    ];

    return this.contextualizeQuestions(baseQuestions, context, currentQuery);
  }

  private buildExpertPrompt(
    query: string, 
    context: DCEChatContext, 
    history: ChatMessage[]
  ): string {
    return `
CONTEXTE DCE:
- Appel d'offres: ${context.parsedDocuments.marketScope?.title}
- Complexité: ${context.complexityAnalysis.score}/10
- Autorité: ${context.parsedDocuments.contractingAuthority}
- Secteur: ${context.parsedDocuments.sector}

SERVICES ANTARES PERTINENTS:
${context.antaresContext.relevantServices.map(s => `- ${s.name}: ${s.description}`).join('\n')}

RÉFÉRENCES MATCHING:
${context.antaresContext.matchingReferences.map(r => `- ${r.projectName} (${r.clientSector})`).join('\n')}

HISTORIQUE CONVERSATION:
${history.map(m => `${m.role}: ${m.content}`).join('\n')}

QUESTION UTILISATEUR: ${query}

Réponds en tant qu'expert marchés publics français chez Antares, avec des recommandations précises et actionnables.
`;
  }
}
```

### **Antares Catalog Service**
```typescript
// lib/services/french-tender/antares-catalog.service.ts
export class AntaresCatalogService {
  async getServicesForRequirement(
    requirement: TechnicalRequirement
  ): Promise<AntaresService[]> {
    // 1. Analyse sémantique du besoin
    const requirementVector = await this.vectorizeRequirement(requirement);
    
    // 2. Recherche services similaires
    const candidateServices = await this.findSimilarServices(requirementVector);
    
    // 3. Filtrage par contraintes
    const filteredServices = this.filterByConstraints(
      candidateServices, 
      requirement.constraints
    );
    
    // 4. Scoring pertinence
    const scoredServices = await this.scoreRelevance(
      filteredServices,
      requirement
    );
    
    return scoredServices.slice(0, 5); // Top 5
  }

  async calculateServicePrice(
    service: AntaresService,
    context: PricingContext
  ): Promise<ServicePricing> {
    const basePrice = service.basePrice;
    
    const factors = {
      complexity: this.getComplexityFactor(context.complexity),
      urgency: this.getUrgencyFactor(context.deadline),
      risk: this.getRiskFactor(context.riskLevel),
      volume: this.getVolumeFactor(context.volume)
    };
    
    const adjustedPrice = basePrice * 
      factors.complexity * 
      factors.urgency * 
      factors.risk * 
      factors.volume;
      
    return {
      basePrice,
      adjustedPrice,
      factors,
      margin: this.calculateMargin(adjustedPrice, service.cost),
      confidence: this.calculatePriceConfidence(factors)
    };
  }
}
```

---

## 🎨 **ARCHITECTURE FRONTEND**

### **Extension Pages et Composants**
```typescript
// Pages étendues
app/
├── tenders/                           // NOUVEAU - Gestion AO
│   ├── page.tsx                      // Liste AO
│   ├── [tenderId]/
│   │   ├── analysis/page.tsx         // Analyse DCE
│   │   ├── services/page.tsx         // Sélection services
│   │   ├── pricing/page.tsx          // Calcul prix
│   │   └── response/page.tsx         // Génération réponse
│   └── create/page.tsx               // Création AO
├── catalog/                          // NOUVEAU - Catalogue Antares
│   ├── services/page.tsx             // Services par secteur
│   ├── references/page.tsx           // Références projets
│   └── pricing/page.tsx              // Calculateur prix
└── analytics/                        // NOUVEAU - Historique
    ├── historical/page.tsx           // AO historiques
    ├── performance/page.tsx          // Métriques win/loss
    └── insights/page.tsx             // Patterns et insights

// Composants spécialisés
components/tenders/
├── dce-analyzer/
│   ├── document-classifier.tsx       // Classification docs
│   ├── complexity-meter.tsx          // Affichage complexité
│   ├── requirements-extractor.tsx    // Visualisation exigences
│   └── timeline-generator.tsx        // Timeline automatique
├── catalog/
│   ├── service-selector.tsx          // Sélection services
│   ├── reference-showcase.tsx        // Affichage références
│   ├── pricing-calculator.tsx        // Calculateur interactif
│   └── competency-matrix.tsx         // Matrice compétences
└── analytics/
    ├── win-loss-chart.tsx            // Graphiques performance
    ├── competitor-analysis.tsx       // Analyse concurrence
    └── pricing-trends.tsx            // Tendances prix
```

### **Hooks Métier Spécialisés**
```typescript
// hooks/tenders/
export const useDCEParser = () => {
  const [parsing, setParsing] = useState(false);
  const [results, setResults] = useState<ParsedDCE | null>(null);
  
  const parseDCE = async (files: File[]) => {
    setParsing(true);
    try {
      const response = await fetch('/api/tenders/parse-dce', {
        method: 'POST',
        body: createFormData(files)
      });
      const results = await response.json();
      setResults(results);
    } finally {
      setParsing(false);
    }
  };
  
  return { parsing, results, parseDCE };
};

export const useAntaresCatalog = () => {
  const { data: services } = useSWR('/api/catalog/services');
  const { data: references } = useSWR('/api/catalog/references');
  
  const getServicesForSector = (sector: ServiceType) => 
    services?.filter(s => s.serviceType === sector) || [];
    
  const getReferencesForService = (serviceId: string) =>
    references?.filter(r => r.serviceId === serviceId) || [];
    
  return { services, references, getServicesForSector, getReferencesForService };
};
```

---

## 🔌 **ARCHITECTURE API**

### **Nouvelles Routes API**
```typescript
// app/api/tenders/
├── parse-dce/route.ts                 // POST - Parsing DCE
├── complexity-score/route.ts          // POST - Calcul complexité
├── [tenderId]/
│   ├── analysis/route.ts              // GET - Analyse complète
│   ├── chat/                          // 🆕 Dialogue conversationnel
│   │   ├── route.ts                   // POST - Nouvelle conversation
│   │   ├── [sessionId]/route.ts       // GET/POST - Messages session
│   │   └── suggestions/route.ts       // GET - Questions suggérées
│   ├── services/route.ts              // GET/POST - Services recommandés
│   └── pricing/route.ts               // POST - Calcul prix
└── historical/
    ├── route.ts                       // GET - Liste historique
    ├── patterns/route.ts              // GET - Patterns win/loss
    └── insights/route.ts              // GET - Insights business

// app/api/catalog/
├── services/
│   ├── route.ts                       // GET - Liste services
│   ├── [serviceId]/route.ts           // GET - Détail service
│   └── search/route.ts                // POST - Recherche services
├── references/
│   ├── route.ts                       // GET - Liste références
│   ├── [referenceId]/route.ts         // GET - Détail référence
│   └── search/route.ts                // POST - Recherche références
└── pricing/
    ├── calculate/route.ts             // POST - Calcul prix
    └── factors/route.ts               // GET - Facteurs correction
```

### **API DCE Parser**
```typescript
// app/api/tenders/parse-dce/route.ts
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    // Validation
    if (!files || files.length === 0) {
      throw new ValidationError('Aucun fichier fourni');
    }
    
    // Parsing avec service
    const dceParser = new DCEParserService();
    const results = await dceParser.parseDCE(files);
    
    // Sauvegarde si tenderId fourni
    const tenderId = formData.get('tenderId');
    if (tenderId) {
      await saveParsedDCE(tenderId as string, results);
    }
    
    return {
      success: true,
      data: results,
      metadata: {
        filesCount: files.length,
        processingTime: results.processingTime,
        confidence: results.confidence
      }
    };
  });
}
```

---

## 🚀 **DÉPLOIEMENT ET INFRASTRUCTURE**

### **Environnements**
```yaml
# Stratégie déploiement
Development:
  - Local: Next.js dev server
  - Database: PostgreSQL local
  - AI: OpenAI sandbox keys
  
Staging:
  - Vercel preview branch
  - Database: Supabase staging
  - AI: OpenAI production keys (rate limited)
  
Production:
  - Vercel production
  - Database: Supabase production 
  - AI: OpenAI production keys (full)
  - Monitoring: Vercel Analytics + Sentry
```

### **Variables d'Environnement Étendues**
```bash
# Nouvelles variables Phase 1
OPENAI_API_KEY_PARSING="sk-..."          # Clé dédiée parsing
VECTOR_DATABASE_URL="postgresql://..."   # pgvector activé
REDIS_URL="redis://..."                  # Cache performance
PUPPETEER_EXECUTABLE_PATH="/usr/bin/..."  # Export PDF

# Configuration métier
ANTARES_DEFAULT_MARGIN=0.15              # Marge par défaut 15%
COMPLEXITY_CALIBRATION_FACTOR=1.2        # Facteur calibration
HISTORICAL_DATA_RETENTION_YEARS=5        # Rétention données
```

### **Monitoring et Observabilité**
```typescript
// lib/monitoring/tender-metrics.ts
export const tenderMetrics = {
  // Performance
  dceParsingTime: histogram('dce_parsing_duration_seconds'),
  complexityCalculation: histogram('complexity_calculation_duration_seconds'),
  
  // Business
  tenderCreated: counter('tenders_created_total'),
  parsingErrors: counter('parsing_errors_total'),
  
  // Quality
  parsingAccuracy: gauge('parsing_accuracy_percentage'),
  userSatisfaction: gauge('user_satisfaction_score')
};
```

---

## 🔒 **SÉCURITÉ ET CONFIDENTIALITÉ**

### **Protection Données Sensibles**
- **Anonymisation références** : Masquage automatique noms clients
- **Isolation organisationnelle** : RLS Supabase étendu
- **Audit trail** : Logs toutes actions sensibles
- **Chiffrement** : Données sensibles chiffrées base

### **Conformité RGPD**
- **Consentement** : Opt-in explicite données historiques
- **Droit oubli** : Suppression cascade données liées
- **Portabilité** : Export JSON/CSV données utilisateur
- **Minimisation** : Collecte strictement nécessaire

---

**Architecture créée le : 2025-01-18**  
**Version : 1.0 - Phase 1**  
**Statut : Spécification technique détaillée**

*Cette architecture garantit une extension robuste et évolutive de l'application existante vers la spécialisation marchés publics français.*