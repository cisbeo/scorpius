# 🗓️ **ROADMAP PHASE 1 - ANTARES TENDER ASSISTANT**

*Planning détaillé et jalons Phase 1 (8 semaines)*

## 📊 **VUE D'ENSEMBLE PLANNING**

### **Méthodologie**
- **Sprints** : 4 sprints de 2 semaines
- **Ceremonies** : Daily stand-up, sprint review, retrospective
- **Validation** : Démo fin de sprint avec parties prenantes
- **Livraison** : Incrémentale avec feedback continu

### **Équipe et Allocation**
- **Lead Developer** : 40j (5j/semaine × 8 semaines)
- **Backend Developer** : 30j (5j/semaine × 6 semaines)
- **Data Engineer** : 12j (3j/semaine × 4 semaines)
- **UX/UI Designer** : 6j (2j/semaine × 3 semaines)
- **Product Owner** : 8j (1j/semaine × 8 semaines)

### **Budget et Jalons**
- **Budget total** : 60.3k€
- **Jalons critiques** : J14, J28, J42, J56
- **Go/No-Go final** : Semaine 8

---

## 📅 **SPRINT 1 : FONDATIONS (SEMAINES 1-2)**

### **🎯 Objectifs Sprint 1**
- Extension architecture sans régression
- Modèles de données validés et migrés
- Parseur DCE prototype fonctionnel
- Interface d'upload adaptée

### **📋 User Stories Sprint 1**

#### **US1.1 - Extension Modèles Prisma**
**En tant que** développeur  
**Je veux** étendre le schéma Prisma avec les nouveaux modèles  
**Afin de** supporter les fonctionnalités marchés publics français

**Critères d'acceptation** :
- ✅ Nouveaux modèles créés : FrenchTender, AntaresService, ServiceReference, HistoricalTender
- ✅ Modèles chat : DCEChatSession, DCEChatMessage 🆕
- ✅ Relations correctes avec modèles existants 
- ✅ Migration zero-downtime testée sur tous environnements
- ✅ Index de performance créés
- ✅ 0 régression sur fonctionnalités existantes

**Effort** : 8 points  
**Assigné** : Lead Developer + Backend Developer

#### **US1.2 - Classification DCE Basique**
**En tant que** bid manager  
**Je veux** uploader un dossier DCE et obtenir une classification automatique  
**Afin de** identifier rapidement les documents CCTP, CCP, BPU

**Critères d'acceptation** :
- ✅ Upload multi-fichiers (PDF, DOC, DOCX)
- ✅ Classification automatique avec 70% précision minimum
- ✅ Interface correction manuelle si confiance < 80%
- ✅ Temps traitement < 45 secondes

**Effort** : 13 points  
**Assigné** : Lead Developer

#### **US1.3 - Chat Conversationnel DCE** 🆕
**En tant que** bid manager  
**Je veux** poser des questions en langage naturel sur un DCE analysé  
**Afin d'** obtenir des insights experts et des recommandations stratégiques

**Critères d'acceptation** :
- ✅ Interface chat intégrée à la vue DCE
- ✅ Questions suggérées contextuelles
- ✅ Réponses avec sources documentaires
- ✅ Temps réponse < 3 secondes
- ✅ Historique conversation persistant

**Effort** : 8 points  
**Assigné** : Lead Developer

#### **US1.4 - Interface Upload Adaptée**
**En tant que** utilisateur  
**Je veux** une interface spécialisée pour les DCE  
**Afin de** distinguer les AO publics des RFP génériques

**Critères d'acceptation** :
- ✅ Page dédiée `/tenders/create`
- ✅ Wizard étapes : Upload → Classification → Validation
- ✅ Design cohérent avec existant
- ✅ Responsive mobile/tablette

**Effort** : 5 points  
**Assigné** : UX Designer + Lead Developer

### **🔧 Tâches Techniques Sprint 1**

| Tâche | Responsable | Durée | Priorité |
|-------|-------------|-------|----------|
| Migration schéma Prisma | Backend Dev | 2j | P0 |
| Service classification documents | Lead Dev | 3j | P0 |
| API upload DCE | Lead Dev | 2j | P0 |
| Service dialogue conversationnel | Lead Dev | 2j | P1 |
| Interface upload/classification | UX + Lead | 3j | P1 |
| Interface chat conversationnel | Lead Dev | 1j | P1 |
| Tests unitaires parseur + chat | Lead Dev | 1j | P1 |
| Documentation technique | Lead Dev | 1j | P2 |

### **📦 Livrables Sprint 1**
- [ ] **Database** : Nouveaux modèles migrés et testés (+ chat)
- [ ] **API** : Endpoint `/api/tenders/parse-dce` + `/api/tenders/[id]/chat` 
- [ ] **Frontend** : Page upload DCE + interface chat conversationnel
- [ ] **Tests** : Couverture 80% nouveaux services
- [ ] **Demo** : Classification + dialogue sur 3 DCE test réels

