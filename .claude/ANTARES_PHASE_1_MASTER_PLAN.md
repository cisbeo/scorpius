# 🎯 **ANTARES TENDER ASSISTANT - PHASE 1 MASTER PLAN**

*Généré le 2025-01-18 - Plan détaillé et cahier des charges complet*

## 📋 **RÉSUMÉ EXÉCUTIF**

### **Vision**
Transformer AutoRFP en assistant spécialisé pour les appels d'offres publics français, adapté aux expertises et besoins d'Antares (services IT : Infrastructure, Développement, Cybersécurité).

### **Objectif Phase 1**
Créer les fondations techniques et fonctionnelles permettant une spécialisation métier avec parsing DCE intelligent, catalogue services Antares, et capitalisation de l'expérience historique.

### **ROI Attendu**
- **Investissement** : 60.3k€ sur 8 semaines
- **Gain temps** : 15 jours → 7 jours par AO (-53%)  
- **Capacité traitement** : 4 AO/mois → 8 AO/mois (+100%)
- **Taux conformité** : 85% → 98% (+15%)

---

## 🎯 **OBJECTIFS PHASE 1**

### **Objectifs Fonctionnels**
1. **Parser DCE français** : Classification automatique CCTP/CCP/BPU + extraction structurée
2. **Catalogue Antares** : Services, compétences, références, pricing intégrés
3. **Historique AO** : Ingestion 50+ appels d'offres avec résultats win/loss
4. **Interface spécialisée** : Dashboard "Marchés Publics" vs RFP génériques

### **Objectifs Techniques**
1. **Extension architecture** : Nouveaux modèles sans régression existant
2. **Performance** : Parsing < 30s pour DCE 50 pages
3. **Scalabilité** : Architecture préparée Phase 2 (multi-RAG)
4. **Qualité** : Tests, documentation, monitoring

### **Objectifs Business**
1. **Validation concept** : 1 AO réel traité end-to-end avec succès
2. **Adoption utilisateurs** : Validation équipe commerciale Antares
3. **Différenciation** : Avantage concurrentiel vs concurrents
4. **Préparation Phase 2** : Intelligence prédictive et pricing optimal

---

## 📊 **PÉRIMÈTRE DÉTAILLÉ**

### **✅ INCLUS - Phase 1**

#### **1. Extension Base de Données**
- **Nouveaux modèles Prisma** :
  - `FrenchTender` : AO publics français structurés
  - `AntaresService` : Catalogue services par secteur
  - `ServiceReference` : Références projets clients
  - `HistoricalTender` : AO précédents avec résultats
- **Relations** : Intégration architecture existante
- **Migration** : Scripts zero-downtime
- **Performance** : Index optimisés pour volumétrie

#### **2. Parseur DCE Spécialisé**
- **Classification IA** : CCTP, CCP, BPU, RC (95% précision)
- **Extraction structurée** :
  - Objet du marché et périmètre technique
  - Exigences obligatoires vs recommandées  
  - Standards/normes (ANSSI, ISO, ITIL)
  - Critères de jugement détaillés
  - Contraintes temporelles critiques
- **Scoring complexité** : Algorithme 1-10 calibré
- **Timeline automatique** : Jalons et deadlines

#### **3. Catalogue Services Antares**
**Infrastructure (20+ services)** :
- Audit, conception, déploiement DC
- Virtualisation (VMware, Hyper-V)
- Cloud (Azure, AWS, hybride)  
- Réseau et sécurité périmétrique
- Sauvegarde, PRA, monitoring

**Développement (15+ services)** :
- Web (React, Angular, Vue)
- Mobile (iOS, Android, cross-platform)
- Applications métier (.NET, Java, Python)
- Intégration (API, ESB)
- IA/ML, DevOps, tests

**Cybersécurité (10+ services)** :
- Audit PASSI, pentest
- SOC 24/7, formation
- Conformité (RGPD, ISO27001)
- Architecture sécurisée, IAM

#### **4. Pricing Structuré**
- **Tarifs JH par niveau** : Junior 450€, Senior 650€, Expert 850€, Architect 1050€
- **Facteurs correctifs** : Urgence +20%, Complexité +15%, Risque +10%
- **Dégression volume** : -5% à -15% selon taille marché

#### **5. Base Références Projets**
- **15 références Infrastructure** : SNCF, Crédit Agricole, AXA
- **10 références Développement** : Applications critiques 
- **8 références Cybersécurité** : Audits, certifications
- **Format standardisé** : Client, secteur, enjeux, solution, résultats
- **Anonymisation** : Configurable selon confidentialité

