import { describe, it, expect } from 'vitest'
import { TenderAnalysisResultsSchema, AntaresRecommendationSchema, ReportGenerationRequestSchema, ReportGenerationResponseSchema } from '@/lib/validators/dce/tender-analysis'

describe('Tender Results API Contract', () => {
  describe('TenderAnalysisResultsSchema (GET endpoint)', () => {
    it('should validate complete analysis results response', () => {
      const completeResults = {
        success: true,
        data: {
          analysisId: 'analysis_456',
          status: 'COMPLETED',
          analysisName: 'Analyse DCE Infrastructure Cloud',
          complexityScore: 8,
          overallConfidence: 0.89,
          analysisCompletedAt: new Date('2025-03-15T16:45:00Z'),
          estimatedPreparationDays: 60,
          marketScope: {
            title: 'Migration infrastructure vers le cloud public',
            description: 'Modernisation complète de l\'infrastructure IT avec migration cloud hybride',
            sector: 'INFRASTRUCTURE',
            estimatedValue: 450000,
            contractingAuthority: 'Métropole de Lyon'
          },
          technicalRequirements: [
            {
              category: 'Sécurité',
              requirement: 'Conformité RGPD et certification HDS',
              mandatory: true,
              confidence: 0.98,
              source: 'CCTP section 3.2'
            },
            {
              category: 'Performance',
              requirement: 'Disponibilité 99.9% garantie',
              mandatory: true,
              confidence: 0.94,
              source: 'CCP article 12'
            },
            {
              category: 'Intégration',
              requirement: 'API REST compatibles avec SI existant',
              mandatory: false,
              confidence: 0.87,
              source: 'CCTP annexe B'
            }
          ],
          evaluationCriteria: {
            technical: 65,
            financial: 35,
            details: {
              experience: 25,
              methodology: 20,
              innovation: 20,
              references: 15,
              price: 35
            }
          },
          timeConstraints: {
            submissionDeadline: new Date('2025-05-15T12:00:00Z'),
            projectDuration: 24,
            keyMilestones: [
              {
                name: 'Phase pilote',
                date: new Date('2025-07-01T00:00:00Z'),
                description: 'Migration de 20% des services'
              },
              {
                name: 'Bascule générale',
                date: new Date('2025-12-01T00:00:00Z'),
                description: 'Migration complète des services'
              }
            ]
          },
          mandatoryRequirements: [
            'Certification ISO 27001',
            'Agrément SecNumCloud ANSSI',
            'Expérience secteur public ≥ 5 ans',
            'Équipe technique dédiée'
          ],
          sections: [
            {
              id: 'section_cctp_1',
              type: 'CCTP',
              title: 'Cahier des Clauses Techniques Particulières',
              confidence: 0.96,
              pageCount: 42,
              extractedData: {
                requirements: ['Security', 'Performance', 'Integration'],
                complexity: 'high'
              }
            },
            {
              id: 'section_ccp_1',
              type: 'CCP',
              title: 'Cahier des Clauses Particulières',
              confidence: 0.91,
              pageCount: 18,
              extractedData: {
                contractualTerms: ['SLA', 'Penalties', 'Warranties']
              }
            }
          ]
        }
      }

      const result = TenderAnalysisResultsSchema.safeParse(completeResults)
      expect(result.success).toBe(true)
    })

    it('should validate processing status response', () => {
      const processingResults = {
        success: true,
        data: {
          analysisId: 'analysis_789',
          status: 'PROCESSING',
          analysisName: 'Analyse en cours...',
          complexityScore: 6,
          overallConfidence: 0.0
        }
      }

      const result = TenderAnalysisResultsSchema.safeParse(processingResults)
      expect(result.success).toBe(true)
    })

    it('should validate error response with analysis failure', () => {
      const errorResults = {
        success: false,
        error: {
          code: 'ANALYSIS_FAILED',
          message: 'Échec de l\'analyse: documents corrompus',
          details: {
            failedDocuments: ['doc_1', 'doc_3'],
            errorType: 'PARSING_ERROR'
          }
        }
      }

      const result = TenderAnalysisResultsSchema.safeParse(errorResults)
      expect(result.success).toBe(true)
    })

    it('should validate timeout error response', () => {
      const timeoutResults = {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'L\'analyse a dépassé le délai imparti (30 minutes)',
          details: {
            timeoutDuration: 1800000,
            partialResults: true
          }
        }
      }

      const result = TenderAnalysisResultsSchema.safeParse(timeoutResults)
      expect(result.success).toBe(true)
    })

    it('should validate all document section types', () => {
      const sectionTypes = ['CCTP', 'CCP', 'BPU', 'RC', 'OTHER']
      
      sectionTypes.forEach(type => {
        const results = {
          success: true,
          data: {
            analysisId: 'test',
            status: 'COMPLETED',
            analysisName: 'Test',
            complexityScore: 5,
            overallConfidence: 0.8,
            sections: [
              {
                id: 'section_test',
                type,
                title: `Section ${type}`,
                confidence: 0.9,
                pageCount: 10
              }
            ]
          }
        }

        const validation = TenderAnalysisResultsSchema.safeParse(results)
        expect(validation.success).toBe(true)
      })
    })

    it('should validate evaluation criteria percentages sum', () => {
      const results = {
        success: true,
        data: {
          analysisId: 'test',
          status: 'COMPLETED',
          analysisName: 'Test',
          complexityScore: 5,
          overallConfidence: 0.8,
          evaluationCriteria: {
            technical: 70,
            financial: 30
            // Total = 100%
          }
        }
      }

      const validation = TenderAnalysisResultsSchema.safeParse(results)
      expect(validation.success).toBe(true)
    })
  })

  describe('AntaresRecommendationSchema', () => {
    it('should validate complete Antares recommendation', () => {
      const recommendation = {
        id: 'rec_123456',
        recommendationType: 'SERVICE_MATCH',
        title: 'Migration Cloud Hybride - Expertise Antares',
        description: 'Notre équipe Infrastructure Cloud peut prendre en charge la migration complète vers un environnement hybride sécurisé.',
        relevanceScore: 0.94,
        antaresServices: ['service_cloud_migration', 'service_security_audit', 'service_project_management'],
        estimatedEffort: 180,
        estimatedValue: 350000,
        riskLevel: 'MEDIUM',
        actionable: true,
        createdAt: new Date('2025-03-15T17:00:00Z'),
        reasoning: 'Correspondance élevée entre les exigences techniques du DCE et nos compétences certifiées en migration cloud et sécurité.'
      }

      const result = AntaresRecommendationSchema.safeParse(recommendation)
      expect(result.success).toBe(true)
    })

    it('should validate all recommendation types', () => {
      const types = ['SERVICE_MATCH', 'PARTNERSHIP', 'SUBCONTRACTING', 'PASS']
      
      types.forEach(type => {
        const recommendation = {
          id: 'rec_test',
          recommendationType: type,
          title: 'Test recommendation',
          description: 'Test description',
          relevanceScore: 0.8,
          antaresServices: ['service_1'],
          riskLevel: 'LOW',
          actionable: true,
          createdAt: new Date()
        }

        const validation = AntaresRecommendationSchema.safeParse(recommendation)
        expect(validation.success).toBe(true)
      })
    })

    it('should validate all risk levels', () => {
      const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
      
      riskLevels.forEach(riskLevel => {
        const recommendation = {
          id: 'rec_test',
          recommendationType: 'SERVICE_MATCH',
          title: 'Test recommendation',
          description: 'Test description',
          relevanceScore: 0.8,
          antaresServices: ['service_1'],
          riskLevel,
          actionable: true,
          createdAt: new Date()
        }

        const validation = AntaresRecommendationSchema.safeParse(recommendation)
        expect(validation.success).toBe(true)
      })
    })

    it('should validate relevance score range', () => {
      const invalidScores = [-0.1, 1.1, 2.0]
      
      invalidScores.forEach(score => {
        const recommendation = {
          id: 'rec_test',
          recommendationType: 'SERVICE_MATCH',
          title: 'Test',
          description: 'Test',
          relevanceScore: score,
          antaresServices: ['service_1'],
          riskLevel: 'LOW',
          actionable: true,
          createdAt: new Date()
        }

        const validation = AntaresRecommendationSchema.safeParse(recommendation)
        expect(validation.success).toBe(false)
      })
    })
  })

  describe('ReportGenerationRequestSchema', () => {
    it('should validate complete report generation request', () => {
      const request = {
        analysisId: 'clanalysis123456789',
        reportTitle: 'Rapport d\'analyse DCE - Infrastructure Cloud',
        includeRecommendations: true,
        includeDetailedSections: true,
        format: 'PDF',
        language: 'fr'
      }

      const result = ReportGenerationRequestSchema.safeParse(request)
      expect(result.success).toBe(true)
    })

    it('should apply default values correctly', () => {
      const minimalRequest = {
        analysisId: 'clanalysis123456789',
        reportTitle: 'Rapport DCE'
      }

      const result = ReportGenerationRequestSchema.parse(minimalRequest)
      expect(result.includeRecommendations).toBe(true)
      expect(result.includeDetailedSections).toBe(true)
      expect(result.format).toBe('PDF')
      expect(result.language).toBe('fr')
    })

    it('should validate supported formats', () => {
      const formats = ['PDF', 'DOCX']
      
      formats.forEach(format => {
        const request = {
          analysisId: 'clanalysis123456789',
          reportTitle: 'Test Report',
          format
        }

        const validation = ReportGenerationRequestSchema.safeParse(request)
        expect(validation.success).toBe(true)
      })
    })

    it('should validate supported languages', () => {
      const languages = ['fr', 'en']
      
      languages.forEach(language => {
        const request = {
          analysisId: 'clanalysis123456789',
          reportTitle: 'Test Report',
          language
        }

        const validation = ReportGenerationRequestSchema.safeParse(request)
        expect(validation.success).toBe(true)
      })
    })

    it('should reject invalid analysis ID format', () => {
      const request = {
        analysisId: 'invalid-id',
        reportTitle: 'Test Report'
      }

      const result = ReportGenerationRequestSchema.safeParse(request)
      expect(result.success).toBe(false)
    })

    it('should reject report title too long', () => {
      const request = {
        analysisId: 'clanalysis123456789',
        reportTitle: 'A'.repeat(201)
      }

      const result = ReportGenerationRequestSchema.safeParse(request)
      expect(result.success).toBe(false)
    })
  })

  describe('ReportGenerationResponseSchema', () => {
    it('should validate successful report generation', () => {
      const successResponse = {
        success: true,
        data: {
          reportId: 'report_123456',
          downloadUrl: 'https://storage.example.com/reports/report_123456.pdf',
          expiresAt: new Date('2025-03-22T17:00:00Z'),
          fileSize: 2048576
        }
      }

      const result = ReportGenerationResponseSchema.safeParse(successResponse)
      expect(result.success).toBe(true)
    })

    it('should validate error response', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: 'Échec de la génération du rapport PDF'
        }
      }

      const result = ReportGenerationResponseSchema.safeParse(errorResponse)
      expect(result.success).toBe(true)
    })

    it('should validate all error codes', () => {
      const errorCodes = ['ANALYSIS_NOT_FOUND', 'GENERATION_FAILED', 'ACCESS_DENIED']
      
      errorCodes.forEach(code => {
        const errorResponse = {
          success: false,
          error: {
            code,
            message: 'Test error message'
          }
        }

        const validation = ReportGenerationResponseSchema.safeParse(errorResponse)
        expect(validation.success).toBe(true)
      })
    })
  })
})