### **🚧 Risques et Mitigation Sprint 1**
- **Risque** : Migration base cassant existant  
  **Mitigation** : Tests non-régression automatisés + backup
- **Risque** : Précision classification insuffisante  
  **Mitigation** : Dataset test élargi + ajustement prompts

---

## 📅 **SPRINT 2 : PARSING INTELLIGENT (SEMAINES 3-4)**

### **🎯 Objectifs Sprint 2**
- Parseur DCE production-ready (95% précision)
- Catalogue services Antares complet
- Scoring complexité calibré
- Extraction structurée CCTP/CCP

### **📋 User Stories Sprint 2**

#### **US2.1 - Extraction Structurée CCTP**
**En tant que** bid manager  
**Je veux** extraire automatiquement les exigences techniques du CCTP  
**Afin de** identifier rapidement les points critiques

**Critères d'acceptation** :
- ✅ Extraction objet du marché (100% des cas)
- ✅ Distinction exigences obligatoires vs recommandées
- ✅ Identification standards (ANSSI, ISO, ITIL)
- ✅ Détection technologies imposées vs ouvertes
- ✅ Extraction contraintes temporelles

**Effort** : 21 points  
**Assigné** : Lead Developer

#### **US2.2 - Catalogue Services Antares**
**En tant que** commercial  
**Je veux** accéder au catalogue complet des services Antares  
**Afin de** sélectionner les services pertinents pour l'AO

**Critères d'acceptation** :
- ✅ 45+ services catalogués (Infrastructure: 20+, Dev: 15+, Cyber: 10+)
- ✅ Informations complètes : description, pricing, technologies, certifications
- ✅ Interface consultation par secteur
- ✅ Recherche et filtres fonctionnels

**Effort** : 8 points  
**Assigné** : Backend Developer + Data Engineer

#### **US2.3 - Scoring Complexité**
**En tant que** bid manager  
**Je veux** obtenir un score de complexité automatique  
**Afin d'** estimer l'effort et les risques

**Critères d'acceptation** :
- ✅ Score 1-10 cohérent avec évaluation expert (±1 point)
- ✅ Facteurs détaillés : technologie, sécurité, délais, volume
- ✅ Estimation durée préparation automatique
- ✅ Justification explicite du scoring

**Effort** : 13 points  
**Assigné** : Lead Developer + Data Engineer

### **🔧 Tâches Techniques Sprint 2**

| Tâche | Responsable | Durée | Priorité |
|-------|-------------|-------|----------|
| Parseur CCTP avancé | Lead Dev | 4j | P0 |
| Base données services Antares | Data Engineer | 3j | P0 |
| Algorithme scoring complexité | Lead Dev | 3j | P0 |
| API catalogue services | Backend Dev | 2j | P0 |
| Interface catalogue | Lead Dev | 3j | P1 |
| Calibrage scoring sur 20 AO test | Data Engineer | 2j | P1 |

### **📦 Livrables Sprint 2**
- [ ] **Parseur** : Classification 95% + extraction CCTP structurée
- [ ] **Catalogue** : 45+ services Antares avec pricing
- [ ] **Scoring** : Algorithme complexité calibré ±1 point
- [ ] **API** : Endpoints catalogue et scoring fonctionnels
- [ ] **Demo** : Analyse complète 1 DCE réel avec scoring

### **🚧 Risques et Mitigation Sprint 2**
- **Risque** : Complexité scoring imprécise  
  **Mitigation** : Calibrage sur dataset élargi + validation experts
- **Risque** : Catalogue services incomplet  
  **Mitigation** : Sessions collecte avec équipes techniques Antares

---

## 📅 **SPRINT 3 : HISTORIQUE & RÉFÉRENCES (SEMAINES 5-6)**

### **🎯 Objectifs Sprint 3**
- Ingestion données historiques (50+ AO)
- Base références projets structurée (35+ références)
- Interface consultation catalogue/références
- Dashboard scoring et timeline

### **📋 User Stories Sprint 3**

#### **US3.1 - Ingestion Historique**
**En tant que** data analyst  
**Je veux** importer les données d'AO historiques d'Antares  
**Afin de** capitaliser sur l'expérience passée

**Critères d'acceptation** :
- ✅ 50+ AO historiques ingérés (30 perdus, 15 gagnés, 5 non soumis)
- ✅ Données nettoyées et validées (95% qualité)
- ✅ Classification secteur/type/résultat correcte
- ✅ Post-mortem structurés avec facteurs win/loss

**Effort** : 13 points  
**Assigné** : Data Engineer + Backend Developer

