import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

export interface MockFile {
  name: string
  size: number
  type: string
  content?: string
}

export interface TestProject {
  projectId: string
  userId: string
  organizationId: string
}

export function createMockFile(options: {
  name: string
  size: number
  type: string
  content?: string
}): MockFile {
  return {
    name: options.name,
    size: options.size,
    type: options.type,
    content: options.content || `Mock content for ${options.name}`
  }
}

export async function createTestProject(): Promise<TestProject> {
  // Create test user
  const testUserId = `test_user_${uuidv4()}`
  
  // Create test organization
  const testOrg = await prisma.organization.create({
    data: {
      name: `Test Organization ${Date.now()}`,
      domain: `test-${Date.now()}.com`,
      createdBy: testUserId
    }
  })

  // Create organization user relationship
  await prisma.organizationUser.create({
    data: {
      userId: testUserId,
      organizationId: testOrg.id,
      role: 'OWNER'
    }
  })

  // Create test project
  const testProject = await prisma.project.create({
    data: {
      name: `Test Project ${Date.now()}`,
      description: 'Test project for integration tests',
      organizationId: testOrg.id,
      createdBy: testUserId
    }
  })

  return {
    projectId: testProject.id,
    userId: testUserId,
    organizationId: testOrg.id
  }
}

export async function cleanupTestData(projectId: string, userId: string) {
  try {
    // Get project to find organization
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true }
    })

    if (project) {
      // Delete tender documents (cascade will handle tender analyses, sections, recommendations)
      await prisma.tenderDocument.deleteMany({
        where: { projectId }
      })

      // Delete project
      await prisma.project.delete({
        where: { id: projectId }
      })

      // Delete organization user relationship
      await prisma.organizationUser.deleteMany({
        where: { 
          userId,
          organizationId: project.organizationId
        }
      })

      // Delete organization
      await prisma.organization.delete({
        where: { id: project.organizationId }
      })
    }
  } catch (error) {
    console.warn('Error during test cleanup:', error)
  }
}

export function createMockAnalysisResults() {
  return {
    analysisId: `analysis_${uuidv4()}`,
    status: 'COMPLETED' as const,
    analysisName: 'Test Analysis Results',
    complexityScore: 7,
    overallConfidence: 0.89,
    analysisCompletedAt: new Date(),
    estimatedPreparationDays: 45,
    marketScope: {
      title: 'Test Infrastructure Project',
      description: 'Test project for integration testing',
      sector: 'INFRASTRUCTURE' as const,
      estimatedValue: 200000,
      contractingAuthority: 'Test Authority'
    },
    technicalRequirements: [
      {
        category: 'Security',
        requirement: 'ISO 27001 certification required',
        mandatory: true,
        confidence: 0.95,
        source: 'CCTP section 2.1'
      }
    ],
    evaluationCriteria: {
      technical: 60,
      financial: 40,
      details: {
        experience: 20,
        methodology: 25,
        price: 40
      }
    },
    timeConstraints: {
      submissionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      projectDuration: 12,
      keyMilestones: [
        {
          name: 'Phase 1 completion',
          date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          description: 'Initial setup and configuration'
        }
      ]
    },
    mandatoryRequirements: [
      'ISO 27001 certification',
      'Public sector experience'
    ],
    sections: [
      {
        id: `section_${uuidv4()}`,
        type: 'CCTP' as const,
        title: 'Technical Specifications',
        confidence: 0.92,
        pageCount: 15,
        extractedData: {
          requirements: ['Security', 'Performance'],
          complexity: 'medium'
        }
      }
    ]
  }
}

export function createMockRecommendation() {
  return {
    id: `rec_${uuidv4()}`,
    recommendationType: 'SERVICE_MATCH' as const,
    title: 'Antares Infrastructure Services',
    description: 'Perfect match for your infrastructure requirements',
    relevanceScore: 0.92,
    antaresServices: ['service_infrastructure', 'service_security'],
    estimatedEffort: 120,
    estimatedValue: 180000,
    riskLevel: 'MEDIUM' as const,
    actionable: true,
    createdAt: new Date(),
    reasoning: 'High match between requirements and Antares capabilities'
  }
}

export async function createTestAnalysis(projectId: string) {
  // Create test documents first
  const testDoc = await prisma.tenderDocument.create({
    data: {
      fileName: 'test-cctp.pdf',
      fileSize: 1024000,
      fileType: 'PDF',
      status: 'ANALYZED',
      documentType: 'CCTP',
      classification: {
        confidence: 0.95,
        type: 'cctp'
      },
      projectId
    }
  })

  // Create analysis
  const analysis = await prisma.tenderAnalysis.create({
    data: {
      name: 'Test Analysis',
      status: 'COMPLETED',
      complexityScore: 7,
      overallConfidence: 0.89,
      analysisCompletedAt: new Date(),
      estimatedPreparationDays: 45,
      marketScope: {
        title: 'Test Project',
        description: 'Test description',
        sector: 'INFRASTRUCTURE',
        estimatedValue: 200000
      },
      evaluationCriteria: {
        technical: 60,
        financial: 40
      },
      projectId
    }
  })

  return { analysis, document: testDoc }
}

export function mockFetch(url: string, options?: RequestInit) {
  // Mock fetch implementation for testing
  const response = {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: {} }),
    text: async () => 'OK'
  }
  
  return Promise.resolve(response as Response)
}