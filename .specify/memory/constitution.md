<!--
Sync Impact Report:
Version change: 1.0.0 → 2.0.0 (major revision with 5 focused principles)
Added sections: None (restructured existing)
Modified principles: 
- IA-First Processing → Code Quality & Standards (refined focus)
- Type Safety & Quality → Testing Standards (expanded testing requirements)
- Security & Compliance → Enhanced with performance requirements
- Added: User Experience Consistency
- Added: Performance Requirements
Removed sections: None (consolidated principles)
Templates requiring updates:
- ✅ plan-template.md (Constitution Check section compatible)
- ✅ spec-template.md (testable requirements align with testing standards)  
- ✅ tasks-template.md (TDD approach supports testing standards)
Follow-up TODOs: None
-->

# Scorpius Constitution - Antares Tender Assistant

## Core Principles

### I. Code Quality & Standards

All code MUST use TypeScript with strict mode enabled and follow consistent patterns. API contracts MUST be validated with Zod schemas at runtime. Database operations MUST use Prisma ORM with type-safe queries. Code MUST be modular with clear separation of concerns. Next.js App Router patterns MUST be followed for all routing. ESLint rules MUST be enforced and pass before merge.

### II. Testing Standards

All features MUST be covered by automated tests before implementation (TDD approach). API endpoints MUST have contract tests validating request/response schemas. Database models MUST have unit tests for validation logic. Frontend components MUST have integration tests for user interactions. Test coverage MUST exceed 80% for critical paths. All tests MUST pass in CI/CD pipeline before deployment.

### III. User Experience Consistency

All user interfaces MUST follow established design patterns using shadcn/ui components. Loading states MUST be consistent across all async operations. Error messages MUST be user-friendly and actionable. Navigation patterns MUST be intuitive and predictable. Responsive design MUST work across desktop, tablet, and mobile viewports. Accessibility standards (WCAG 2.1 AA) MUST be maintained.

### IV. Security & Compliance

Multi-tenant data isolation MUST be enforced at database and API levels. Authentication MUST use Supabase magic links with proper session management. Sensitive data including API keys MUST never be committed to version control. All user inputs MUST be validated and sanitized. API rate limiting MUST be implemented. Data processing MUST comply with GDPR and French public procurement regulations. Security headers MUST be configured properly.

### V. Performance Requirements

Page load times MUST not exceed 2 seconds for initial render. API response times MUST not exceed 500ms for standard operations. Document processing MUST complete within 30 seconds for typical files. Database queries MUST be optimized with proper indexing. Bundle sizes MUST be monitored and minimized through code splitting. Performance regressions MUST be detected and prevented in CI/CD pipeline.

## Governance

Constitution supersedes all development practices. Amendments require documentation of impact and migration plan. All pull requests MUST verify compliance with these principles through automated checks and code review. Performance benchmarks MUST be validated before deployment. Version follows semantic versioning: MAJOR for principle changes, MINOR for additions, PATCH for clarifications.

**Version**: 2.0.0 | **Ratified**: 2025-01-19 | **Last Amended**: 2025-09-19