#### **US3.2 - Références Projets**
**En tant que** commercial  
**Je veux** accéder aux références projets pertinentes  
**Afin de** renforcer la crédibilité technique

**Critères d'acceptation** :
- ✅ 35+ références structurées par secteur
- ✅ Anonymisation configurable selon confidentialité
- ✅ Matching automatique par similarité (secteur + techno)
- ✅ Export format commercial (PDF)

**Effort** : 8 points  
**Assigné** : Backend Developer

#### **US3.3 - Dashboard Analyse AO**
**En tant que** bid manager  
**Je veux** visualiser l'analyse complète d'un AO  
**Afin de** prendre des décisions éclairées

**Critères d'acceptation** :
- ✅ Vue consolidée : complexité + timeline + services + références
- ✅ Graphiques interactifs (radar complexité, timeline Gantt)
- ✅ Export rapport PDF complet
- ✅ Interface responsive

**Effort** : 13 points  
**Assigné** : UX Designer + Lead Developer

### **🔧 Tâches Techniques Sprint 3**

| Tâche | Responsable | Durée | Priorité |
|-------|-------------|-------|----------|
| Scripts ingestion historique | Data Engineer | 3j | P0 |
| Base références projets | Backend Dev | 2j | P0 |
| Algorithme matching références | Backend Dev | 2j | P0 |
| Dashboard analyse AO | UX + Lead | 4j | P0 |
| API historique/références | Backend Dev | 2j | P1 |
| Export PDF rapports | Lead Dev | 2j | P1 |

### **📦 Livrables Sprint 3**
- [ ] **Historique** : 50+ AO ingérés avec qualité validée
- [ ] **Références** : 35+ projets structurés avec matching
- [ ] **Dashboard** : Interface analyse complète AO
- [ ] **Export** : Génération PDF rapports
- [ ] **Demo** : Analyse AO avec historique et références

### **🚧 Risques et Mitigation Sprint 3**
- **Risque** : Données historiques de mauvaise qualité  
  **Mitigation** : Processus validation strict + nettoyage manuel si besoin
- **Risque** : Matching références peu pertinent  
  **Mitigation** : Algorithme pondéré + validation utilisateur

---

## 📅 **SPRINT 4 : FINALISATION & TESTS (SEMAINES 7-8)**

### **🎯 Objectifs Sprint 4**
- Interface utilisateur finalisée et polie
- Tests utilisateurs avec équipe commerciale Antares
- Performance optimisée (<30s parsing)
- Documentation utilisateur complète

### **📋 User Stories Sprint 4**

#### **US4.1 - Interface Production**
**En tant qu'** utilisateur final  
**Je veux** une interface intuitive et performante  
**Afin de** traiter efficacement les AO

**Critères d'acceptation** :
- ✅ Design finalisé et cohérent
- ✅ Performance < 30s parsing DCE 50 pages
- ✅ Navigation fluide sans blocage
- ✅ Messages d'erreur explicites

**Effort** : 8 points  
**Assigné** : UX Designer + Lead Developer

#### **US4.2 - Tests Utilisateurs**
**En tant que** product owner  
**Je veux** valider l'utilisabilité avec l'équipe Antares  
**Afin de** garantir l'adoption

**Critères d'acceptation** :
- ✅ 5 utilisateurs testent pendant 2h chacun
- ✅ Satisfaction ≥ 3/5 pour chaque fonctionnalité
- ✅ 0 blocage majeur identifié
- ✅ Feedback intégré si critique

**Effort** : 5 points  
**Assigné** : Product Owner + Lead Developer

#### **US4.3 - Documentation & Formation**
**En tant qu'** administrateur  
**Je veux** une documentation complète  
**Afin de** former les équipes et maintenir la solution

**Critères d'acceptation** :
- ✅ Guide utilisateur illustré
- ✅ Documentation technique à jour
- ✅ Procédures de maintenance
- ✅ Support formation équipes

**Effort** : 3 points  
**Assigné** : Product Owner + Lead Developer

### **🔧 Tâches Techniques Sprint 4**

| Tâche | Responsable | Durée | Priorité |
|-------|-------------|-------|----------|
| Optimisation performance | Lead Dev | 2j | P0 |
| Polish interface utilisateur | UX + Lead | 3j | P0 |
| Tests utilisateurs | PO + équipe | 2j | P0 |
| Documentation utilisateur | PO | 2j | P0 |
| Tests charge et sécurité | Lead Dev | 2j | P1 |
| Préparation déploiement | Lead Dev | 1j | P1 |

### **📦 Livrables Sprint 4**
- [ ] **Performance** : < 30s parsing + interface fluide
- [ ] **Tests** : 5 utilisateurs validés avec satisfaction ≥3/5
- [ ] **Documentation** : Guide utilisateur + tech complets
- [ ] **Déploiement** : Version production ready
- [ ] **Demo finale** : Présentation complète parties prenantes

