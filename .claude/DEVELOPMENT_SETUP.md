# 🚀 **GUIDE SETUP DÉVELOPPEMENT - ANTARES TENDER ASSISTANT**

*Instructions complètes pour configurer l'environnement de développement Phase 1*

## 📋 **PRÉREQUIS SYSTÈME**

### **Logiciels Requis**
- **Node.js** : v24.8.0+ (vérifiez avec `node --version`)
- **pnpm** : v10.10.0+ (gestionnaire de paquets)
- **PostgreSQL** : v15+ avec extension pgvector
- **Git** : Version récente pour contrôle de version
- **VS Code** : Éditeur recommandé avec extensions

### **Comptes et Accès Nécessaires**
- **Supabase** : Compte et projet configuré
- **OpenAI** : Clé API avec crédits suffisants
- **LlamaCloud** : Compte et projet (optionnel Phase 1)
- **GitHub** : Accès au repository Antares

### **Extensions VS Code Recommandées**
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss", 
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ]
}
```

---

## 🛠️ **CONFIGURATION INITIALE**

### **1. Clone et Setup Repository**

```bash
# Clone du projet
git clone https://github.com/antares/scorpius.git
cd scorpius

# Installation des dépendances
pnpm install

# Vérification de la configuration
pnpm run type-check
```

### **2. Configuration Base de Données**

#### **PostgreSQL Local**
```bash
# Création de la base (si pas déjà fait)
createdb auto_rfp

# Vérification connexion
psql auto_rfp -c "SELECT version();"
```

#### **Extension pgvector (Phase 2)**
```bash
# Installation extension pour vecteurs (préparatif)
psql auto_rfp -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### **3. Variables d'Environnement**

Créer le fichier `.env.local` :

```bash
# Base de données
DATABASE_URL="postgresql://cedric@localhost/auto_rfp"
DIRECT_URL="postgresql://cedric@localhost/auto_rfp"

# Supabase (à configurer)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# OpenAI (à configurer)
OPENAI_API_KEY="sk-proj-your-key..."

# LlamaCloud (optionnel Phase 1)
LLAMACLOUD_API_KEY="llx-your-key..."

# Configuration app
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Phase 1 - Nouvelles variables
OPENAI_API_KEY_PARSING="sk-proj-dedicated-parsing-key..."
VECTOR_DATABASE_URL="postgresql://cedric@localhost/auto_rfp"
ANTARES_DEFAULT_MARGIN="0.15"
COMPLEXITY_CALIBRATION_FACTOR="1.2"
```

### **4. Migration Base de Données**

```bash
# Application du schéma existant
pnpm prisma migrate deploy

# Génération du client Prisma  
pnpm prisma generate

# Vérification migration
pnpm prisma studio
```

---

## 🔧 **EXTENSION PHASE 1**

### **1. Application Nouveau Schéma**

```bash
# Backup base actuelle (sécurité)
pg_dump auto_rfp > backup_before_phase1.sql

# Application migration Phase 1
cp prisma/schema-phase1.prisma prisma/schema.prisma
pnpm prisma db push

# Vérification nouvelles tables
psql auto_rfp -c "\dt" | grep -E "(french_tenders|antares_services|historical_tenders)"
```

### **2. Seed Données Test Phase 1**

Créer `scripts/seed-phase1.ts` :

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPhase1() {
  console.log('🌱 Seeding Phase 1 data...');
  
  // Seed services Antares
  const infrastructureServices = await prisma.antaresService.createMany({
    data: [
      {
        serviceType: 'INFRASTRUCTURE',
        category: 'Virtualisation',
        name: 'Migration VMware vSphere',
        description: 'Migration infrastructure vers VMware vSphere avec haute disponibilité',
        technologies: ['VMware', 'vSphere', 'vCenter'],
        unitType: 'JOUR_HOMME',
        basePrice: 850,
        competencyLevel: 4,
        teamSize: 2,
        duration: 30
      },
      {
        serviceType: 'INFRASTRUCTURE', 
        category: 'Cloud',
        name: 'Migration Cloud Azure',
        description: 'Migration infrastructure vers Microsoft Azure',
        technologies: ['Azure', 'ARM Templates', 'PowerShell'],
        unitType: 'PROJET',
        basePrice: 120000,
        competencyLevel: 5,
        teamSize: 4,
        duration: 90
      }
      // ... autres services
    ]
  });
  
  // Seed références
  const references = await prisma.serviceReference.createMany({
    data: [
      {
        clientName: 'SNCF',
        clientDisplayName: 'SNCF',
        clientSector: 'TRANSPORT_LOGISTIQUE',
        clientSize: 'GE',
        projectName: 'Migration Infrastructure Cloud Hybride',
        projectDescription: 'Migration 500 serveurs vers cloud hybride Azure/AWS',
        duration: 8,
        teamSize: 6,
        startDate: new Date('2023-03-01'),
        endDate: new Date('2023-11-01'),
        successMetrics: {
          availability: '99.97%',
          costReduction: '30%',
          performance: '+35%'
        },
        serviceId: 'service-id-here' // À adapter
      }
      // ... autres références
    ]
  });
  
  console.log(`✅ Created ${infrastructureServices.count} services`);
  console.log(`✅ Created ${references.count} references`);
}

