# 🗄️ **SCHÉMA BASE DE DONNÉES - ANTARES TENDER ASSISTANT**

*Spécifications détaillées des modèles de données Phase 1*

## 📊 **VUE D'ENSEMBLE**

### **Stratégie d'Extension**
- **Préservation totale** de l'architecture existante
- **Extension non-disruptive** avec nouveaux modèles
- **Relations cohérentes** avec models existants
- **Performance optimisée** avec indexation appropriée

### **Modèles Existants Préservés**
```typescript
✅ User                    // Gestion utilisateurs (Supabase)
✅ Organization           // Multi-tenant organizations  
✅ OrganizationUser      // RBAC (owner/admin/member)
✅ Project               // Projets RFP existants
✅ Question/Answer       // Q&A générées par IA
✅ KnowledgeBase         // Bases de connaissances org
✅ Source                // Sources documentaires
✅ ProjectIndex          // Index LlamaCloud
```

### **Nouveaux Modèles Phase 1**
```typescript
🆕 FrenchTender          // Appels d'offres publics français
🆕 DCEChatSession        // 🆕 Sessions dialogue conversationnel
🆕 DCEChatMessage        // 🆕 Messages et réponses IA
🆕 AntaresService        // Catalogue services par secteur
🆕 ServiceReference      // Références projets clients
🆕 HistoricalTender      // Historique AO (win/loss)
🆕 TenderResponse        // Réponses Antares aux AO
🆕 TenderServiceMapping  // Services utilisés par réponse
```

---

## 🎯 **MODÈLES MÉTIER DÉTAILLÉS**

### **1. FrenchTender - Appels d'Offres Français**

```typescript
model FrenchTender {
  id: String @id @default(cuid())
  
  // Identification officielle
  tenderNumber: String         // N° SIRET/PLACE/AWS-Achat
  publicationDate: DateTime    // Date publication officielle
  submissionDeadline: DateTime // Échéance remise offres
  estimatedValue: Decimal?     // Valeur estimée marché
  
  // Autorité contractante
  contractingAuthority: String    // Nom organisme
  authorityType: AuthorityType   // COLLECTIVITE/ETAT/ETABLISSEMENT
  authoritySize: AuthoritySize   // SMALL/MEDIUM/LARGE
  
  // Classification marché
  tenderType: TenderType         // Type procédure
  sector: TenderSector          // Secteur IT concerné
  
  // Documents analysés par IA
  dceStructure: Json            // Structure DCE complète
  technicalRequirements: Json   // CCTP extrait
  evaluationCriteria: Json      // Critères de jugement
  
  // Métriques automatiques
  complexityScore: Int          // 1-10 calculé par algorithme
  estimatedPreparationDays: Int // Estimation durée préparation
  mandatoryRequirements: String[] // Exigences obligatoires
  
  // Intelligence Phase 2
  winProbability: Float?        // ML prediction
  competitorAnalysis: Json?     // Analyse concurrentielle
  pricingInsights: Json?       // Recommandations prix
}
```

**Cas d'usage** :
- ✅ **Upload DCE** → Parsing automatique → Création FrenchTender
- ✅ **Analyse complexité** → Scoring 1-10 + estimation durée
- ✅ **Extraction exigences** → Identification points critiques
- ✅ **Timeline automatique** → Jalons et échéances

**Relations** :
- `Project` (1:N) : Un projet peut avoir plusieurs AO
- `TenderResponse` (1:N) : Réponses Antares à cet AO
- `DCEChatSession` (1:N) : Sessions de dialogue pour cet AO

### **2. DCEChatSession - Sessions Dialogue Conversationnel** 🆕

```typescript
model DCEChatSession {
  id: String @id @default(cuid())
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt
  
  // Contexte session
  title: String                    // Titre session ("Analyse AO Ministère...")
  isActive: Boolean @default(true) // Session active ou archivée
  
  // Métadonnées contextuelles
  dceContext: Json                 // Contexte DCE enrichi pour IA
  conversationSummary: String?     // Résumé automatique conversation
  keyInsights: String[]           // Points clés extraits
  
  // Relations
  tender: FrenchTender @relation(fields: [tenderId], references: [id])
  tenderId: String
  user: User @relation(fields: [userId], references: [id])
  userId: String
  messages: DCEChatMessage[]
  
  @@index([tenderId, isActive])
  @@index([userId, updatedAt])
  @@map("dce_chat_sessions")
}
```

### **3. DCEChatMessage - Messages et Réponses IA** 🆕

