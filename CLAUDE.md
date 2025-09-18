# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

**Development:**
```bash
pnpm dev                    # Start development server with Turbopack
pnpm build                  # Build for production
pnpm start                  # Start production server
pnpm lint                   # Run ESLint
```

**Database:**
```bash
pnpm prisma generate        # Generate Prisma client (runs automatically on install)
pnpm prisma migrate deploy  # Deploy migrations to database
pnpm prisma db seed        # Seed database with sample data
pnpm prisma db pull        # Pull schema from database
pnpm prisma migrate reset   # Reset database (WARNING: destroys data)
```

**Package Management:**
- This project uses `pnpm` as the package manager
- Lock file: `pnpm-lock.yaml`

## Architecture Overview

AutoRFP is a Next.js 15 AI-powered RFP response platform with a multi-tenant SaaS architecture:

### Core Tech Stack
- **Frontend:** Next.js 15 App Router, React 19, TypeScript
- **Styling:** Tailwind CSS, Radix UI (shadcn/ui components)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Supabase Auth (magic link)
- **AI Services:** OpenAI GPT-4o, LlamaIndex/LlamaCloud
- **Deployment:** Vercel-optimized

### Multi-Tenant Data Model
The application follows a hierarchical structure:
```
User -> Organization -> Project -> Questions/Answers
                   \-> KnowledgeBase -> Questions/Answers
```

Key models in `prisma/schema.prisma`:
- **User**: Authenticated users (Supabase ID as primary key)
- **Organization**: Tenant organizations with LlamaCloud integration
- **OrganizationUser**: Role-based access (owner/admin/member)
- **Project**: RFP projects containing questions and document indexes
- **KnowledgeBase**: Organization-level Q&A knowledge bases
- **Question/Answer**: Core RFP questions with AI-generated responses
- **ProjectIndex**: LlamaCloud pipeline/index connections

### App Router Structure
```
app/
├── api/                    # API routes
│   ├── extract-questions/  # OpenAI question extraction
│   ├── generate-response/  # AI response generation
│   ├── llamacloud/        # LlamaCloud integration
│   ├── organizations/     # Org management
│   └── projects/          # Project management
├── organizations/[orgId]/  # Organization workspace
├── projects/[projectId]/   # Project workspace
├── auth/                  # Authentication flows
└── upload/                # Document upload
```

### Key Business Logic Locations
- **Services:** `lib/` directory contains core business logic
- **Validators:** `lib/validators/` for Zod request/response validation
- **API Utilities:** `lib/middleware/api-handler.ts` for standardized API responses
- **Supabase Integration:** `lib/utils/supabase/` for auth and database
- **AI Integration:** `lib/llamaparse-service.ts` for document processing

### Component Architecture
- Uses shadcn/ui components from `components/ui/`
- Feature components organized by domain: `components/organizations/`, `components/projects/`
- Follows React Server Components (RSC) first approach
- Minimal use of 'use client' directives

## Development Guidelines

### Code Standards (from .cursor/rules)
- Use functional and declarative programming patterns
- Prefer interfaces over types
- Avoid enums; use const maps instead
- Use TypeScript for all code with proper type safety
- Prefix event handlers with 'handle' (handleClick, handleSubmit)
- Use descriptive names with auxiliary verbs (isLoading, hasError)
- Structure components logically: exports, subcomponents, helpers, types

### Component Guidelines
- Favor React Server Components where possible
- Use Suspense for async operations
- Implement proper error boundaries
- Use Shadcn UI components when available
- Optimize for performance and Web Vitals

### Authentication Flow
1. Magic link authentication via Supabase
2. Organization creation/joining on first login
3. Role-based access control (owner/admin/member)
4. Automatic LlamaCloud connection for single projects

### AI Processing Pipeline
1. Document upload and parsing
2. Question extraction via OpenAI
3. Document indexing in LlamaCloud
4. Multi-step response generation with source attribution
5. Interactive refinement and editing

## Environment Setup

Required environment variables:
- `DATABASE_URL` & `DIRECT_URL`: PostgreSQL connection
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase config
- `OPENAI_API_KEY`: OpenAI API access
- `LLAMACLOUD_API_KEY`: LlamaCloud integration
- Optional: `LLAMACLOUD_API_KEY_INTERNAL` & `INTERNAL_EMAIL_DOMAIN` for internal users

## Troubleshooting

**Database Issues:**
- Run `pnpm prisma db pull` to verify connection
- Check DATABASE_URL format and credentials

**Authentication Issues:**
- Verify Supabase configuration
- Check redirect URLs in Supabase dashboard

**AI Processing Issues:**
- Verify OpenAI API key and credits
- Check LlamaCloud project connectivity
- Review API rate limits

## Antares Tender Assistant Project

This project is being evolved to create a specialized assistant for French public tenders (marchés publics français) for Antares IT Services. All project documentation is organized in the `.claude/` directory:

### Project Documentation Structure
```
.claude/
├── ANTARES_PHASE_1_MASTER_PLAN.md     # Complete project specifications and budget
├── NEXT_STEPS.md                       # Immediate action items for project restart
├── PHASE_1_ROADMAP.md                  # Detailed 8-week implementation roadmap
├── DEVELOPMENT_SETUP.md                # Complete development environment guide
├── docs/
│   ├── TECHNICAL_ARCHITECTURE.md      # Extended architecture for French tenders
│   ├── DATABASE_SCHEMA.md              # Database extensions and new models
│   └── FUNCTIONAL_SPECS.md             # Detailed functional specifications
├── data/
│   ├── antares-services-template.json  # Antares service catalog template
│   └── schema-phase1.prisma           # Extended Prisma schema for Phase 1
└── examples/
    └── README.md                       # Test data and validation examples
```

### Key Features for Phase 1
- **DCE Classification**: AI-powered parsing of French tender documents
- **Antares Service Catalog**: Structured catalog of 45+ IT services
- **Complexity Scoring**: Automated assessment of tender complexity
- **Pricing Calculator**: Dynamic pricing based on competency levels
- **Multi-RAG Architecture**: Enhanced knowledge base with multiple sources

### Budget & Timeline
- **Phase 1 Budget**: 60.3k€ over 8 weeks
- **Target ROI**: 300% in first year
- **Go-live**: MVP with real tender processing capability

### Getting Started with Antares Project
1. Read `.claude/NEXT_STEPS.md` for immediate actions
2. Follow `.claude/DEVELOPMENT_SETUP.md` for environment setup
3. Apply Phase 1 schema: `cp .claude/data/schema-phase1.prisma prisma/schema.prisma`
4. Run database migration: `pnpm prisma db push`

For detailed project context, start with `.claude/ANTARES_PHASE_1_MASTER_PLAN.md`