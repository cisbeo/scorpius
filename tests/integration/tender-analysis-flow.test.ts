import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { createTestProject, cleanupTestData, createTestAnalysis, createMockAnalysisResults, createMockRecommendation } from '../test-utils'

const prisma = new PrismaClient()

describe('Tender Analysis Flow Integration', () => {
  let testProjectId: string
  let testUserId: string
  let testDocumentId: string

  beforeEach(async () => {
    // Setup test data
    const testData = await createTestProject()
    testProjectId = testData.projectId
    testUserId = testData.userId

    // Create test document for analysis
    const testDoc = await prisma.tenderDocument.create({
      data: {
        fileName: 'cctp-analysis-test.pdf',
        fileSize: 2048000,
        fileType: 'PDF',
        status: 'ANALYZED',
        documentType: 'CCTP',
        classification: {
          confidence: 0.95,
          type: 'cctp',
          sections: ['specifications', 'requirements', 'constraints']
        },
        projectId: testProjectId
      }
    })
    testDocumentId = testDoc.id
  })

  afterEach(async () => {
    // Cleanup test data
    await cleanupTestData(testProjectId, testUserId)
  })

  describe('Document Analysis → Results → Recommendations Workflow', () => {
    it('should successfully analyze documents and generate comprehensive results', async () => {
      // Step 1: Start analysis
      const analysisRequest = {
        documentIds: [testDocumentId],
        analysisName: 'Test Infrastructure Analysis',
        options: {
          includeRecommendations: true,
          detailedExtraction: true,
          generateReport: false
        }
      }

      const analysisResponse = await fetch('/api/tenders/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysisRequest)
      })

      expect(analysisResponse.status).toBe(200)
      const analysisResult = await analysisResponse.json()
      
      expect(analysisResult.success).toBe(true)
      expect(analysisResult.data.analysisId).toBeDefined()
      expect(analysisResult.data.status).toBe('PROCESSING')

      const analysisId = analysisResult.data.analysisId

      // Step 2: Verify analysis created in database
      const storedAnalysis = await prisma.tenderAnalysis.findUnique({
        where: { id: analysisId }
      })

      expect(storedAnalysis).toBeDefined()
      expect(storedAnalysis!.name).toBe('Test Infrastructure Analysis')
      expect(storedAnalysis!.status).toBe('PROCESSING')
      expect(storedAnalysis!.projectId).toBe(testProjectId)

      // Step 3: Simulate AI analysis completion
      const mockResults = createMockAnalysisResults()
      
      const updatedAnalysis = await prisma.tenderAnalysis.update({
        where: { id: analysisId },
        data: {
          status: 'COMPLETED',
          complexityScore: mockResults.complexityScore,
          overallConfidence: mockResults.overallConfidence,
          analysisCompletedAt: mockResults.analysisCompletedAt,
          estimatedPreparationDays: mockResults.estimatedPreparationDays,
          marketScope: mockResults.marketScope,
          evaluationCriteria: mockResults.evaluationCriteria,
          timeConstraints: mockResults.timeConstraints,
          mandatoryRequirements: mockResults.mandatoryRequirements
        }
      })

      expect(updatedAnalysis.status).toBe('COMPLETED')
      expect(updatedAnalysis.complexityScore).toBe(7)
      expect(updatedAnalysis.overallConfidence).toBeCloseTo(0.89)

      // Step 4: Create analysis sections
      const section = await prisma.tenderSection.create({
        data: {
          type: 'CCTP',
          title: 'Technical Specifications',
          confidence: 0.92,
          pageCount: 15,
          extractedData: {
            requirements: ['Security', 'Performance'],
            complexity: 'medium'
          },
          analysisId,
          documentId: testDocumentId
        }
      })

      // Step 5: Generate Antares recommendations
      const mockRec = createMockRecommendation()
      const recommendation = await prisma.antaresRecommendation.create({
        data: {
          recommendationType: mockRec.recommendationType,
          title: mockRec.title,
          description: mockRec.description,
          relevanceScore: mockRec.relevanceScore,
          antaresServices: mockRec.antaresServices,
          estimatedEffort: mockRec.estimatedEffort,
          estimatedValue: mockRec.estimatedValue,
          riskLevel: mockRec.riskLevel,
          actionable: mockRec.actionable,
          reasoning: mockRec.reasoning,
          analysisId
        }
      })

      // Step 6: Fetch complete results
      const resultsResponse = await fetch(`/api/tenders/${analysisId}/results`)
      
      expect(resultsResponse.status).toBe(200)
      const resultsData = await resultsResponse.json()

      expect(resultsData.success).toBe(true)
      expect(resultsData.data.analysisId).toBe(analysisId)
      expect(resultsData.data.status).toBe('COMPLETED')
      expect(resultsData.data.complexityScore).toBe(7)
      expect(resultsData.data.overallConfidence).toBeCloseTo(0.89)
      
      // Verify market scope
      expect(resultsData.data.marketScope).toBeDefined()
      expect(resultsData.data.marketScope.sector).toBe('INFRASTRUCTURE')
      
      // Verify sections
      expect(resultsData.data.sections).toBeDefined()
      expect(resultsData.data.sections).toHaveLength(1)
      expect(resultsData.data.sections[0].type).toBe('CCTP')
      
      // Verify recommendations
      expect(resultsData.data.recommendations).toBeDefined()
      expect(resultsData.data.recommendations).toHaveLength(1)
      expect(resultsData.data.recommendations[0].recommendationType).toBe('SERVICE_MATCH')
    })

    it('should handle multiple documents with different types', async () => {
      // Create additional test documents
      const ccpDoc = await prisma.tenderDocument.create({
        data: {
          fileName: 'ccp-commercial.docx',
          fileSize: 800000,
          fileType: 'DOCX',
          status: 'ANALYZED',
          documentType: 'CCP',
          classification: { confidence: 0.88, type: 'ccp' },
          projectId: testProjectId
        }
      })

      const bpuDoc = await prisma.tenderDocument.create({
        data: {
          fileName: 'bpu-prix.pdf',
          fileSize: 600000,
          fileType: 'PDF',
          status: 'ANALYZED',
          documentType: 'BPU',
          classification: { confidence: 0.85, type: 'bpu' },
          projectId: testProjectId
        }
      })

      // Analyze all documents together
      const analysisRequest = {
        documentIds: [testDocumentId, ccpDoc.id, bpuDoc.id],
        analysisName: 'Multi-Document DCE Analysis',
        options: {
          includeRecommendations: true,
          detailedExtraction: true
        }
      }

      const analysisResponse = await fetch('/api/tenders/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysisRequest)
      })

      expect(analysisResponse.status).toBe(200)
      const analysisResult = await analysisResponse.json()
      
      expect(analysisResult.success).toBe(true)
      
      const analysisId = analysisResult.data.analysisId

      // Simulate analysis completion with complex scoring
      await prisma.tenderAnalysis.update({
        where: { id: analysisId },
        data: {
          status: 'COMPLETED',
          complexityScore: 9, // Higher complexity due to multiple documents
          overallConfidence: 0.91,
          analysisCompletedAt: new Date(),
          estimatedPreparationDays: 75
        }
      })

      // Create sections for each document type
      const sectionTypes = [
        { type: 'CCTP', docId: testDocumentId, title: 'Technical Specifications' },
        { type: 'CCP', docId: ccpDoc.id, title: 'Commercial Conditions' },
        { type: 'BPU', docId: bpuDoc.id, title: 'Price Schedule' }
      ]

      for (const sectionData of sectionTypes) {
        await prisma.tenderSection.create({
          data: {
            type: sectionData.type as any,
            title: sectionData.title,
            confidence: 0.90,
            pageCount: 10,
            extractedData: { type: sectionData.type.toLowerCase() },
            analysisId,
            documentId: sectionData.docId
          }
        })
      }

      // Fetch results and verify multi-document analysis
      const resultsResponse = await fetch(`/api/tenders/${analysisId}/results`)
      const resultsData = await resultsResponse.json()

      expect(resultsData.success).toBe(true)
      expect(resultsData.data.complexityScore).toBe(9)
      expect(resultsData.data.sections).toHaveLength(3)
      
      // Verify all document types are represented
      const sectionTypesFound = resultsData.data.sections.map((s: any) => s.type)
      expect(sectionTypesFound).toContain('CCTP')
      expect(sectionTypesFound).toContain('CCP')
      expect(sectionTypesFound).toContain('BPU')
    })

    it('should generate multiple recommendations based on complexity', async () => {
      // Start analysis
      const analysisRequest = {
        documentIds: [testDocumentId],
        analysisName: 'Complex Infrastructure Project',
        options: {
          includeRecommendations: true,
          detailedExtraction: true
        }
      }

      const analysisResponse = await fetch('/api/tenders/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysisRequest)
      })

      const analysisResult = await analysisResponse.json()
      const analysisId = analysisResult.data.analysisId

      // Complete analysis
      await prisma.tenderAnalysis.update({
        where: { id: analysisId },
        data: {
          status: 'COMPLETED',
          complexityScore: 8,
          overallConfidence: 0.87,
          analysisCompletedAt: new Date()
        }
      })

      // Generate multiple recommendations
      const recommendations = [
        {
          type: 'SERVICE_MATCH',
          title: 'Infrastructure Modernization Services',
          relevance: 0.95,
          effort: 200,
          value: 380000,
          risk: 'MEDIUM'
        },
        {
          type: 'PARTNERSHIP',
          title: 'Strategic Partnership for Cloud Migration',
          relevance: 0.82,
          effort: 150,
          value: 280000,
          risk: 'LOW'
        },
        {
          type: 'SUBCONTRACTING',
          title: 'Security Audit Subcontracting',
          relevance: 0.76,
          effort: 80,
          value: 120000,
          risk: 'LOW'
        }
      ]

      for (const rec of recommendations) {
        await prisma.antaresRecommendation.create({
          data: {
            recommendationType: rec.type as any,
            title: rec.title,
            description: `Detailed description for ${rec.title}`,
            relevanceScore: rec.relevance,
            antaresServices: ['service_infrastructure', 'service_cloud'],
            estimatedEffort: rec.effort,
            estimatedValue: rec.value,
            riskLevel: rec.risk as any,
            actionable: true,
            reasoning: `Generated based on analysis complexity and requirements`,
            analysisId
          }
        })
      }

      // Fetch results and verify recommendations
      const resultsResponse = await fetch(`/api/tenders/${analysisId}/results`)
      const resultsData = await resultsResponse.json()

      expect(resultsData.success).toBe(true)
      expect(resultsData.data.recommendations).toHaveLength(3)
      
      // Verify recommendations are sorted by relevance (highest first)
      const relevanceScores = resultsData.data.recommendations.map((r: any) => r.relevanceScore)
      expect(relevanceScores).toEqual([0.95, 0.82, 0.76])
      
      // Verify recommendation types
      const recTypes = resultsData.data.recommendations.map((r: any) => r.recommendationType)
      expect(recTypes).toContain('SERVICE_MATCH')
      expect(recTypes).toContain('PARTNERSHIP')
      expect(recTypes).toContain('SUBCONTRACTING')
    })

    it('should handle analysis errors gracefully', async () => {
      // Try to analyze non-existent document
      const analysisRequest = {
        documentIds: ['clnonexistentdoc123'],
        analysisName: 'Failed Analysis Test'
      }

      const analysisResponse = await fetch('/api/tenders/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysisRequest)
      })

      expect(analysisResponse.status).toBe(404)
      const errorResult = await analysisResponse.json()
      
      expect(errorResult.success).toBe(false)
      expect(errorResult.error.code).toBe('DOCUMENTS_NOT_FOUND')
    })

    it('should track analysis progress correctly', async () => {
      // Start analysis
      const analysisRequest = {
        documentIds: [testDocumentId],
        analysisName: 'Progress Tracking Test'
      }

      const analysisResponse = await fetch('/api/tenders/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysisRequest)
      })

      const analysisResult = await analysisResponse.json()
      const analysisId = analysisResult.data.analysisId

      // Check initial progress
      const progressResponse = await fetch(`/api/tenders/${analysisId}/progress`)
      const progressData = await progressResponse.json()

      expect(progressData.success).toBe(true)
      expect(progressData.data.analysisId).toBe(analysisId)
      expect(progressData.data.status).toBe('PROCESSING')
      expect(progressData.data.progress).toBeGreaterThanOrEqual(0)
      expect(progressData.data.progress).toBeLessThanOrEqual(100)

      // Simulate progress updates
      const progressSteps = [
        { progress: 25, step: 'Document classification completed' },
        { progress: 50, step: 'Content extraction in progress' },
        { progress: 75, step: 'AI analysis in progress' },
        { progress: 100, step: 'Analysis completed' }
      ]

      for (const step of progressSteps) {
        // Update progress would be done by the analysis service
        const updatedProgressResponse = await fetch(`/api/tenders/${analysisId}/progress`)
        const updatedProgressData = await updatedProgressResponse.json()
        
        expect(updatedProgressData.success).toBe(true)
      }
    })
  })
})