```typescript
model DCEChatMessage {
  id: String @id @default(cuid())
  createdAt: DateTime @default(now())
  
  // Message data
  role: MessageRole               // USER, ASSISTANT, SYSTEM
  content: String @db.Text        // Contenu message/réponse
  
  // Métadonnées IA (pour messages ASSISTANT)
  sources: Json?                  // Sources documentaires utilisées
  confidence: Float?              // Niveau confiance réponse 0-1
  processingTime: Int?            // Temps génération (ms)
  suggestedQuestions: String[]    // Questions suggérées suivantes
  
  // Contexte conversation
  isFollowUp: Boolean @default(false)  // Message de suivi
  parentMessageId: String?             // Référence message parent
  
  // Relations
  session: DCEChatSession @relation(fields: [sessionId], references: [id])
  sessionId: String
  
  @@index([sessionId, createdAt])
  @@map("dce_chat_messages")
}

enum MessageRole {
  USER       // Question bid manager
  ASSISTANT  // Réponse IA expert
  SYSTEM     // Messages système/notifications
}
```

**Fonctionnalités** :
- ✅ **Historique persistant** : Conversations sauvegardées par AO
- ✅ **Contexte enrichi** : DCE + services + références intégrés
- ✅ **Sources traçables** : Références documentaires pour chaque réponse
- ✅ **Questions suggérées** : IA propose questions pertinentes
- ✅ **Export insights** : Résumé conversations → PDF
- ✅ **Performance tracking** : Temps réponse et qualité

### **4. AntaresService - Catalogue Services**

```typescript
model AntaresService {
  id: String @id @default(cuid())
  
  // Classification
  serviceType: ServiceType      // INFRASTRUCTURE/DEVELOPMENT/CYBERSECURITY
  category: String              // Sous-catégorie technique
  name: String                  // Nom commercial
  description: String @db.Text  // Description détaillée
  
  // Spécifications techniques
  technologies: String[]        // Stack technique
  certifications: String[]      // Certif requises/apportées
  competencyLevel: Int          // Niveau expertise 1-5
  
  // Pricing
  unitType: UnitType           // JOUR_HOMME/PROJET/FORFAIT
  basePrice: Decimal           // Prix de base €
  teamSize: Int                // Taille équipe type
  duration: Int?               // Durée moyenne jours
  
  // Facteurs correction prix
  complexityFactor: Float      // Multiplicateur complexité
  urgencyFactor: Float         // Multiplicateur urgence
  riskFactor: Float           // Multiplicateur risque
}
```

**Catalogue Prédéfini** :

**Infrastructure (20+ services)** :
- Audit infrastructure existante
- Conception architecture DC
- Virtualisation VMware/Hyper-V  
- Cloud Azure/AWS/hybride
- Réseau et sécurité périmétrique
- Sauvegarde et PRA
- Monitoring et supervision

**Développement (15+ services)** :
- Développement web React/Angular
- Applications mobiles iOS/Android
- Applications métier .NET/Java
- Intégration systèmes API/ESB
- IA/ML et data science
- DevOps et automatisation

**Cybersécurité (10+ services)** :
- Audit sécurité PASSI
- Tests d'intrusion
- SOC 24/7
- Formation sensibilisation
- Mise en conformité RGPD/ISO27001

### **3. ServiceReference - Références Projets**

```typescript
model ServiceReference {
  id: String @id @default(cuid())
  
  // Client (anonymisable)
  clientName: String              // Nom réel
  clientDisplayName: String?      // Nom affiché (anonymisé)
  clientSector: ClientSector      // Secteur activité
  clientSize: ClientSize          // Taille entreprise
  isConfidential: Boolean         // Anonymisation requise
  
  // Projet réalisé
  projectName: String
  projectDescription: String @db.Text
  projectValue: Decimal?          // Valeur si communiquable
  duration: Int                   // Durée mois
  teamSize: Int                   // Équipe mobilisée
  
  // Résultats
  successMetrics: Json            // KPIs, économies
  clientTestimonial: String?      // Témoignage
  technologiesUsed: String[]      // Stack utilisée
}
```

**Exemples Références Antares** :
- **SNCF** : Migration 500 serveurs vers cloud hybride
- **Crédit Agricole** : SOC cybersécurité 24/7
- **AXA** : Application mobile 2M+ utilisateurs
- **Radio France** : Audit sécurité ANSSI

### **4. HistoricalTender - Historique AO**

```typescript
model HistoricalTender {
  id: String @id @default(cuid())
  
  // Identification historique
  tenderNumber: String
  year: Int
  contractingAuthority: String
  estimatedValue: Decimal
  
  // Contexte concurrentiel
  competitorsCount: Int?
  estimatedCompetitors: String[]  // ["Capgemini", "Atos"]
  winnerCompany: String?
  winningPrice: Decimal?
  
  // Résultat Antares
  antaresResult: TenderResult     // WON/LOST/NOT_SUBMITTED
  antaresPrice: Decimal?
  antaresRank: Int?
  
  // Apprentissages
  winFactors: String[]            // Facteurs succès
  lossReasons: String[]           // Raisons échec
  lessonsLearned: String @db.Text
}
```

