import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TenderRecommendations } from '@/app/components/tenders/TenderRecommendations'
import { createMockRecommendation } from '../test-utils'

describe('TenderRecommendations Component', () => {
  const mockRecommendations = [
    {
      ...createMockRecommendation(),
      id: 'rec_1',
      recommendationType: 'SERVICE_MATCH',
      title: 'Services Infrastructure Cloud - Antares',
      relevanceScore: 0.95,
      estimatedValue: 420000,
      riskLevel: 'MEDIUM',
      antaresServices: ['cloud_migration', 'infrastructure_design', 'security_audit']
    },
    {
      ...createMockRecommendation(),
      id: 'rec_2',
      recommendationType: 'PARTNERSHIP',
      title: 'Partenariat Stratégique Cloud',
      relevanceScore: 0.82,
      estimatedValue: 280000,
      riskLevel: 'LOW',
      antaresServices: ['cloud_strategy', 'architecture_consulting']
    },
    {
      ...createMockRecommendation(),
      id: 'rec_3',
      recommendationType: 'SUBCONTRACTING',
      title: 'Sous-traitance Audit Sécurité',
      relevanceScore: 0.76,
      estimatedValue: 120000,
      riskLevel: 'LOW',
      antaresServices: ['security_audit', 'compliance_assessment']
    }
  ]

  const mockProps = {
    analysisId: 'analysis_123',
    recommendations: mockRecommendations,
    onSelectRecommendation: vi.fn(),
    onRequestQuote: vi.fn(),
    onViewServiceDetails: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Recommendations Display', () => {
    it('should display all recommendations sorted by relevance', () => {
      render(<TenderRecommendations {...mockProps} />)
      
      expect(screen.getByText(/3 recommandations antares/i)).toBeInTheDocument()
      
      const recommendationTitles = screen.getAllByTestId('recommendation-title')
      expect(recommendationTitles[0]).toHaveTextContent('Services Infrastructure Cloud - Antares')
      expect(recommendationTitles[1]).toHaveTextContent('Partenariat Stratégique Cloud')
      expect(recommendationTitles[2]).toHaveTextContent('Sous-traitance Audit Sécurité')
    })

    it('should display recommendation types with appropriate badges', () => {
      render(<TenderRecommendations {...mockProps} />)
      
      expect(screen.getByText(/correspondance de service/i)).toBeInTheDocument()
      expect(screen.getByText(/partenariat/i)).toBeInTheDocument()
      expect(screen.getByText(/sous-traitance/i)).toBeInTheDocument()
    })

    it('should display relevance scores with visual indicators', () => {
      render(<TenderRecommendations {...mockProps} />)
      
      expect(screen.getByText(/95%/)).toBeInTheDocument()
      expect(screen.getByText(/82%/)).toBeInTheDocument()
      expect(screen.getByText(/76%/)).toBeInTheDocument()
      
      // High relevance should have green color
      const highRelevance = screen.getByTestId('relevance-rec_1')
      expect(highRelevance).toHaveClass('text-green-600')
      
      // Medium relevance should have orange color
      const mediumRelevance = screen.getByTestId('relevance-rec_2')
      expect(mediumRelevance).toHaveClass('text-orange-600')
    })

    it('should display estimated values formatted correctly', () => {
      render(<TenderRecommendations {...mockProps} />)
      
      expect(screen.getByText(/420.*000.*€/)).toBeInTheDocument()
      expect(screen.getByText(/280.*000.*€/)).toBeInTheDocument()
      expect(screen.getByText(/120.*000.*€/)).toBeInTheDocument()
    })

    it('should display risk levels with appropriate colors', () => {
      render(<TenderRecommendations {...mockProps} />)
      
      const mediumRisk = screen.getByTestId('risk-level-rec_1')
      expect(mediumRisk).toHaveTextContent(/risque moyen/i)
      expect(mediumRisk).toHaveClass('text-orange-600')
      
      const lowRisks = screen.getAllByTestId(/risk-level-rec_[23]/)
      lowRisks.forEach(risk => {
        expect(risk).toHaveTextContent(/risque faible/i)
        expect(risk).toHaveClass('text-green-600')
      })
    })

    it('should display Antares services as tags', () => {
      render(<TenderRecommendations {...mockProps} />)
      
      expect(screen.getByText(/cloud_migration/i)).toBeInTheDocument()
      expect(screen.getByText(/infrastructure_design/i)).toBeInTheDocument()
      expect(screen.getByText(/security_audit/i)).toBeInTheDocument()
      expect(screen.getByText(/cloud_strategy/i)).toBeInTheDocument()
    })
  })

  describe('Interactive Features', () => {
    it('should handle recommendation selection', async () => {
      const user = userEvent.setup()
      render(<TenderRecommendations {...mockProps} />)
      
      const selectButton = screen.getAllByRole('button', { name: /sélectionner/i })[0]
      await user.click(selectButton)
      
      expect(mockProps.onSelectRecommendation).toHaveBeenCalledWith('rec_1')
    })

    it('should handle quote request', async () => {
      const user = userEvent.setup()
      render(<TenderRecommendations {...mockProps} />)
      
      const quoteButton = screen.getAllByRole('button', { name: /demander un devis/i })[0]
      await user.click(quoteButton)
      
      expect(mockProps.onRequestQuote).toHaveBeenCalledWith({
        recommendationId: 'rec_1',
        estimatedValue: 420000,
        services: ['cloud_migration', 'infrastructure_design', 'security_audit']
      })
    })

    it('should handle service details view', async () => {
      const user = userEvent.setup()
      render(<TenderRecommendations {...mockProps} />)
      
      const serviceTag = screen.getByText(/cloud_migration/i)
      await user.click(serviceTag)
      
      expect(mockProps.onViewServiceDetails).toHaveBeenCalledWith('cloud_migration')
    })

    it('should expand/collapse recommendation details', async () => {
      const user = userEvent.setup()
      render(<TenderRecommendations {...mockProps} />)
      
      const expandButton = screen.getAllByRole('button', { name: /voir les détails/i })[0]
      await user.click(expandButton)
      
      expect(screen.getByTestId('recommendation-details-rec_1')).toBeVisible()
      expect(screen.getByText(/justification/i)).toBeInTheDocument()
      
      // Should show collapse button
      const collapseButton = screen.getByRole('button', { name: /masquer les détails/i })
      await user.click(collapseButton)
      
      expect(screen.queryByTestId('recommendation-details-rec_1')).not.toBeVisible()
    })
  })

  describe('Filtering and Sorting', () => {
    it('should filter recommendations by type', async () => {
      const user = userEvent.setup()
      render(<TenderRecommendations {...mockProps} />)
      
      const filterButton = screen.getByRole('button', { name: /filtrer par type/i })
      await user.click(filterButton)
      
      const serviceMatchFilter = screen.getByRole('checkbox', { name: /correspondance de service/i })
      await user.click(serviceMatchFilter)
      
      // Should only show SERVICE_MATCH recommendations
      expect(screen.getByText('Services Infrastructure Cloud - Antares')).toBeInTheDocument()
      expect(screen.queryByText('Partenariat Stratégique Cloud')).not.toBeInTheDocument()
      expect(screen.queryByText('Sous-traitance Audit Sécurité')).not.toBeInTheDocument()
    })

    it('should filter recommendations by risk level', async () => {
      const user = userEvent.setup()
      render(<TenderRecommendations {...mockProps} />)
      
      const riskFilter = screen.getByRole('combobox', { name: /filtrer par risque/i })
      await user.selectOptions(riskFilter, 'LOW')
      
      // Should only show LOW risk recommendations
      expect(screen.getByText('Partenariat Stratégique Cloud')).toBeInTheDocument()
      expect(screen.getByText('Sous-traitance Audit Sécurité')).toBeInTheDocument()
      expect(screen.queryByText('Services Infrastructure Cloud - Antares')).not.toBeInTheDocument()
    })

    it('should sort recommendations by different criteria', async () => {
      const user = userEvent.setup()
      render(<TenderRecommendations {...mockProps} />)
      
      const sortSelect = screen.getByRole('combobox', { name: /trier par/i })
      await user.selectOptions(sortSelect, 'value-desc')
      
      // Should sort by value (highest first)
      const recommendationTitles = screen.getAllByTestId('recommendation-title')
      expect(recommendationTitles[0]).toHaveTextContent('Services Infrastructure Cloud - Antares') // 420k
      expect(recommendationTitles[1]).toHaveTextContent('Partenariat Stratégique Cloud') // 280k
      expect(recommendationTitles[2]).toHaveTextContent('Sous-traitance Audit Sécurité') // 120k
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no recommendations', () => {
      render(<TenderRecommendations {...mockProps} recommendations={[]} />)
      
      expect(screen.getByText(/aucune recommandation disponible/i)).toBeInTheDocument()
      expect(screen.getByText(/l'analyse n'a pas généré de recommandations/i)).toBeInTheDocument()
    })

    it('should display message when all recommendations are filtered out', async () => {
      const user = userEvent.setup()
      render(<TenderRecommendations {...mockProps} />)
      
      const riskFilter = screen.getByRole('combobox', { name: /filtrer par risque/i })
      await user.selectOptions(riskFilter, 'HIGH')
      
      expect(screen.getByText(/aucune recommandation ne correspond aux filtres/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /effacer les filtres/i })).toBeInTheDocument()
    })

    it('should clear filters when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<TenderRecommendations {...mockProps} />)
      
      // Apply filter
      const riskFilter = screen.getByRole('combobox', { name: /filtrer par risque/i })
      await user.selectOptions(riskFilter, 'HIGH')
      
      // Clear filters
      const clearButton = screen.getByRole('button', { name: /effacer les filtres/i })
      await user.click(clearButton)
      
      // All recommendations should be visible again
      expect(screen.getByText('Services Infrastructure Cloud - Antares')).toBeInTheDocument()
      expect(screen.getByText('Partenariat Stratégique Cloud')).toBeInTheDocument()
      expect(screen.getByText('Sous-traitance Audit Sécurité')).toBeInTheDocument()
    })
  })

  describe('Recommendation Cards', () => {
    it('should display actionable status correctly', () => {
      const recommendationsWithActionable = [
        { ...mockRecommendations[0], actionable: true },
        { ...mockRecommendations[1], actionable: false }
      ]
      
      render(<TenderRecommendations {...mockProps} recommendations={recommendationsWithActionable} />)
      
      expect(screen.getByTestId('actionable-rec_1')).toHaveTextContent(/actionnable/i)
      expect(screen.getByTestId('actionable-rec_1')).toHaveClass('text-green-600')
      
      expect(screen.getByTestId('actionable-rec_2')).toHaveTextContent(/non actionnable/i)
      expect(screen.getByTestId('actionable-rec_2')).toHaveClass('text-gray-500')
    })

    it('should display estimated effort when available', () => {
      const recommendationsWithEffort = [
        { ...mockRecommendations[0], estimatedEffort: 180 }
      ]
      
      render(<TenderRecommendations {...mockProps} recommendations={recommendationsWithEffort} />)
      
      expect(screen.getByText(/180 jours-homme/i)).toBeInTheDocument()
    })

    it('should show reasoning when available', async () => {
      const user = userEvent.setup()
      const recommendationsWithReasoning = [
        { 
          ...mockRecommendations[0], 
          reasoning: 'Correspondance parfaite entre les exigences techniques et nos compétences' 
        }
      ]
      
      render(<TenderRecommendations {...mockProps} recommendations={recommendationsWithReasoning} />)
      
      const expandButton = screen.getByRole('button', { name: /voir les détails/i })
      await user.click(expandButton)
      
      expect(screen.getByText(/correspondance parfaite entre les exigences/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(<TenderRecommendations {...mockProps} />)
      
      expect(screen.getByLabelText(/liste des recommandations antares/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/filtres de recommandations/i)).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<TenderRecommendations {...mockProps} />)
      
      // Tab through interactive elements
      await user.tab()
      expect(screen.getByRole('combobox', { name: /filtrer par risque/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('combobox', { name: /trier par/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getAllByRole('button', { name: /voir les détails/i })[0]).toHaveFocus()
    })

    it('should announce recommendation count to screen readers', () => {
      render(<TenderRecommendations {...mockProps} />)
      
      expect(screen.getByRole('status')).toHaveTextContent(/3 recommandations disponibles/i)
    })

    it('should have proper heading hierarchy', () => {
      render(<TenderRecommendations {...mockProps} />)
      
      expect(screen.getByRole('heading', { level: 2, name: /recommandations antares/i })).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3) // One per recommendation
    })
  })

  describe('Performance Considerations', () => {
    it('should handle large number of recommendations efficiently', () => {
      const manyRecommendations = Array.from({ length: 50 }, (_, i) => ({
        ...createMockRecommendation(),
        id: `rec_${i}`,
        title: `Recommendation ${i}`,
        relevanceScore: Math.random()
      }))
      
      const { container } = render(
        <TenderRecommendations {...mockProps} recommendations={manyRecommendations} />
      )
      
      // Should render without performance issues
      expect(container).toBeInTheDocument()
      expect(screen.getByText(/50 recommandations antares/i)).toBeInTheDocument()
    })

    it('should virtualize recommendation list for better performance', () => {
      const manyRecommendations = Array.from({ length: 100 }, (_, i) => ({
        ...createMockRecommendation(),
        id: `rec_${i}`,
        title: `Recommendation ${i}`
      }))
      
      render(<TenderRecommendations {...mockProps} recommendations={manyRecommendations} />)
      
      // Should only render visible recommendations (virtualization)
      const visibleRecommendations = screen.getAllByTestId(/recommendation-card/)
      expect(visibleRecommendations.length).toBeLessThan(100)
      expect(visibleRecommendations.length).toBeGreaterThan(0)
    })
  })
})