#### **6. Ingestion Historique (50 AO minimum)**
- **Sources** : CRM, archives propositions, post-mortem
- **Données** : DCE + réponses Antares + résultats + pricing
- **Répartition** : 30 perdus, 15 gagnés, 5 non soumis
- **Période** : 3 années minimum
- **Structuration** : Format exploitable IA Phase 2

#### **7. Dialogue Conversationnel DCE** 🆕
- **Chat expert IA** : Assistant spécialisé marchés publics français
- **Questions naturelles** : "Quels sont les risques ?", "Sur quoi se différencier ?"
- **Contexte enrichi** : DCE + services Antares + références intégrées  
- **Recommandations actionnables** : Go/no-go, stratégie, pricing
- **Sources traçables** : Références documentaires systématiques

#### **8. Interface Utilisateur**
- **Dashboard "Marchés Publics"** : Layout spécialisé vs RFP
- **Vue DCE analysé** : Structure + scoring + timeline
- **Chat conversationnel** : Interface dialogue avec assistant IA
- **Catalogue intégré** : Sélection services Antares
- **Historique insights** : Patterns win/loss basiques

### **❌ EXCLUS - Phase 1**
- Génération automatique réponses complètes (Phase 2)
- Pricing optimal avec IA prédictive (Phase 2)
- Workflow validation équipe (Phase 3)  
- Intégrations PLACE/AWS-Achat (Phase 4)
- Analytics avancées et reporting (Phase 3)

---

## 🏗️ **ARCHITECTURE TECHNIQUE**

### **Stack Technique**
- **Base** : Extension Next.js 15 + React 19 + TypeScript existante
- **Backend** : Prisma + PostgreSQL (nouvelles tables)
- **IA** : OpenAI GPT-4o (prompts spécialisés français)
- **Parsing** : LlamaParse + classification intelligente
- **UI** : Shadcn/ui + Tailwind CSS (composants étendus)
- **Auth** : Supabase (préservé)

### **Nouveaux Services**
```typescript
lib/services/french-tender/
├── dce-parser.service.ts          // Classification et extraction DCE
├── dce-chat.service.ts            // 🆕 Dialogue conversationnel DCE
├── antares-catalog.service.ts     // Gestion catalogue services  
├── historical-tender.service.ts   // Ingestion et analyse historique
├── complexity-scorer.service.ts   // Algorithme scoring complexité
└── pricing-calculator.service.ts  // Calcul prix de base
```

### **Modèles de Données Étendus**
```typescript
// Extension schéma Prisma
model FrenchTender {
  id: string @id @default(cuid())
  tenderNumber: string
  publicationDate: DateTime
  submissionDeadline: DateTime
  contractingAuthority: string
  estimatedValue: Decimal?
  
  // Structure analysée
  dceStructure: Json
  technicalRequirements: Json
  evaluationCriteria: Json
  complexityScore: Int
  
  // Relations existantes
  project: Project @relation(fields: [projectId], references: [id])
  projectId: string
}

model AntaresService {
  id: string @id @default(cuid())
  serviceType: ServiceType // INFRASTRUCTURE, DEVELOPMENT, CYBERSECURITY  
  name: string
  description: string @db.Text
  unitPrice: Decimal
  competencyLevel: Int // 1-5
  certifications: String[]
  references: ServiceReference[]
}
```

---

## 📋 **SPÉCIFICATIONS FONCTIONNELLES**

### **F1 - Parseur DCE Intelligent**

#### **F1.1 - Classification Documents**
**Objectif** : Identifier automatiquement le type de chaque document DCE

**Critères d'acceptation** :
- ✅ CCTP : 95% précision
- ✅ CCP : 90% précision  
- ✅ BPU : 85% précision
- ✅ RC : 90% précision
- ✅ Interface correction manuelle si confiance < 80%

#### **F1.2 - Extraction Structurée**
**Objectif** : Extraire informations clés de chaque type de document

**CCTP - Extraction** :
- Objet du marché et périmètre technique
- Exigences techniques (obligatoires vs recommandées)
- Standards/normes applicables
- Technologies imposées vs ouvertes
- Niveaux de service requis
- Documentation attendue

**CCP - Extraction** :
- Modalités administratives
- Critères de sélection candidats
- Critères d'attribution (prix/technique/délai)
- Contraintes contractuelles

#### **F1.3 - Scoring Complexité**
**Algorithme** : Score 1-10 basé sur facteurs pondérés
- Nombre technologies (20%)
- Niveau sécurité (25%)
- Contraintes temporelles (15%)
- Volume fonctionnel (20%)
- Intégrations tierces (10%)  
- Certifications requises (10%)

**Validation** : ±1 point vs évaluation expert sur 20 AO test

