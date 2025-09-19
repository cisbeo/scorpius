# Quickstart: Analyseur d'Appels d'Offres Français

## Objectif
Valider le fonctionnement complet du pipeline d'analyse DCE français, de l'upload à l'export du rapport.

## Prérequis
- Application démarrée en mode dev (`pnpm dev`)
- Base de données initialisée avec schéma étendu
- Clés API OpenAI configurées
- Projet de test créé dans l'application

## Scénario de Test Principal

### 1. Préparation Documents Test
```bash
# Documents de test disponibles dans specs/001-implémente-une-nouvelle/test-data/
- cctp-infrastructure-exemple.pdf (CCTP Infrastructure IT)
- ccp-marche-public-exemple.pdf (CCP standard)
- bpu-prix-unitaires.pdf (BPU avec prix)
```

### 2. Upload Documents DCE
1. **Navigation** : Accéder à `/projects/{projectId}/documents`
2. **Action** : Glisser-déposer les 3 fichiers de test dans la zone d'upload
3. **Validation** : 
   - ✅ Files uploadés avec statut "PENDING"
   - ✅ Classification automatique démarrée
   - ✅ Interface montre progression en temps réel

**Résultat attendu** :
```json
{
  "uploadId": "upload_xxx",
  "documents": [
    {
      "fileName": "cctp-infrastructure-exemple.pdf",
      "status": "PROCESSING",
      "documentType": "CCTP"
    }
  ]
}
```

### 3. Lancement Analyse IA
1. **Action** : Cliquer "Analyser les documents" 
2. **Validation** :
   - ✅ Modal d'options d'analyse s'ouvre
   - ✅ Nom d'analyse pré-rempli avec date
   - ✅ Options recommandations Antares cochées

**Résultat attendu** :
- Status passe à "PROCESSING" 
- Temps estimé affiché (< 30s)
- Barre de progression temps réel

### 4. Consultation Résultats
1. **Navigation** : Page résultats d'analyse automatique
2. **Validation** :
   - ✅ Score complexité affiché (1-10)
   - ✅ Sections DCE identifiées avec confiance >80%
   - ✅ Exigences techniques extraites et catégorisées
   - ✅ Contraintes temporelles détectées

**Structure résultats attendue** :
```
- Vue d'ensemble (complexité, confiance globale)
- Objet du marché (titre, description, secteur)
- Exigences techniques (obligatoires vs recommandées)
- Critères d'évaluation (technique/prix/autres)
- Contraintes temporelles (deadlines, jalons)
- Sections analysées (CCTP, CCP, BPU avec confiance)
```

### 5. Recommandations Antares
1. **Navigation** : Onglet "Recommandations"
2. **Validation** :
   - ✅ Services Antares pertinents suggérés
   - ✅ Score de pertinence pour chaque service
   - ✅ Estimation effort (jours-homme)
   - ✅ Niveau de risque évalué

**Recommandations attendues** :
- Services Infrastructure (si CCTP infrastructure)
- Estimation pricing basée sur complexité
- Stratégie de réponse suggérée
- Points de différenciation identifiés

### 6. Export Rapport PDF
1. **Action** : Cliquer "Exporter rapport PDF"
2. **Validation** :
   - ✅ Génération rapport < 10s
   - ✅ PDF téléchargé automatiquement
   - ✅ Contenu structuré et professionnel

**Contenu rapport PDF** :
- Page couverture avec infos AO
- Synthèse exécutive
- Analyse détaillée par section
- Recommandations Antares
- Annexes (extraits documents analysés)

## Validation Performance

### Métriques Critiques
- **Upload** : Fichiers 10MB uploadés < 5s
- **Classification** : Documents classifiés < 10s avec confiance >80%
- **Analyse complète** : DCE 50 pages analysé < 30s
- **Interface** : Responsive < 2s toutes actions
- **Export PDF** : Rapport généré < 10s

### Tests Erreurs
1. **Document invalide** : Upload fichier .txt → Erreur validation claire
2. **Fichier trop gros** : Upload >50MB → Rejet avec message explicite
3. **Format non supporté** : Upload .xlsx → Classification "OTHER" + warning
4. **Timeout analyse** : Simulation timeout → Retry automatique + fallback manuel

## Critères de Succès

### Fonctionnels
- [x] Upload multi-fichiers opérationnel
- [x] Classification DCE français >95% précision
- [x] Extraction structurée complète
- [x] Recommandations Antares pertinentes
- [x] Export PDF professionnel

### Performance
- [x] Analyse complète < 30s (conforme constitution)
- [x] Interface fluide < 2s
- [x] Gestion erreurs gracieuse

### UX
- [x] Interface intuitive inspirée Documents-deprecated
- [x] États de chargement clairs
- [x] Messages d'erreur français compréhensibles
- [x] Workflow complet sans blocage

## Troubleshooting

### Erreurs Communes
- **Classification échoue** : Vérifier format PDF + OCR lisible
- **Analyse timeout** : Réduire taille documents ou diviser
- **Export PDF vide** : Vérifier données analyse complètes
- **Recommandations manquantes** : Vérifier catalogue Antares configuré

### Logs à Surveiller
```bash
# Vérifier processing documents
tail -f logs/tender-analysis.log | grep "PROCESSING"

# Monitoring performance IA
curl http://localhost:3000/api/health/ai-metrics
```

Ce quickstart valide l'ensemble du pipeline métier et confirme que la feature répond aux exigences utilisateur et constitutionnelles.