### **🚧 Risques et Mitigation Sprint 4**
- **Risque** : Tests utilisateurs révèlent problèmes majeurs  
  **Mitigation** : Tests early prototype + buffer correction
- **Risque** : Performance insuffisante  
  **Mitigation** : Monitoring continu + optimisations préventives

---

## 🎯 **JALONS CRITIQUES**

### **Jalon J14 (Fin Sprint 1) - Fondations Validées**
**Critères de validation** :
- ✅ Migration base de données sans régression
- ✅ Classification DCE 70% précision minimum
- ✅ Interface upload fonctionnelle
- ✅ Tests automatisés passants

**Livrables** :
- Démo classification 3 DCE test
- Code review architecture extension
- Plan Sprint 2 détaillé

### **Jalon J28 (Fin Sprint 2) - Core Features**
**Critères de validation** :
- ✅ Parsing DCE 95% précision
- ✅ Catalogue 45+ services Antares
- ✅ Scoring complexité ±1 point précision
- ✅ API complètes fonctionnelles

**Livrables** :
- Démo analyse complète DCE
- Validation scoring sur 20 AO test
- Feedback équipe technique Antares

### **Jalon J42 (Fin Sprint 3) - Intelligence Complete**
**Critères de validation** :
- ✅ 50+ AO historiques ingérés
- ✅ 35+ références projets structurées
- ✅ Dashboard analyse fonctionnel
- ✅ Export PDF opérationnel

**Livrables** :
- Démo intelligence historique
- Validation données avec commerciaux
- Tests d'intégration complets

### **Jalon J56 (Fin Sprint 4) - Go/No-Go Phase 2**
**Critères de validation** :
- ✅ Tests utilisateurs concluants (≥3/5)
- ✅ Performance objectives atteintes
- ✅ 1 AO réel traité end-to-end avec succès
- ✅ Documentation complète

**Décision** :
- **Go Phase 2** : Si 4/4 critères validés
- **Iteration supplémentaire** : Si 3/4 critères
- **Replanification** : Si <3/4 critères

---

## 📊 **SUIVI ET MÉTRIQUES**

### **KPIs Développement**

| Métrique | Cible Sprint 1 | Cible Sprint 2 | Cible Sprint 3 | Cible Sprint 4 |
|----------|----------------|----------------|----------------|----------------|
| **Couverture tests** | 60% | 75% | 85% | 90% |
| **Performance parsing** | <60s | <45s | <35s | <30s |
| **Précision classification** | 70% | 90% | 95% | 95% |
| **Satisfaction utilisateur** | N/A | N/A | N/A | ≥3/5 |

### **Métriques Qualité**

| Critère | Mesure | Outil |
|---------|--------|-------|
| **Code quality** | SonarQube score >B | SonarCloud |
| **Performance** | Core Web Vitals | Lighthouse |
| **Sécurité** | 0 vulnérabilité critique | Snyk |
| **Accessibilité** | WCAG AA compliant | axe-core |

### **Reporting Hebdomadaire**

**Format rapport sprint** :
- **Velocity** : Points story completed vs planned
- **Burndown** : Progression vs objectifs
- **Qualité** : Couverture tests + métriques qualité
- **Risques** : Identification + plan mitigation
- **Next steps** : Priorités semaine suivante

---

## 🚀 **PLAN DE DÉPLOIEMENT**

### **Environnements**

| Environnement | Utilisation | URL | Base Données |
|---------------|-------------|-----|--------------|
| **Development** | Développement local | localhost:3000 | PostgreSQL local |
| **Staging** | Tests/validation | staging.antares-tender.com | Supabase staging |
| **Production** | Utilisation finale | app.antares-tender.com | Supabase production |

### **Stratégie de Déploiement**

**Semaine 4** : Premier déploiement staging
- Features Sprint 1 + 2
- Tests fonctionnels équipe interne

**Semaine 6** : Déploiement staging complet  
- Features complètes Phase 1
- Tests utilisateurs équipe Antares

**Semaine 8** : Déploiement production
- Version finale validée
- Formation équipes utilisatrices
- Support Go-Live

### **Plan de Rollback**

En cas de problème critique :
1. **Rollback automatique** : Version précédente (< 5 min)
2. **Rollback base données** : Backup point-in-time
3. **Communication** : Notification équipes + plan résolution
4. **Post-mortem** : Analyse cause + prévention

---

**Roadmap créé le : 2025-01-18**  
**Version : 1.0 - Planning détaillé Phase 1**  
**Statut : Planning opérationnel prêt pour exécution**

*Ce roadmap constitue la feuille de route complète pour l'exécution réussie de la Phase 1 d'Antares Tender Assistant.*