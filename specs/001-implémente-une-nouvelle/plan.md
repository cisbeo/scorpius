# Implementation Plan: Analyseur d'Appels d'Offres Français

**Branch**: `001-implémente-une-nouvelle` | **Date**: 2025-09-19 | **Spec**: [/specs/001-implémente-une-nouvelle/spec.md]
**Input**: Feature specification from `/specs/001-implémente-une-nouvelle/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ DONE: Spec loaded from /specs/001-implémente-une-nouvelle/spec.md
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ DONE: Technical context filled with existing codebase stack
3. Fill the Constitution Check section based on the content of the constitution document.
   → ✅ DONE: Constitution requirements identified
4. Evaluate Constitution Check section below
   → ✅ DONE: No violations identified
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → ✅ DONE: Research completed for French document analysis improvements
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✅ DONE: Design artifacts generated
7. Re-evaluate Constitution Check section
   → ✅ DONE: Post-design check passed
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Task generation approach described
9. STOP - Ready for /tasks command
```

## Summary
Feature pour analyser automatiquement les documents d'appels d'offres publics français (DCE) avec classification IA, extraction structurée des exigences, et recommandations stratégiques adaptées au catalogue Antares. Basé sur l'interface Documents-deprecated avec des capacités d'analyse spécialisées pour le marché français.

## Technical Context
**Language/Version**: TypeScript 5+ avec Next.js 15  
**Primary Dependencies**: Next.js App Router, React 19, Prisma ORM, PostgreSQL, OpenAI GPT-4o, LlamaIndex, Supabase Auth, Zod validation, shadcn/ui  
**Storage**: PostgreSQL avec extensions pgvector pour recherche sémantique  
**Testing**: Jest + React Testing Library pour components, Vitest pour API contracts  
**Target Platform**: Web application (Vercel deployment)
**Project Type**: web (frontend + backend intégré Next.js)  
**Performance Goals**: Analyse DCE < 30s, classification documents 95%+ précision, interface responsive < 2s  
**Constraints**: Conformité RGPD, sécurité multi-tenant, optimisation pour terminologie française  
**Scale/Scope**: Support multi-projets, analyse batch de documents, export PDF rapports

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**✅ I. Code Quality & Standards**: 
- TypeScript strict mode pour tous les nouveaux services d'analyse
- Zod schemas pour validation des uploads et résultats d'analyse
- Prisma ORM pour nouveaux modèles DCE
- Modularité avec services dédiés à l'analyse française

**✅ II. Testing Standards**: 
- Tests contracts pour API d'analyse DCE
- Tests unitaires pour extracteurs CCTP/CCP/BPU
- Tests intégration pour flux upload → analyse → résultats
- TDD pour nouveaux composants UI

**✅ III. User Experience Consistency**: 
- Réutilisation shadcn/ui components existants
- Interface inspirée de Documents-deprecated
- États de chargement pendant analyse
- Messages d'erreur contextuels français

**✅ IV. Security & Compliance**: 
- Isolation multi-tenant pour documents DCE
- Validation stricte des uploads (types, tailles)
- Pas de stockage permanent de contenu sensible
- Conformité RGPD pour données client

**✅ V. Performance Requirements**: 
- Analyse DCE complète < 30s (constitution: < 500ms standard ops, étendu pour IA)
- Interface responsive < 2s (conforme)
- Optimisation mémoire pour gros documents
- Monitoring performance IA

**Status**: ✅ PASS - Aucune violation constitutionnelle

## Project Structure

### Documentation (this feature)
```
specs/001-implémente-une-nouvelle/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command) ✅
├── data-model.md        # Phase 1 output (/plan command) ✅
├── quickstart.md        # Phase 1 output (/plan command) ✅
├── contracts/           # Phase 1 output (/plan command) ✅
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (Next.js full-stack)
app/
├── api/
│   └── tenders/         # Nouvelles API routes
│       ├── upload/
│       ├── analyze/
│       └── export/
├── projects/[projectId]/
│   └── documents/       # Nouvelle interface (remplace deprecated)
└── components/
    └── tenders/         # Composants spécialisés DCE

lib/
├── services/
│   └── french-tender/   # Services analyse française
└── validators/
    └── dce/            # Validation schemas DCE
```