**Données Historiques Cibles** :
- **50+ AO minimum** (30 perdus, 15 gagnés, 5 non soumis)
- **3 années historique** (2022-2024)
- **Répartition sectorielle** représentative
- **Post-mortem structurés** pour chaque AO

---

## 🔗 **RELATIONS ET CARDINALITÉS**

### **Relations Principales**

```typescript
// Relations existantes préservées
User 1:N OrganizationUser N:1 Organization
Organization 1:N Project
Project 1:N Question 1:1 Answer
Answer 1:N Source

// Nouvelles relations Phase 1  
Project 1:N FrenchTender              // Projet → AO français
FrenchTender 1:N TenderResponse       // AO → Réponses Antares
TenderResponse 1:N TenderServiceMapping N:1 AntaresService
AntaresService 1:N ServiceReference   // Service → Références
```

### **Cardinalités Détaillées**

| Relation | Cardinalité | Description |
|----------|-------------|-------------|
| `Organization → Project` | 1:N | Une org a plusieurs projets |
| `Project → FrenchTender` | 1:N | Un projet peut avoir plusieurs AO |
| `FrenchTender → TenderResponse` | 1:N | Plusieurs versions réponse possible |
| `AntaresService → ServiceReference` | 1:N | Service a plusieurs références |
| `TenderResponse → TenderServiceMapping` | 1:N | Réponse utilise plusieurs services |

---

## 📊 **INDEXATION ET PERFORMANCE**

### **Index Stratégiques**

```sql
-- Performance recherche AO
CREATE INDEX idx_french_tenders_deadline ON french_tenders(submission_deadline);
CREATE INDEX idx_french_tenders_authority_sector ON french_tenders(authority_type, sector);
CREATE INDEX idx_french_tenders_complexity ON french_tenders(complexity_score);

-- Performance catalogue services  
CREATE INDEX idx_antares_services_type_active ON antares_services(service_type, is_active);
CREATE INDEX idx_antares_services_category ON antares_services(category);

-- Performance historique analytics
CREATE INDEX idx_historical_result_sector ON historical_tenders(antares_result, sector);
CREATE INDEX idx_historical_year_authority ON historical_tenders(year, authority_type);
CREATE INDEX idx_historical_authority ON historical_tenders(contracting_authority);

-- Performance références
CREATE INDEX idx_references_sector_confidential ON service_references(client_sector, is_confidential);
CREATE INDEX idx_references_service ON service_references(service_id);
```

### **Optimisations Volumétrie**

| Table | Volume Estimé | Stratégie |
|-------|---------------|-----------|
| `FrenchTender` | 1000+ AO | Index deadline + autorité |
| `AntaresService` | 50 services | Cache applicatif |
| `ServiceReference` | 100+ références | Pagination + filtres |
| `HistoricalTender` | 300+ historique | Partitioning par année |

---

## 🔄 **MIGRATION ET DÉPLOIEMENT**

### **Script Migration Prisma**

```typescript
-- Migration 001_add_french_tender_models.sql
BEGIN;

-- Création des nouveaux ENUM
CREATE TYPE "AuthorityType" AS ENUM ('COLLECTIVITE', 'ETAT', 'ETABLISSEMENT', 'AUTRE');
CREATE TYPE "TenderType" AS ENUM ('APPEL_OFFRE_OUVERT', 'APPEL_OFFRE_RESTREINT', 'MARCHE_NEGOCIE', 'DIALOGUE_COMPETITIF', 'PROCEDURE_ADAPTEE');
CREATE TYPE "ServiceType" AS ENUM ('INFRASTRUCTURE', 'DEVELOPMENT', 'CYBERSECURITY', 'SUPPORT', 'CONSULTING');
CREATE TYPE "TenderResult" AS ENUM ('WON', 'LOST', 'NOT_SUBMITTED', 'CANCELLED', 'PENDING');

-- Création table FrenchTender
CREATE TABLE "french_tenders" (
  "id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "tender_number" TEXT NOT NULL,
  "publication_date" TIMESTAMP(3) NOT NULL,
  "submission_deadline" TIMESTAMP(3) NOT NULL,
  "estimated_value" DECIMAL,
  "contracting_authority" TEXT NOT NULL,
  "authority_type" "AuthorityType" NOT NULL,
  "authority_size" "AuthoritySize" NOT NULL,
  "tender_type" "TenderType" NOT NULL,
  "sector" "TenderSector" NOT NULL,
  "dce_structure" JSONB NOT NULL,
  "technical_requirements" JSONB NOT NULL,
  "evaluation_criteria" JSONB NOT NULL,
  "complexity_score" INTEGER NOT NULL,
  "estimated_preparation_days" INTEGER NOT NULL,
  "mandatory_requirements" TEXT[],
  "project_id" TEXT NOT NULL,
  CONSTRAINT "french_tenders_pkey" PRIMARY KEY ("id")
);

-- Création des autres tables...
-- (Script complet généré par Prisma)

-- Création des index
CREATE INDEX "idx_french_tenders_deadline" ON "french_tenders"("submission_deadline");
CREATE INDEX "idx_french_tenders_authority_sector" ON "french_tenders"("authority_type", "sector");

-- Relations foreign keys
ALTER TABLE "french_tenders" ADD CONSTRAINT "french_tenders_project_id_fkey" 
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
```

