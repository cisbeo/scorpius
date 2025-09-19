import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { createTestProject, cleanupTestData, createTestAnalysis } from '../test-utils'

const prisma = new PrismaClient()

describe('Tender Export Flow Integration', () => {
  let testProjectId: string
  let testUserId: string
  let testAnalysisId: string

  beforeEach(async () => {
    // Setup test data
    const testData = await createTestProject()
    testProjectId = testData.projectId
    testUserId = testData.userId

    // Create completed analysis for export
    const { analysis } = await createTestAnalysis(testProjectId)
    testAnalysisId = analysis.id

    // Update analysis to completed state with full data
    await prisma.tenderAnalysis.update({
      where: { id: testAnalysisId },
      data: {
        status: 'COMPLETED',
        complexityScore: 8,
        overallConfidence: 0.91,
        analysisCompletedAt: new Date(),
        estimatedPreparationDays: 60,
        marketScope: {
          title: 'Infrastructure Cloud Migration',
          description: 'Complete migration to hybrid cloud infrastructure',
          sector: 'INFRASTRUCTURE',
          estimatedValue: 450000,
          contractingAuthority: 'Test Authority'
        },
        evaluationCriteria: {
          technical: 65,
          financial: 35,
          details: {
            experience: 25,
            methodology: 20,
            innovation: 20,
            price: 35
          }
        },
        timeConstraints: {
          submissionDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          projectDuration: 18,
          keyMilestones: [
            {
              name: 'Phase 1 - Infrastructure Setup',
              date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              description: 'Initial infrastructure deployment'
            }
          ]
        },
        mandatoryRequirements: [
          'ISO 27001 certification',
          'Cloud expertise ≥ 5 years',
          'Public sector references'
        ]
      }
    })

    // Create analysis sections
    await prisma.tenderSection.create({
      data: {
        type: 'CCTP',
        title: 'Technical Specifications',
        confidence: 0.94,
        pageCount: 28,
        extractedData: {
          requirements: ['Security', 'Performance', 'Scalability'],
          complexity: 'high'
        },
        analysisId: testAnalysisId,
        documentId: 'test-doc-id'
      }
    })

    // Create Antares recommendations
    await prisma.antaresRecommendation.create({
      data: {
        recommendationType: 'SERVICE_MATCH',
        title: 'Cloud Infrastructure Services - Antares',
        description: 'Our cloud migration expertise perfectly matches the tender requirements',
        relevanceScore: 0.93,
        antaresServices: ['cloud_migration', 'infrastructure_design', 'security_audit'],
        estimatedEffort: 180,
        estimatedValue: 420000,
        riskLevel: 'MEDIUM',
        actionable: true,
        reasoning: 'High compatibility between tender requirements and Antares core competencies',
        analysisId: testAnalysisId
      }
    })
  })

  afterEach(async () => {
    // Cleanup test data
    await cleanupTestData(testProjectId, testUserId)
  })

  describe('Analysis → PDF Export Workflow', () => {
    it('should successfully generate a complete PDF export', async () => {
      // Step 1: Request PDF export
      const exportRequest = {
        analysisId: testAnalysisId,
        reportTitle: 'Rapport d\'Analyse DCE - Infrastructure Cloud',
        includeRecommendations: true,
        includeDetailedSections: true,
        format: 'PDF',
        language: 'fr'
      }

      const exportResponse = await fetch(`/api/tenders/${testAnalysisId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      })

      expect(exportResponse.status).toBe(200)
      const exportResult = await exportResponse.json()
      
      expect(exportResult.success).toBe(true)
      expect(exportResult.data.reportId).toBeDefined()
      expect(exportResult.data.downloadUrl).toBeDefined()
      expect(exportResult.data.expiresAt).toBeDefined()
      expect(exportResult.data.fileSize).toBeGreaterThan(0)

      // Step 2: Verify report record in database
      const reportRecord = await prisma.analysisReport.findUnique({
        where: { id: exportResult.data.reportId }
      })

      expect(reportRecord).toBeDefined()
      expect(reportRecord!.title).toBe('Rapport d\'Analyse DCE - Infrastructure Cloud')
      expect(reportRecord!.format).toBe('PDF')
      expect(reportRecord!.language).toBe('fr')
      expect(reportRecord!.status).toBe('COMPLETED')
      expect(reportRecord!.analysisId).toBe(testAnalysisId)

      // Step 3: Verify download URL is accessible
      const downloadResponse = await fetch(exportResult.data.downloadUrl)
      expect(downloadResponse.status).toBe(200)
      expect(downloadResponse.headers.get('content-type')).toContain('application/pdf')

      // Step 4: Verify file content structure (basic PDF validation)
      const pdfBuffer = await downloadResponse.arrayBuffer()
      const pdfContent = new Uint8Array(pdfBuffer)
      
      // Basic PDF validation - should start with PDF header
      const pdfHeader = '%PDF-'
      const headerBytes = Array.from(pdfContent.slice(0, 5))
        .map(byte => String.fromCharCode(byte))
        .join('')
      
      expect(headerBytes).toBe(pdfHeader)
      expect(pdfContent.length).toBeGreaterThan(1000) // Should be substantial file
    })

    it('should generate DOCX export when requested', async () => {
      const exportRequest = {
        analysisId: testAnalysisId,
        reportTitle: 'DCE Analysis Report - Infrastructure',
        includeRecommendations: true,
        includeDetailedSections: false,
        format: 'DOCX',
        language: 'en'
      }

      const exportResponse = await fetch(`/api/tenders/${testAnalysisId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      })

      expect(exportResponse.status).toBe(200)
      const exportResult = await exportResponse.json()
      
      expect(exportResult.success).toBe(true)
      
      // Verify report record
      const reportRecord = await prisma.analysisReport.findUnique({
        where: { id: exportResult.data.reportId }
      })

      expect(reportRecord!.format).toBe('DOCX')
      expect(reportRecord!.language).toBe('en')
      expect(reportRecord!.includeDetailedSections).toBe(false)

      // Verify download
      const downloadResponse = await fetch(exportResult.data.downloadUrl)
      expect(downloadResponse.status).toBe(200)
      expect(downloadResponse.headers.get('content-type')).toContain('application/vnd.openxmlformats')
    })

    it('should handle export without recommendations', async () => {
      const exportRequest = {
        analysisId: testAnalysisId,
        reportTitle: 'Rapport Technique Seul',
        includeRecommendations: false,
        includeDetailedSections: true,
        format: 'PDF',
        language: 'fr'
      }

      const exportResponse = await fetch(`/api/tenders/${testAnalysisId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      })

      expect(exportResponse.status).toBe(200)
      const exportResult = await exportResponse.json()
      
      expect(exportResult.success).toBe(true)

      // Verify report configuration
      const reportRecord = await prisma.analysisReport.findUnique({
        where: { id: exportResult.data.reportId }
      })

      expect(reportRecord!.includeRecommendations).toBe(false)
      expect(reportRecord!.includeDetailedSections).toBe(true)

      // Verify file size is smaller (no recommendations section)
      expect(exportResult.data.fileSize).toBeLessThan(5000000) // Should be reasonable size
    })

    it('should handle export with minimal sections', async () => {
      const exportRequest = {
        analysisId: testAnalysisId,
        reportTitle: 'Rapport Résumé',
        includeRecommendations: false,
        includeDetailedSections: false,
        format: 'PDF'
      }

      const exportResponse = await fetch(`/api/tenders/${testAnalysisId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      })

      expect(exportResponse.status).toBe(200)
      const exportResult = await exportResponse.json()
      
      expect(exportResult.success).toBe(true)

      // Should still generate a valid report with basic information
      const reportRecord = await prisma.analysisReport.findUnique({
        where: { id: exportResult.data.reportId }
      })

      expect(reportRecord!.includeRecommendations).toBe(false)
      expect(reportRecord!.includeDetailedSections).toBe(false)
      expect(reportRecord!.status).toBe('COMPLETED')
    })

    it('should apply default values correctly', async () => {
      // Minimal request relying on defaults
      const exportRequest = {
        analysisId: testAnalysisId,
        reportTitle: 'Default Export Test'
      }

      const exportResponse = await fetch(`/api/tenders/${testAnalysisId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      })

      expect(exportResponse.status).toBe(200)
      const exportResult = await exportResponse.json()
      
      expect(exportResult.success).toBe(true)

      // Verify defaults were applied
      const reportRecord = await prisma.analysisReport.findUnique({
        where: { id: exportResult.data.reportId }
      })

      expect(reportRecord!.includeRecommendations).toBe(true) // Default
      expect(reportRecord!.includeDetailedSections).toBe(true) // Default
      expect(reportRecord!.format).toBe('PDF') // Default
      expect(reportRecord!.language).toBe('fr') // Default
    })

    it('should handle export errors gracefully', async () => {
      // Try to export non-existent analysis
      const exportRequest = {
        analysisId: 'clnonexistentanalysis',
        reportTitle: 'Failed Export Test'
      }

      const exportResponse = await fetch('/api/tenders/clnonexistentanalysis/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      })

      expect(exportResponse.status).toBe(404)
      const errorResult = await exportResponse.json()
      
      expect(errorResult.success).toBe(false)
      expect(errorResult.error.code).toBe('ANALYSIS_NOT_FOUND')
      expect(errorResult.error.message).toContain('not found')
    })

    it('should handle incomplete analysis export attempt', async () => {
      // Create incomplete analysis
      const incompleteAnalysis = await prisma.tenderAnalysis.create({
        data: {
          name: 'Incomplete Test Analysis',
          status: 'PROCESSING', // Not completed
          complexityScore: 5,
          overallConfidence: 0.0,
          projectId: testProjectId
        }
      })

      const exportRequest = {
        analysisId: incompleteAnalysis.id,
        reportTitle: 'Incomplete Analysis Export'
      }

      const exportResponse = await fetch(`/api/tenders/${incompleteAnalysis.id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      })

      expect(exportResponse.status).toBe(400)
      const errorResult = await exportResponse.json()
      
      expect(errorResult.success).toBe(false)
      expect(errorResult.error.code).toBe('GENERATION_FAILED')
      expect(errorResult.error.message).toContain('not completed')
    })

    it('should track export generation progress', async () => {
      // Start export
      const exportRequest = {
        analysisId: testAnalysisId,
        reportTitle: 'Progress Tracking Export',
        includeRecommendations: true,
        includeDetailedSections: true
      }

      const exportResponse = await fetch(`/api/tenders/${testAnalysisId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      })

      const exportResult = await exportResponse.json()
      const reportId = exportResult.data.reportId

      // Check generation progress
      const progressResponse = await fetch(`/api/tenders/${testAnalysisId}/export/${reportId}/status`)
      const progressData = await progressResponse.json()

      expect(progressData.success).toBe(true)
      expect(progressData.data.reportId).toBe(reportId)
      expect(progressData.data.status).toBeOneOf(['PROCESSING', 'COMPLETED'])
      
      if (progressData.data.status === 'COMPLETED') {
        expect(progressData.data.downloadUrl).toBeDefined()
        expect(progressData.data.fileSize).toBeGreaterThan(0)
      }
    })

    it('should handle concurrent export requests', async () => {
      // Start multiple exports simultaneously
      const exportRequests = [
        {
          analysisId: testAnalysisId,
          reportTitle: 'Concurrent Export 1',
          format: 'PDF'
        },
        {
          analysisId: testAnalysisId,
          reportTitle: 'Concurrent Export 2',
          format: 'DOCX'
        },
        {
          analysisId: testAnalysisId,
          reportTitle: 'Concurrent Export 3',
          format: 'PDF',
          language: 'en'
        }
      ]

      const exportPromises = exportRequests.map(request =>
        fetch(`/api/tenders/${testAnalysisId}/export`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request)
        })
      )

      const responses = await Promise.all(exportPromises)
      const results = await Promise.all(responses.map(r => r.json()))

      // All exports should succeed
      results.forEach(result => {
        expect(result.success).toBe(true)
        expect(result.data.reportId).toBeDefined()
        expect(result.data.downloadUrl).toBeDefined()
      })

      // All reports should be unique
      const reportIds = results.map(r => r.data.reportId)
      const uniqueReportIds = new Set(reportIds)
      expect(uniqueReportIds.size).toBe(3)

      // Verify all reports in database
      const reports = await prisma.analysisReport.findMany({
        where: { analysisId: testAnalysisId }
      })

      expect(reports).toHaveLength(3)
      expect(reports.filter(r => r.format === 'PDF')).toHaveLength(2)
      expect(reports.filter(r => r.format === 'DOCX')).toHaveLength(1)
    })
  })
})