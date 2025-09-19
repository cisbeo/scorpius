import { describe, it, expect } from 'vitest'
import { TenderAnalysisRequestSchema, TenderAnalysisResultsSchema, AnalysisProgressSchema } from '@/lib/validators/dce/tender-analysis'

describe('Tender Analysis API Contract', () => {
  describe('TenderAnalysisRequestSchema', () => {
    it('should validate valid analysis request', () => {
      const validRequest = {
        documentIds: ['cldoc123456789', 'cldoc987654321'],
        analysisName: 'Analyse marché cybersécurité',
        options: {
          includeRecommendations: true,
          detailedExtraction: false,
          generateReport: true
        }
      }

      const result = TenderAnalysisRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should validate minimal request without options', () => {
      const minimalRequest = {
        documentIds: ['cldoc123456789']
      }

      const result = TenderAnalysisRequestSchema.safeParse(minimalRequest)
      expect(result.success).toBe(true)
    })

    it('should reject empty document IDs array', () => {
      const invalidRequest = {
        documentIds: []
      }

      const result = TenderAnalysisRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toContain('Au moins un document est requis')
    })

    it('should reject more than 10 documents', () => {
      const tooManyDocs = Array.from({ length: 11 }, (_, i) => `cldoc${i}`)
      const invalidRequest = {
        documentIds: tooManyDocs
      }

      const result = TenderAnalysisRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toContain('Maximum 10 documents')
    })

    it('should reject invalid CUID format', () => {
      const invalidRequest = {
        documentIds: ['invalid-id']
      }

      const result = TenderAnalysisRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject analysis name too long', () => {
      const longName = 'A'.repeat(101)
      const invalidRequest = {
        documentIds: ['cldoc123456789'],
        analysisName: longName
      }

      const result = TenderAnalysisRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toContain('100 caractères')
    })

    it('should apply default options correctly', () => {
      const request = {
        documentIds: ['cldoc123456789'],
        options: {}
      }

      const result = TenderAnalysisRequestSchema.parse(request)
      expect(result.options?.includeRecommendations).toBe(true)
      expect(result.options?.detailedExtraction).toBe(false)
      expect(result.options?.generateReport).toBe(false)
    })
  })

  describe('TenderAnalysisResultsSchema', () => {
    it('should validate successful analysis results', () => {
      const successResult = {
        success: true,
        data: {
          analysisId: 'analysis_123',
          status: 'COMPLETED',
          analysisName: 'Analyse Infrastructure IT',
          complexityScore: 7,
          overallConfidence: 0.85,
          analysisCompletedAt: new Date('2025-03-15T14:30:00Z'),
          estimatedPreparationDays: 45,
          marketScope: {
            title: 'Modernisation infrastructure IT',
            description: 'Mise à niveau complète du système informatique',
            sector: 'INFRASTRUCTURE',
            estimatedValue: 250000,
            contractingAuthority: 'Conseil Départemental'
          },
          technicalRequirements: [
            {
              category: 'Sécurité',
              requirement: 'Certification ISO 27001 obligatoire',
              mandatory: true,
              confidence: 0.95,
              source: 'CCTP'
            }
          ],
          evaluationCriteria: {
            technical: 60,
            financial: 40,
            details: {
              experience: 20,
              methodology: 25,
              innovation: 15
            }
          },
          timeConstraints: {
            submissionDeadline: new Date('2025-04-30T17:00:00Z'),
            projectDuration: 18,
            keyMilestones: [
              {
                name: 'Audit initial',
                date: new Date('2025-06-01T00:00:00Z'),
                description: 'Évaluation de l\'existant'
              }
            ]
          },
          mandatoryRequirements: [
            'Certification ISO 27001',
            'Expérience secteur public'
          ],
          sections: [
            {
              id: 'section_1',
              type: 'CCTP',
              title: 'Cahier des Clauses Techniques Particulières',
              confidence: 0.92,
              pageCount: 25,
              extractedData: {
                requirements: ['Security', 'Performance']
              }
            }
          ]
        }
      }

      const result = TenderAnalysisResultsSchema.safeParse(successResult)
      expect(result.success).toBe(true)
    })

    it('should validate error response', () => {
      const errorResult = {
        success: false,
        error: {
          code: 'ANALYSIS_FAILED',
          message: 'Échec de l\'analyse des documents',
          details: {
            failedDocuments: ['doc1', 'doc2']
          }
        }
      }

      const result = TenderAnalysisResultsSchema.safeParse(errorResult)
      expect(result.success).toBe(true)
    })

    it('should validate all sector types', () => {
      const sectors = ['INFRASTRUCTURE', 'DEVELOPMENT', 'CYBERSECURITY', 'MIXED']
      
      sectors.forEach(sector => {
        const result = {
          success: true,
          data: {
            analysisId: 'test',
            status: 'COMPLETED',
            analysisName: 'Test',
            complexityScore: 5,
            overallConfidence: 0.8,
            marketScope: {
              title: 'Test',
              description: 'Test',
              sector
            }
          }
        }

        const validation = TenderAnalysisResultsSchema.safeParse(result)
        expect(validation.success).toBe(true)
      })
    })

    it('should validate complexity score range', () => {
      const invalidScores = [0, 11, -1, 5.5]
      
      invalidScores.forEach(score => {
        const result = {
          success: true,
          data: {
            analysisId: 'test',
            status: 'COMPLETED',
            analysisName: 'Test',
            complexityScore: score,
            overallConfidence: 0.8
          }
        }

        const validation = TenderAnalysisResultsSchema.safeParse(result)
        expect(validation.success).toBe(false)
      })
    })

    it('should validate confidence score range', () => {
      const invalidConfidences = [-0.1, 1.1, 2]
      
      invalidConfidences.forEach(confidence => {
        const result = {
          success: true,
          data: {
            analysisId: 'test',
            status: 'COMPLETED',
            analysisName: 'Test',
            complexityScore: 5,
            overallConfidence: confidence
          }
        }

        const validation = TenderAnalysisResultsSchema.safeParse(result)
        expect(validation.success).toBe(false)
      })
    })
  })

  describe('AnalysisProgressSchema', () => {
    it('should validate progress tracking', () => {
      const progress = {
        analysisId: 'analysis_123',
        status: 'PROCESSING',
        progress: 65,
        currentStep: 'Extraction des exigences techniques',
        estimatedTimeRemaining: 180,
        steps: [
          {
            name: 'Classification documents',
            status: 'completed',
            startedAt: new Date('2025-03-15T10:00:00Z'),
            completedAt: new Date('2025-03-15T10:05:00Z'),
            duration: 300000
          },
          {
            name: 'Extraction contenu',
            status: 'processing',
            startedAt: new Date('2025-03-15T10:05:00Z')
          },
          {
            name: 'Analyse IA',
            status: 'pending'
          }
        ]
      }

      const result = AnalysisProgressSchema.safeParse(progress)
      expect(result.success).toBe(true)
    })

    it('should validate progress percentage range', () => {
      const invalidProgress = [-1, 101, 150]
      
      invalidProgress.forEach(progress => {
        const progressObj = {
          analysisId: 'test',
          status: 'PROCESSING',
          progress
        }

        const validation = AnalysisProgressSchema.safeParse(progressObj)
        expect(validation.success).toBe(false)
      })
    })

    it('should validate all status values', () => {
      const statuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'ERROR']
      
      statuses.forEach(status => {
        const progress = {
          analysisId: 'test',
          status,
          progress: 50
        }

        const validation = AnalysisProgressSchema.safeParse(progress)
        expect(validation.success).toBe(true)
      })
    })

    it('should validate step status values', () => {
      const stepStatuses = ['pending', 'processing', 'completed', 'error']
      
      stepStatuses.forEach(stepStatus => {
        const progress = {
          analysisId: 'test',
          status: 'PROCESSING',
          progress: 50,
          steps: [
            {
              name: 'Test step',
              status: stepStatus
            }
          ]
        }

        const validation = AnalysisProgressSchema.safeParse(progress)
        expect(validation.success).toBe(true)
      })
    })
  })
})