seedPhase1()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

```bash
# Exécution seed
pnpm tsx scripts/seed-phase1.ts
```

### **3. Structure Services Phase 1**

Créer l'arborescence des nouveaux services :

```bash
# Création structure services
mkdir -p lib/services/french-tender
mkdir -p lib/parsers  
mkdir -p lib/algorithms
mkdir -p lib/types/phase1

# Services principaux
touch lib/services/french-tender/dce-parser.service.ts
touch lib/services/french-tender/complexity-scorer.service.ts
touch lib/services/french-tender/antares-catalog.service.ts
touch lib/services/french-tender/pricing-calculator.service.ts

# Parseurs spécialisés  
touch lib/parsers/document-classifier.ts
touch lib/parsers/cctp-parser.ts
touch lib/parsers/ccp-parser.ts

# Types Phase 1
touch lib/types/phase1/french-tender.ts
touch lib/types/phase1/antares-service.ts
```

### **4. Types TypeScript Phase 1**

Créer `lib/types/phase1/index.ts` :

```typescript
// Types pour Phase 1
export interface ParsedDCE {
  structure: DCEStructure;
  complexity: ComplexityScore;
  estimatedDays: number;
  criticalRequirements: string[];
  timeline: ProjectTimeline;
  confidence: number;
}

export interface ComplexityScore {
  score: number; // 1-10
  factors: ComplexityFactors;
  justification: string[];
  preparationDays: number;
}

export interface ComplexityFactors {
  technology: number;
  security: number; 
  timeline: number;
  scope: number;
  integrations: number;
  certifications: number;
}

export interface DCEStructure {
  cctp?: CCTPAnalysis;
  ccp?: CCPAnalysis;
  bpu?: BPUAnalysis;
}

export interface CCTPAnalysis {
  marketScope: {
    title: string;
    description: string;
    businessValue: string;
  };
  technicalRequirements: {
    mandatory: string[];
    recommended: string[];
  };
  technologies: {
    imposed: string[];
    openChoice: string[];
  };
  standards: string[];
  timeline: ProjectTimeline;
}

export interface ServicePricing {
  basePrice: number;
  adjustedPrice: number;
  totalPrice: number;
  margin: number;
  factors: PricingFactors;
  confidence: number;
}

export interface PricingFactors {
  complexity: number;
  urgency: number;
  risk: number;
  volume: number;
  strategic: number;
}
```

---

## 🧪 **TESTS ET VALIDATION**

### **1. Tests Unitaires**

```bash
# Installation dépendances test
pnpm add -D jest @types/jest ts-jest

# Configuration Jest
npx jest --init
```

Créer `jest.config.js` :

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/**/*.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
```

### **2. Tests Exemples Phase 1**

Créer `tests/phase1/dce-parser.test.ts` :

```typescript
import { DCEParserService } from '@/lib/services/french-tender/dce-parser.service';