### **F2 - Catalogue Services Antares**

#### **F2.1 - Structure par Domaine**
**Services catalogués par secteur avec** :
- Description détaillée
- Prérequis techniques
- Livrables types
- Durée moyenne
- Niveau expertise requis
- Certifications associées

#### **F2.2 - Pricing Intégré**
**Modèle tarifaire** :
- Prix de base par niveau compétence
- Facteurs correctifs automatiques
- Dégression volume
- Estimation automatique durée/coût

### **F3 - Ingestion Historique**

#### **F3.1 - Sources de Données**
- **CRM Antares** : Opportunités et résultats
- **Archives** : Documents propositions PDF
- **Post-mortem** : Analyses win/loss structurées
- **Suivi commercial** : Tableaux de bord Excel

#### **F3.2 - Structuration**
**Processus qualité** :
1. Déduplication des doublons
2. Standardisation formats (dates, montants)
3. Classification secteur/type/résultat  
4. Validation cohérence
5. Anonymisation si requis

**Métriques qualité** :
- 95% cohérence prix/prestations
- 100% dates valides
- 90% classifications correctes

---

## 🗓️ **PLANNING DÉTAILLÉ**

### **Sprint 1 (Semaines 1-2) : Setup & Modèles**
**Objectifs** :
- Extension architecture sans régression
- Modèles de données validés
- Parseur prototype

**Livrables** :
- [ ] Migration Prisma testée sur tous environnements
- [ ] Nouveaux modèles avec relations correctes
- [ ] Classification basique DCE (70% précision)
- [ ] Interface upload adaptée

**Ressources** : Lead Dev + Backend Dev + Data Engineer

### **Sprint 2 (Semaines 3-4) : Parseur & Catalogue**  
**Objectifs** :
- Parseur DCE production ready
- Catalogue services complet
- Scoring complexité calibré

**Livrables** :
- [ ] Classification DCE 95% précision
- [ ] Extraction structurée CCTP/CCP
- [ ] 45+ services Antares catalogués
- [ ] Scoring complexité ±1 point précision
- [ ] Tests unitaires complets

**Ressources** : Lead Dev + Backend Dev + PO

### **Sprint 3 (Semaines 5-6) : Historique & Références**
**Objectifs** :
- Ingestion données historiques
- Base références structurée
- Interface consultation

**Livrables** :
- [ ] 50+ AO historiques ingérés et validés
- [ ] 35+ références projets structurées  
- [ ] Interface catalogue et références
- [ ] Dashboard scoring et timeline
- [ ] Tests d'intégration

**Ressources** : Backend Dev + Data Engineer + UX Designer

### **Sprint 4 (Semaines 7-8) : Interface & Tests**
**Objectifs** :
- Interface utilisateur finalisée
- Tests utilisateurs
- Performance et monitoring

**Livrables** :
- [ ] Dashboard "Marchés Publics" complet
- [ ] Tests utilisateurs équipe commerciale
- [ ] Performance < 30s parsing DCE
- [ ] Documentation utilisateur
- [ ] Recette finale

**Ressources** : Lead Dev + UX Designer + PO

### **Jalons Critiques**
- **J14** : ✅ Modèles + parseur prototype validé
- **J28** : ✅ Parseur production + catalogue complet
- **J42** : ✅ Historique + références + interface
- **J56** : ✅ Recette + Go/No-Go Phase 2

---

## 💰 **BUDGET ET RESSOURCES**

### **Équipe Projet**
- **Lead Developer** (8 sem × 5j) : 40j × 600€ = **24.0k€**
- **Backend Developer** (6 sem × 5j) : 30j × 550€ = **16.5k€**  
- **Data Engineer** (4 sem × 3j) : 12j × 600€ = **7.2k€**
- **UX/UI Designer** (3 sem × 2j) : 6j × 500€ = **3.0k€**
- **Product Owner** (8 sem × 1j) : 8j × 700€ = **5.6k€**

**Sous-total Équipe : 56.3k€**

### **Infrastructure et Outils**
- Environnements additionnels : **2.0k€**
- Licences et outils : **1.0k€**  
- Tests et validation : **1.0k€**

**Sous-total Infra : 4.0k€**

### **TOTAL BUDGET PHASE 1 : 60.3k€**

### **Répartition Budget**
- Développement : 47.7k€ (79%)
- Management : 5.6k€ (9%)
- Design : 3.0k€ (5%)
- Infrastructure : 4.0k€ (7%)

---

## 📈 **CRITÈRES DE SUCCÈS**