### **Stratégie Migration Zero-Downtime**

1. **Phase Préparation** :
   - Création nouvelles tables en parallèle
   - Tests migration sur copie base
   - Validation performances index

2. **Phase Déploiement** :
   - Migration schéma (< 5 secondes)
   - Restart application (< 30 secondes) 
   - Validation fonctionnelle

3. **Phase Rollback** (si nécessaire) :
   - Script rollback automatique
   - Suppression nouvelles tables
   - Retour version précédente

---

## 📋 **DONNÉES DE TEST ET EXEMPLES**

### **Jeu de Données Test**

```typescript
// Exemples FrenchTender
{
  tenderNumber: "2024-MAIRIE-PARIS-001",
  contractingAuthority: "Mairie de Paris",
  authorityType: "COLLECTIVITE",
  sector: "IT_INFRASTRUCTURE", 
  estimatedValue: 500000,
  complexityScore: 7,
  technicalRequirements: {
    datacenters: 2,
    servers: 100,
    security: "ISO27001",
    availability: "99.9%"
  }
}

// Exemples AntaresService  
{
  serviceType: "INFRASTRUCTURE",
  name: "Migration Cloud Hybride",
  basePrice: 850,
  competencyLevel: 4,
  technologies: ["VMware", "Azure", "AWS"]
}

// Exemples ServiceReference
{
  clientDisplayName: "Grande Banque Française",
  clientSector: "BANQUE_FINANCE", 
  projectDescription: "Migration 500 serveurs vers cloud hybride",
  successMetrics: {
    availability: "99.99%",
    costSaving: "30%",
    migrationTime: "6 mois"
  }
}
```

### **Données Seed Phase 1**

```typescript
// scripts/seed-phase1.ts
export const seedAntaresServices = [
  // Infrastructure (20 services)
  { name: "Audit Infrastructure", basePrice: 750, competencyLevel: 4 },
  { name: "Virtualisation VMware", basePrice: 850, competencyLevel: 5 },
  // ... 18 autres services infrastructure
  
  // Développement (15 services)  
  { name: "Développement Web React", basePrice: 650, competencyLevel: 3 },
  { name: "Application Mobile", basePrice: 700, competencyLevel: 4 },
  // ... 13 autres services développement
  
  // Cybersécurité (10 services)
  { name: "Audit Sécurité PASSI", basePrice: 950, competencyLevel: 5 },
  { name: "Tests Intrusion", basePrice: 800, competencyLevel: 4 },
  // ... 8 autres services cybersécurité
];

export const seedServiceReferences = [
  // 35+ références réparties par secteur
  { clientName: "SNCF", sector: "TRANSPORT", project: "Migration DC" },
  { clientName: "Credit Agricole", sector: "BANQUE", project: "SOC 24/7" },
  // ... autres références
];
```

---

## 🔒 **SÉCURITÉ ET CONFIDENTIALITÉ**

### **Row Level Security (RLS)**

```sql
-- Isolation organisationnelle pour FrenchTender
CREATE POLICY "french_tenders_org_isolation" ON "french_tenders"
  USING (
    project_id IN (
      SELECT p.id FROM projects p 
      JOIN organization_users ou ON p.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Anonymisation automatique références confidentielles
CREATE POLICY "references_confidentiality" ON "service_references"
  USING (
    CASE 
      WHEN is_confidential = true 
      THEN client_display_name IS NOT NULL
      ELSE true
    END
  );
```

### **Chiffrement Données Sensibles**

```typescript
// Champs chiffrés au niveau application
interface EncryptedFields {
  clientTestimonial: string;    // Chiffré si confidentiel
  lessonsLearned: string;       // Chiffré pour protection IP
  antaresResponse: string;      // Chiffré pour confidentialité
}
```

---

**Schéma créé le : 2025-01-18**  
**Version : 1.0 - Phase 1**  
**Statut : Spécification complète prête pour implémentation**

*Ce schéma constitue la base de données complète pour la Phase 1, garantissant performance, sécurité et évolutivité.*