describe('DCE Parser Service', () => {
  let parser: DCEParserService;
  
  beforeEach(() => {
    parser = new DCEParserService();
  });

  it('should classify CCTP document correctly', async () => {
    const mockFile = new File(['CCTP content'], 'cctp.pdf', { type: 'application/pdf' });
    
    const result = await parser.classifyDocument(mockFile);
    
    expect(result.type).toBe('CCTP');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('should calculate complexity score within range', async () => {
    const mockAnalysis = {
      technologies: ['VMware', 'Azure', 'Fortinet'],
      standards: ['ISO27001', 'ANSSI'],
      timeline: { totalDays: 30 }
    };
    
    const complexity = await parser.calculateComplexity(mockAnalysis);
    
    expect(complexity.score).toBeGreaterThanOrEqual(1);
    expect(complexity.score).toBeLessThanOrEqual(10);
    expect(complexity.preparationDays).toBeGreaterThan(0);
  });
});
```

### **3. Validation Environnement**

Créer `scripts/validate-setup.ts` :

```typescript
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

async function validateSetup() {
  console.log('🔍 Validating Phase 1 setup...\n');
  
  // Test base de données
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    
    const frenchTenders = await prisma.frenchTender.count();
    const antaresServices = await prisma.antaresService.count();
    
    console.log('✅ Database: Connected');
    console.log(`   - French tenders: ${frenchTenders}`);
    console.log(`   - Antares services: ${antaresServices}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.log('❌ Database: Failed');
    console.log(`   Error: ${error}`);
  }
  
  // Test OpenAI
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Test connection' }],
      max_tokens: 10
    });
    
    console.log('✅ OpenAI: Connected');
    console.log(`   Model: ${response.model}`);
  } catch (error) {
    console.log('❌ OpenAI: Failed');
    console.log(`   Error: ${error}`);
  }
  
  // Test variables environnement
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'OPENAI_API_KEY'
  ];
  
  console.log('\n📋 Environment variables:');
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`❌ ${varName}: Missing`);
    }
  });
  
  console.log('\n🎉 Setup validation complete!');
}

validateSetup().catch(console.error);
```

```bash
# Validation setup
pnpm tsx scripts/validate-setup.ts
```

---

## 🚀 **DÉVELOPPEMENT PHASE 1**

### **1. Structure Projet Étendue**

```
scorpius/
├── ANTARES_PHASE_1_MASTER_PLAN.md    # Plan complet
├── DEVELOPMENT_SETUP.md              # Ce guide  
├── prisma/
│   ├── schema.prisma                 # Schéma étendu Phase 1
│   └── migrations/                   # Migrations DB
├── lib/
│   ├── services/
│   │   └── french-tender/            # Services Phase 1
│   ├── parsers/                      # Parseurs DCE
│   ├── algorithms/                   # Algorithmes métier
│   └── types/phase1/                 # Types TypeScript
├── app/
│   ├── tenders/                      # Pages AO français
│   ├── catalog/                      # Catalogue Antares
│   └── analytics/                    # Historique & insights
├── components/
│   ├── tenders/                      # Composants AO
│   ├── catalog/                      # Composants catalogue
│   └── ui/                          # Composants UI (existant)
├── docs/                            # Documentation technique
├── scripts/                         # Scripts utilitaires
└── tests/                           # Tests automatisés
```

### **2. Workflow Développement**

```bash
# Démarrage développement
pnpm dev

# Tests en continu
pnpm test --watch

# Vérification types
pnpm type-check

# Linting
pnpm lint

# Base de données admin
pnpm prisma studio
```

### **3. Commandes Utiles Phase 1**

```bash
# Génération types Prisma après modification schéma
pnpm prisma generate

# Reset complet base de données (ATTENTION: efface données)
pnpm prisma migrate reset

# Sauvegarde base de données
pg_dump auto_rfp > backup_$(date +%Y%m%d).sql

# Seed données Phase 1
pnpm tsx scripts/seed-phase1.ts

# Validation setup
pnpm tsx scripts/validate-setup.ts
```

---

## 🐛 **DEBUGGING ET TROUBLESHOOTING**

### **Problèmes Courants**

#### **1. Erreur Migration Prisma**
```bash
# Solution: Reset et re-migration
pnpm prisma migrate reset
pnpm prisma db push
```

#### **2. Types Prisma Non Générés**
```bash
# Solution: Régénération forcée
rm -rf node_modules/.prisma
pnpm prisma generate
```

#### **3. Erreur OpenAI API**
```bash
# Vérification clé API
echo $OPENAI_API_KEY | cut -c1-20
# Doit commencer par "sk-proj-" ou "sk-"
```

#### **4. Port 3000 Occupé**
```bash
# Identification processus
lsof -ti:3000

# Démarrage sur autre port
pnpm dev -- --port 3001
```

### **Logs et Monitoring**

```bash
# Logs application
tail -f .next/trace.log

# Logs base de données PostgreSQL
tail -f /usr/local/var/log/postgresql@15.log

# Monitoring performance
pnpm run build && pnpm run analyze
```

---

## 📚 **RESSOURCES ET DOCUMENTATION**

### **Documentation Technique**
- `docs/TECHNICAL_ARCHITECTURE.md` - Architecture détaillée
- `docs/DATABASE_SCHEMA.md` - Schéma base de données
- `docs/FUNCTIONAL_SPECS.md` - Spécifications fonctionnelles

### **APIs et Services**
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js 15 Documentation](https://nextjs.org/docs)

### **Outils Développement**
- **Prisma Studio** : Interface base de données (`pnpm prisma studio`)
- **OpenAI Playground** : Test prompts et modèles
- **Supabase Dashboard** : Gestion auth et base
- **Vercel Dashboard** : Déploiement et monitoring

---

## ✅ **CHECKLIST MISE EN ROUTE**

### **Avant de Commencer**
- [ ] Node.js 24.8.0+ installé
- [ ] pnpm installé et configuré
- [ ] PostgreSQL fonctionnel avec base `auto_rfp`
- [ ] VS Code avec extensions recommandées
- [ ] Accès GitHub repository

### **Configuration Environnement**
- [ ] Repository cloné et dépendances installées
- [ ] Variables environnement configurées (`.env.local`)
- [ ] Base de données migrée (Prisma)
- [ ] Données test importées (seed)
- [ ] Validation setup réussie

### **Développement**
- [ ] Serveur dev démarre sans erreur (`pnpm dev`)
- [ ] Tests unitaires passent (`pnpm test`)
- [ ] Types TypeScript valides (`pnpm type-check`)
- [ ] Linting sans erreur (`pnpm lint`)
- [ ] Accès Prisma Studio fonctionnel

### **Phase 1 Spécifique**
- [ ] Nouveaux modèles Prisma créés
- [ ] Services Phase 1 structurés
- [ ] Types TypeScript Phase 1 définis
- [ ] Tests Phase 1 configurés
- [ ] Documentation Phase 1 accessible

---

**Guide créé le : 2025-01-18**  
**Version : 1.0 - Phase 1**  
**Statut : Guide complet pour développement**

*Ce guide constitue la référence complète pour configurer et développer la Phase 1 d'Antares Tender Assistant.*