**Structure Decision**: Option 2 (Web application) - Next.js full-stack avec API routes intégrées

## Phase 0: Outline & Research ✅

### Améliorations Suggérées pour l'Analyse Française

**⚠️ Note**: Je n'ai pas de sources précises pour certaines recommandations spécialisées

#### 1. Modèles IA Optimisés Français
**Recommandation**: Intégrer Mixtral 8x7B ou LLaMA-2-French pour analyse spécialisée
**Justification**: 
- Meilleure compréhension terminologie juridique française
- Performance supérieure sur documents administratifs vs modèles généralistes
- **Source manquante**: Benchmarks spécifiques sur documents DCE français

#### 2. Dictionnaires Spécialisés
**Recommandation**: Base de connaissances terminologie marchés publics
**Justification**:
- Acronymes spécifiques (CCTP, CCP, BPU, RC, MAPA, etc.)
- Références réglementaires (Code des marchés publics, ordonnances)
- Vocabulaire technique sectoriel IT/Infrastructure
- **Source disponible**: Code des marchés publics, BOAMP

#### 3. Pipeline NLP Français Renforcé
**Recommandation**: 
- Spacy modèle `fr_core_news_lg` pour NER français
- Détection entités nommées spécialisées (autorités, références légales)
- Preprocessing optimisé pour docs administratifs PDF
**Source**: Documentation spaCy française

#### 4. Classification Hiérarchique
**Recommandation**: Modèle de classification à deux niveaux
- Niveau 1: Type document (CCTP, CCP, BPU, RC)
- Niveau 2: Secteurs (Infrastructure, Développement, Cybersécurité)
**Justification**: Précision améliorée par spécialisation progressive

### Décisions Techniques Conservées
- **Stack existante maintenue**: Next.js + OpenAI pour compatibilité
- **Stockage**: Extension Prisma avec nouveaux modèles DCE
- **Interface**: Réutilisation composants shadcn/ui existants
- **Déploiement**: Vercel (conforme architecture actuelle)

**Output**: ✅ research.md généré avec recommandations d'amélioration

## Phase 1: Design & Contracts ✅

### Entités Identifiées
1. **TenderDocument**: Document DCE uploadé avec métadonnées
2. **TenderAnalysis**: Résultats analyse IA avec scoring
3. **TenderSection**: Sections extraites (CCTP, CCP, etc.)
4. **AntaresRecommendation**: Recommandations services contextuelles
5. **AnalysisReport**: Rapport exportable PDF

### API Contracts Générés
- `POST /api/tenders/upload` - Upload documents DCE
- `POST /api/tenders/analyze` - Lancement analyse IA  
- `GET /api/tenders/[id]/results` - Récupération résultats
- `POST /api/tenders/[id]/export` - Export rapport PDF
- `GET /api/tenders/[id]/recommendations` - Recommandations Antares

### Tests Contracts
- Validation schemas upload (types, tailles)
- Schémas réponses analyse structurées
- Tests erreurs (documents invalides, timeouts)

**Output**: ✅ data-model.md, /contracts/, quickstart.md, CLAUDE.md générés

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Setup: Nouveaux modèles Prisma pour entités DCE
- Tests: Contracts API + tests composants UI
- Services: Extracteurs CCTP/CCP/BPU + analyseur IA
- Interface: Composants upload + visualisation résultats
- Intégration: Pipeline complet upload → analyse → export

**Ordering Strategy**:
- Phase 1: Modèles + migrations DB [P]
- Phase 2: Services analyse (tests first) [séquentiel]
- Phase 3: API routes + validation [P] 
- Phase 4: Interface utilisateur [P]
- Phase 5: Intégration + export PDF

**Estimated Output**: 28 tâches numérotées avec dépendances

## Complexity Tracking
*Aucune violation constitutionnelle identifiée*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)  
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A)

---
*Based on Constitution v2.0.0 - See `.specify/memory/constitution.md`*