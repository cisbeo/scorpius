import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TenderAnalysisResults } from '@/app/components/tenders/TenderAnalysisResults'
import { createMockAnalysisResults } from '../test-utils'

// Mock the API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('TenderAnalysisResults Component', () => {
  const mockAnalysisData = createMockAnalysisResults()
  
  const mockProps = {
    analysisId: 'analysis_123',
    onExportRequest: vi.fn(),
    onEditRequest: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading spinner while fetching data', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(<TenderAnalysisResults {...mockProps} />)
      
      expect(screen.getByText(/chargement de l'analyse/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should show loading progress when available', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...mockAnalysisData,
            status: 'PROCESSING',
            progress: 65,
            currentStep: 'Extraction des exigences techniques'
          }
        })
      })
      
      render(<TenderAnalysisResults {...mockProps} />)
      
      waitFor(() => {
        expect(screen.getByText(/65%/)).toBeInTheDocument()
        expect(screen.getByText(/extraction des exigences techniques/i)).toBeInTheDocument()
      })
    })
  })

  describe('Analysis Results Display', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockAnalysisData
        })
      })
    })

    it('should display analysis overview correctly', async () => {
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(mockAnalysisData.analysisName)).toBeInTheDocument()
        expect(screen.getByText(/complexité.*7\/10/i)).toBeInTheDocument()
        expect(screen.getByText(/confiance.*89%/i)).toBeInTheDocument()
        expect(screen.getByText(/45 jours/i)).toBeInTheDocument()
      })
    })

    it('should display market scope information', async () => {
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(mockAnalysisData.marketScope!.title)).toBeInTheDocument()
        expect(screen.getByText(mockAnalysisData.marketScope!.description)).toBeInTheDocument()
        expect(screen.getByText(/infrastructure/i)).toBeInTheDocument()
        expect(screen.getByText(/200.*000.*€/)).toBeInTheDocument()
        expect(screen.getByText(mockAnalysisData.marketScope!.contractingAuthority!)).toBeInTheDocument()
      })
    })

    it('should display technical requirements with priority indicators', async () => {
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/iso 27001 certification required/i)).toBeInTheDocument()
        expect(screen.getByText(/obligatoire/i)).toBeInTheDocument()
        expect(screen.getByText(/95%.*confiance/i)).toBeInTheDocument()
        expect(screen.getByText(/cctp section 2\.1/i)).toBeInTheDocument()
      })
    })

    it('should display evaluation criteria with percentages', async () => {
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/technique.*60%/i)).toBeInTheDocument()
        expect(screen.getByText(/financier.*40%/i)).toBeInTheDocument()
        expect(screen.getByText(/expérience.*20%/i)).toBeInTheDocument()
        expect(screen.getByText(/méthodologie.*25%/i)).toBeInTheDocument()
      })
    })

    it('should display time constraints and deadlines', async () => {
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/12 mois/i)).toBeInTheDocument()
        expect(screen.getByText(/phase 1 completion/i)).toBeInTheDocument()
        expect(screen.getByText(/initial setup and configuration/i)).toBeInTheDocument()
      })
    })

    it('should display mandatory requirements list', async () => {
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/iso 27001 certification/i)).toBeInTheDocument()
        expect(screen.getByText(/public sector experience/i)).toBeInTheDocument()
      })
    })

    it('should display analyzed sections with confidence scores', async () => {
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/technical specifications/i)).toBeInTheDocument()
        expect(screen.getByText(/cctp/i)).toBeInTheDocument()
        expect(screen.getByText(/92%/i)).toBeInTheDocument()
        expect(screen.getByText(/15 pages/i)).toBeInTheDocument()
      })
    })
  })

  describe('Complexity Score Visualization', () => {
    it('should display complexity score with appropriate color coding', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...mockAnalysisData,
            complexityScore: 3 // Low complexity
          }
        })
      })
      
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        const complexityIndicator = screen.getByTestId('complexity-score')
        expect(complexityIndicator).toHaveClass('text-green-600') // Low complexity = green
        expect(screen.getByText(/3\/10/)).toBeInTheDocument()
        expect(screen.getByText(/complexité faible/i)).toBeInTheDocument()
      })
    })

    it('should show medium complexity with orange color', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...mockAnalysisData,
            complexityScore: 6 // Medium complexity
          }
        })
      })
      
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        const complexityIndicator = screen.getByTestId('complexity-score')
        expect(complexityIndicator).toHaveClass('text-orange-600') // Medium complexity = orange
        expect(screen.getByText(/complexité moyenne/i)).toBeInTheDocument()
      })
    })

    it('should show high complexity with red color', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...mockAnalysisData,
            complexityScore: 9 // High complexity
          }
        })
      })
      
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        const complexityIndicator = screen.getByTestId('complexity-score')
        expect(complexityIndicator).toHaveClass('text-red-600') // High complexity = red
        expect(screen.getByText(/complexité élevée/i)).toBeInTheDocument()
      })
    })
  })

  describe('Interactive Features', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockAnalysisData
        })
      })
    })

    it('should handle export button click', async () => {
      const user = userEvent.setup()
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /exporter en pdf/i })).toBeInTheDocument()
      })
      
      const exportButton = screen.getByRole('button', { name: /exporter en pdf/i })
      await user.click(exportButton)
      
      expect(mockProps.onExportRequest).toHaveBeenCalledWith({
        analysisId: mockProps.analysisId,
        format: 'PDF',
        title: mockAnalysisData.analysisName
      })
    })

    it('should handle edit analysis button click', async () => {
      const user = userEvent.setup()
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /modifier l'analyse/i })).toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /modifier l'analyse/i })
      await user.click(editButton)
      
      expect(mockProps.onEditRequest).toHaveBeenCalledWith(mockProps.analysisId)
    })

    it('should toggle detailed sections visibility', async () => {
      const user = userEvent.setup()
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /afficher les détails/i })).toBeInTheDocument()
      })
      
      const toggleButton = screen.getByRole('button', { name: /afficher les détails/i })
      await user.click(toggleButton)
      
      expect(screen.getByText(/masquer les détails/i)).toBeInTheDocument()
      expect(screen.getByTestId('detailed-sections')).toBeVisible()
    })

    it('should expand/collapse individual requirement sections', async () => {
      const user = userEvent.setup()
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/exigences techniques/i)).toBeInTheDocument()
      })
      
      const requirementHeader = screen.getByRole('button', { name: /exigences techniques/i })
      await user.click(requirementHeader)
      
      // Should collapse the section
      expect(screen.queryByText(/iso 27001 certification required/i)).not.toBeVisible()
      
      await user.click(requirementHeader)
      
      // Should expand the section again
      expect(screen.getByText(/iso 27001 certification required/i)).toBeVisible()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when analysis fails to load', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: {
            code: 'ANALYSIS_NOT_FOUND',
            message: 'Analyse non trouvée'
          }
        })
      })
      
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/analyse non trouvée/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()
      })
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/erreur de connexion/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()
      })
    })

    it('should retry loading when retry button is clicked', async () => {
      const user = userEvent.setup()
      
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()
      })
      
      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockAnalysisData
        })
      })
      
      const retryButton = screen.getByRole('button', { name: /réessayer/i })
      await user.click(retryButton)
      
      await waitFor(() => {
        expect(screen.getByText(mockAnalysisData.analysisName)).toBeInTheDocument()
      })
    })
  })

  describe('Missing Data Handling', () => {
    it('should handle missing optional fields gracefully', async () => {
      const incompleteData = {
        analysisId: 'analysis_123',
        status: 'COMPLETED',
        analysisName: 'Incomplete Analysis',
        complexityScore: 5,
        overallConfidence: 0.8
        // Missing optional fields like marketScope, technicalRequirements, etc.
      }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: incompleteData
        })
      })
      
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Incomplete Analysis')).toBeInTheDocument()
        expect(screen.getByText(/5\/10/)).toBeInTheDocument()
        expect(screen.getByText(/aucune information disponible/i)).toBeInTheDocument()
      })
    })

    it('should display placeholder for missing market scope', async () => {
      const dataWithoutMarketScope = {
        ...mockAnalysisData,
        marketScope: undefined
      }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: dataWithoutMarketScope
        })
      })
      
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/portée du marché non disponible/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockAnalysisData
        })
      })
    })

    it('should have proper heading hierarchy', async () => {
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
        expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(expect.any(Number))
        expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(expect.any(Number))
      })
    })

    it('should have proper ARIA labels for interactive elements', async () => {
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/score de complexité/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/niveau de confiance/i)).toBeInTheDocument()
      })
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /exporter en pdf/i })).toBeInTheDocument()
      })
      
      // Tab through interactive elements
      await user.tab()
      expect(screen.getByRole('button', { name: /afficher les détails/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /exporter en pdf/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /modifier l'analyse/i })).toHaveFocus()
    })

    it('should announce status changes to screen readers', async () => {
      render(<TenderAnalysisResults {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/analyse terminée/i)
      })
    })
  })
})