### **Critères Quantitatifs - Obligatoires**
- ✅ **100% DCE test** (10 exemples) parsés correctement
- ✅ **95% précision** classification documents  
- ✅ **±10% écart** scoring complexité vs expert
- ✅ **100% services** Antares catalogués avec pricing
- ✅ **50+ AO historiques** ingérés et structurés
- ✅ **<30 secondes** parsing DCE 50 pages
- ✅ **<3 secondes** réponses dialogue conversationnel 🆕
- ✅ **0 régression** fonctionnalités existantes

### **Critères Qualitatifs - Obligatoires**  
- ✅ **Interface validée** par 3 utilisateurs métier
- ✅ **Données cohérentes** validées par expert commercial
- ✅ **Architecture évolutive** prête Phase 2
- ✅ **Documentation complète** maintenance/évolution

### **Critères Business - Go/No-Go**
- ✅ **Demo réussie** 1 AO réel traité end-to-end
- ✅ **Feedback positif** équipe commerciale (≥3/5)
- ✅ **Tests utilisateurs** sans blocage majeur
- ✅ **Validation ROI** projection Phase 2 confirmée

**Décision Phase 2** : 4/4 critères obligatoires + 3/4 critères Go/No-Go

---

## 🎯 **RISQUES ET MITIGATION**

### **Risques Techniques**
**Risque** : Précision parsing DCE insuffisante
**Impact** : Fort - Concept invalidé
**Mitigation** : Tests sur 50 DCE réels dès semaine 2, ajustement prompts

**Risque** : Performance dégradée architecture existante  
**Impact** : Fort - Régression utilisateurs
**Mitigation** : Tests non-régression automatisés, monitoring continu

### **Risques Fonctionnels**
**Risque** : Catalogue services incomplet/inexact
**Impact** : Moyen - Qualité réponses dégradée
**Mitigation** : Validation par experts métier, itérations courtes

**Risque** : Données historiques de mauvaise qualité
**Impact** : Moyen - Patterns incorrects Phase 2  
**Mitigation** : Processus nettoyage rigoureux, validation échantillon

### **Risques Projet**
**Risque** : Indisponibilité équipe commerciale tests
**Impact** : Moyen - Validation retardée
**Mitigation** : Planning validé en amont, créneaux bloqués

**Risque** : Scope creep demandes additionnelles
**Impact** : Moyen - Budget/planning dépassés
**Mitigation** : Phase 1 scope verrouillé, nouvelles demandes → Phase 2

---

## 🚀 **POST PHASE 1 - VISION SUITE**

### **Phase 2 - Intelligence Prédictive (3 mois)**
- **Multi-RAG** : 4 sources (Client + Services + Références + Historique)
- **Génération réponses** : Automatique avec contexte Antares
- **Pricing optimal** : IA prédictive basée sur historique
- **Win/Loss predictor** : ML sur patterns historiques

### **Phase 3 - Optimisation Business (3 mois)**  
- **Workflow équipe** : Circuit validation/approbation
- **Analytics avancées** : Dashboards performance, concurrence
- **A/B testing** : Optimisation continue réponses
- **ROI tracking** : Mesure impact réel business

### **Phase 4 - Écosystème Complet (6 mois)**
- **Intégrations externes** : PLACE, AWS-Achat APIs
- **Marketplace** : Réseau partenaires/sous-traitants
- **IA conversationnelle** : Assistant vocal
- **Expansion** : AO privés, marchés européens

---

## 📚 **DOCUMENTATION ASSOCIÉE**

### **Documents Techniques**
- `docs/TECHNICAL_ARCHITECTURE.md` - Architecture détaillée
- `docs/DATABASE_SCHEMA.md` - Modèles de données complets  
- `docs/API_SPECIFICATIONS.md` - Spécifications API
- `prisma/schema-phase1.prisma` - Extension schéma préparée

### **Documents Fonctionnels**
- `docs/FUNCTIONAL_SPECS.md` - Spécifications détaillées
- `docs/USER_STORIES.md` - Stories utilisateur
- `docs/TESTING_STRATEGY.md` - Plan de tests
- `docs/examples/` - Exemples DCE et données test

### **Documents Projet**  
- `DEVELOPMENT_SETUP.md` - Setup environnement développeur
- `PHASE_1_ROADMAP.md` - Planning détaillé avec jalons
- `TECHNICAL_DECISIONS.md` - Choix techniques documentés
- `NEXT_STEPS.md` - Actions prioritaires reprise projet

---

**Plan créé le : 2025-01-18**  
**Dernière mise à jour : 2025-01-18**  
**Version : 1.0**  
**Statut : Validé - Prêt pour développement**

---

*Ce plan constitue la référence complète pour la Phase 1 du projet Antares Tender Assistant. Il garantit la continuité et la reprise efficace du projet à tout moment.*