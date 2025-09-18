# 📁 **EXEMPLES ET DONNÉES TEST - ANTARES TENDER ASSISTANT**

*Données de référence pour tests et validation Phase 1*

## 🎯 **CONTENU DU DOSSIER**

Ce dossier contient tous les exemples et données test nécessaires pour valider les fonctionnalités Phase 1 :

### **Documents DCE Test**
- `dce-infrastructure-exemple.pdf` - DCE complet Infrastructure IT
- `cctp-virtualisation.pdf` - CCTP spécialisé VMware  
- `ccp-securite-anssi.pdf` - CCP avec exigences ANSSI
- `bpu-services-cloud.pdf` - BPU pricing services cloud

### **Données Catalogue Antares**
- `antares-services.json` - Catalogue complet 45+ services
- `service-references.json` - 35+ références projets
- `pricing-matrix.json` - Grille tarifaire par niveau

### **Historique AO Test**
- `historical-tenders.json` - 50+ AO historiques anonymisés
- `win-loss-patterns.json` - Patterns succès/échec identifiés
- `competitor-analysis.json` - Analyse concurrentielle

## 📋 **INSTRUCTIONS D'UTILISATION**

### **Tests Parsing DCE**
```bash
# Upload documents test via interface
curl -F "file=@docs/examples/dce-infrastructure-exemple.pdf" \
     http://localhost:3000/api/tenders/parse-dce

# Validation résultats attendus
# - Classification: CCTP (confidence > 90%)
# - Complexité: 7/10
# - Durée estimée: 12 jours
```

### **Validation Catalogue**
```bash
# Import données catalogue
pnpm tsx scripts/import-examples.ts

# Vérification via API
curl http://localhost:3000/api/catalog/services?sector=INFRASTRUCTURE
```

### **Tests Historique**
```bash
# Import historique anonymisé
pnpm tsx scripts/import-historical.ts

# Validation patterns
curl http://localhost:3000/api/analytics/patterns
```

## ✅ **CRITÈRES DE VALIDATION**

### **Parsing DCE**
- ✅ Classification correcte (95% précision)
- ✅ Extraction exigences techniques complète
- ✅ Scoring complexité cohérent (±1 point expert)
- ✅ Timeline générée avec jalons critiques

### **Catalogue Services**
- ✅ 45+ services importés correctement
- ✅ Pricing cohérent par niveau compétence
- ✅ Technologies et certifications complètes
- ✅ Recherche et filtres fonctionnels

### **Historique & Références**
- ✅ 50+ AO historiques structurés
- ✅ 35+ références avec anonymisation
- ✅ Patterns win/loss identifiés
- ✅ Matching similarité pertinent

---

*Ce dossier est mis à jour régulièrement avec de nouveaux exemples pour améliorer la qualité des tests.*