# Data Model: Analyseur d'Appels d'Offres Français

## Entités Principales

### TenderDocument
Document DCE uploadé avec métadonnées et statut de traitement.

**Attributs**:
- id: string (CUID)
- projectId: string (relation vers Project existant)
- fileName: string
- fileSize: number
- fileType: enum ('PDF', 'DOC', 'DOCX')
- uploadedAt: DateTime
- uploadedBy: string (userId)
- status: enum ('PENDING', 'PROCESSING', 'ANALYZED', 'ERROR')
- documentType: enum ('DCE_COMPLETE', 'CCTP', 'CCP', 'BPU', 'RC', 'OTHER')
- classification: Json (résultats classification IA)
- processingStartedAt: DateTime?
- processingCompletedAt: DateTime?

**Validations**:
- fileSize ≤ 50MB
- fileType dans formats supportés
- fileName non vide, caractères valides

### TenderAnalysis
Résultats complets de l'analyse IA d'un ou plusieurs documents DCE.

**Attributs**:
- id: string (CUID)
- projectId: string
- analysisName: string
- documentsAnalyzed: TenderDocument[] (relation)
- complexityScore: number (1-10)
- overallConfidence: number (0-1)
- marketScope: Json (objet marché extrait)
- technicalRequirements: Json (exigences techniques structurées)
- evaluationCriteria: Json (critères jugement)
- timeConstraints: Json (contraintes temporelles)
- mandatoryRequirements: string[]
- analysisCompletedAt: DateTime
- estimatedPreparationDays: number?

**Validations**:
- complexityScore entre 1 et 10
- overallConfidence entre 0 et 1
- analysisName non vide

### TenderSection
Section extraite et analysée d'un document DCE (CCTP, CCP, etc.).

**Attributs**:
- id: string (CUID)
- documentId: string (relation TenderDocument)
- analysisId: string (relation TenderAnalysis)
- sectionType: enum ('CCTP', 'CCP', 'BPU', 'RC', 'ANNEXE', 'OTHER')
- title: string
- content: string (contenu extrait)
- structuredData: Json (données structurées extraites)
- confidence: number (0-1)
- pageNumbers: number[]
- extractedAt: DateTime

**Validations**:
- confidence entre 0 et 1
- pageNumbers array non vide
- content non vide

### AntaresRecommendation
Recommandations stratégiques et services Antares pertinents pour l'AO.

**Attributs**:
- id: string (CUID)
- analysisId: string (relation TenderAnalysis)
- recommendationType: enum ('SERVICE_MATCH', 'STRATEGY', 'RISK', 'OPPORTUNITY')
- title: string
- description: string
- relevanceScore: number (0-1)
- antaresServices: string[] (IDs services catalogue)
- estimatedEffort: number? (jours-homme)
- estimatedValue: number? (euros)
- riskLevel: enum ('LOW', 'MEDIUM', 'HIGH')
- actionable: boolean

**Validations**:
- relevanceScore entre 0 et 1
- title et description non vides
- estimatedEffort > 0 si défini

### AnalysisReport
Rapport d'analyse exportable en PDF avec synthèse complète.

**Attributs**:
- id: string (CUID)
- analysisId: string (relation TenderAnalysis)
- reportTitle: string
- generatedAt: DateTime
- generatedBy: string (userId)
- reportSections: Json (structure rapport)
- pdfUrl: string? (URL fichier généré)
- isPublic: boolean
- expiresAt: DateTime?

**Validations**:
- reportTitle non vide
- expiresAt > generatedAt si défini

## Relations

```
Project (existant)
└── TenderDocument (1:n)
    ├── TenderSection (1:n)
    └── TenderAnalysis (n:m)
        ├── AntaresRecommendation (1:n)
        └── AnalysisReport (1:1)
```

## Enums

```typescript
enum DocumentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING', 
  ANALYZED = 'ANALYZED',
  ERROR = 'ERROR'
}

enum DocumentType {
  DCE_COMPLETE = 'DCE_COMPLETE',
  CCTP = 'CCTP',
  CCP = 'CCP', 
  BPU = 'BPU',
  RC = 'RC',
  OTHER = 'OTHER'
}

enum SectionType {
  CCTP = 'CCTP',
  CCP = 'CCP',
  BPU = 'BPU', 
  RC = 'RC',
  ANNEXE = 'ANNEXE',
  OTHER = 'OTHER'
}

enum RecommendationType {
  SERVICE_MATCH = 'SERVICE_MATCH',
  STRATEGY = 'STRATEGY',
  RISK = 'RISK',
  OPPORTUNITY = 'OPPORTUNITY'
}

enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}
```

## Index Recommandés

```sql
-- Performance queries fréquentes
CREATE INDEX idx_tender_documents_project_status ON tender_documents(project_id, status);
CREATE INDEX idx_tender_analysis_project ON tender_analysis(project_id);
CREATE INDEX idx_tender_sections_document ON tender_sections(document_id);
CREATE INDEX idx_recommendations_analysis ON antares_recommendations(analysis_id);
CREATE INDEX idx_reports_analysis ON analysis_reports(analysis_id);

-- Recherche par type document
CREATE INDEX idx_documents_type ON tender_documents(document_type);
CREATE INDEX idx_sections_type ON tender_sections(section_type);
```

## Contraintes Métier

1. **Un document ne peut être dans qu'une seule analyse à la fois en mode PROCESSING**
2. **Une analyse doit avoir au moins un document associé**
3. **Les rapports expirent automatiquement après 30 jours (RGPD)**
4. **Les recommandations doivent référencer des services Antares existants**
5. **Les documents > 50MB sont rejetés à l'upload**