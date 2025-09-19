# Research: Analyseur d'Appels d'Offres Français

## Améliorations Recommandées pour l'Analyse Française

### 1. Modèles IA Optimisés pour le Français

**Decision**: Maintenir OpenAI GPT-4o comme modèle principal avec prompts optimisés français
**Rationale**: 
- Compatibilité avec infrastructure existante
- Performance éprouvée sur textes juridiques français
- Support natif des termes techniques marchés publics

**Alternatives considérées**:
- Mixtral 8x7B: Excellent pour français mais nécessite infrastructure dédiée
- LLaMA-2-French: Spécialisé français mais moins performant sur documents complexes
- **Sources manquantes**: Benchmarks comparatifs sur DCE français

### 2. Pipeline NLP Spécialisé

**Decision**: Intégrer preprocessing français avec dictionnaires spécialisés
**Rationale**:
- Amélioration précision terminologie marchés publics
- Reconnaissance entités nommées (autorités contractantes, références légales)
- Optimisation parsing documents administratifs PDF

**Implementation**:
- Base de connaissances acronymes: CCTP, CCP, BPU, RC, MAPA, UGAP
- Dictionnaire références réglementaires (Code marchés publics)
- Preprocessing spécialisé pour formats PDF administratifs
- **Source**: Code des marchés publics, BOAMP (Bulletin Officiel Annonces Marchés Publics)

### 3. Classification Hiérarchique Documents

**Decision**: Classification à deux niveaux pour améliorer précision
**Rationale**: Spécialisation progressive plus efficace que classification unique

**Structure**:
- Niveau 1: Type document (CCTP, CCP, BPU, RC)
- Niveau 2: Secteur (Infrastructure, Développement, Cybersécurité)
- Scoring confiance par niveau pour validation manuelle si nécessaire

### 4. Optimisations Performance

**Decision**: Pipeline asynchrone avec cache intelligent
**Rationale**: Respect contrainte 30s pour analyse complète DCE

**Implementation**:
- Cache résultats classification par empreinte document
- Traitement parallèle sections différentes
- Optimisation mémoire pour documents volumineux (>50MB)

## Choix Techniques Conservés

### Stack Technique
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Backend**: Next.js API Routes intégrées
- **Base de données**: PostgreSQL + Prisma ORM
- **IA**: OpenAI GPT-4o (existant) + prompts optimisés français
- **UI**: shadcn/ui (réutilisation composants existants)
- **Auth**: Supabase (préservé)

### Architecture
- Extension modèles Prisma existants
- Réutilisation patterns API existants
- Compatible infrastructure Vercel
- Isolation multi-tenant préservée

## Recommandations Futures

### Phase 2 Potentielle
- Intégration modèles français spécialisés (Mixtral)
- Base vectorielle optimisée français (pgvector + embeddings fr)
- ML prédictif win/loss sur historique AO

**Note**: Certaines recommandations manquent de sources spécifiques sur performance comparative modèles IA français pour documents DCE.