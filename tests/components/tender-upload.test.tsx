import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TenderUpload } from '@/app/components/tenders/TenderUpload'

// Mock the API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock file operations
const mockCreateObjectURL = vi.fn()
const mockRevokeObjectURL = vi.fn()
global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

// Mock drag and drop APIs
Object.defineProperty(global, 'DataTransfer', {
  value: class DataTransfer {
    items = {
      add: vi.fn(),
      clear: vi.fn(),
      remove: vi.fn()
    }
    files: File[] = []
    
    constructor() {
      this.files = []
    }
  }
})

describe('TenderUpload Component', () => {
  const mockProps = {
    projectId: 'clproject123456789',
    onUploadComplete: vi.fn(),
    onUploadError: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateObjectURL.mockReturnValue('blob:mock-url')
  })

  describe('Initial Render', () => {
    it('should render upload interface correctly', () => {
      render(<TenderUpload {...mockProps} />)
      
      expect(screen.getByText(/télécharger des documents dce/i)).toBeInTheDocument()
      expect(screen.getByText(/glissez-déposez vos fichiers ici/i)).toBeInTheDocument()
      expect(screen.getByText(/ou cliquez pour sélectionner/i)).toBeInTheDocument()
      expect(screen.getByText(/formats acceptés.*pdf.*doc.*docx/i)).toBeInTheDocument()
      expect(screen.getByText(/taille maximale.*50mb/i)).toBeInTheDocument()
      expect(screen.getByText(/maximum 10 fichiers/i)).toBeInTheDocument()
    })

    it('should show analysis name input field', () => {
      render(<TenderUpload {...mockProps} />)
      
      const analysisNameInput = screen.getByLabelText(/nom de l'analyse/i)
      expect(analysisNameInput).toBeInTheDocument()
      expect(analysisNameInput).toHaveAttribute('placeholder', expect.stringContaining('Analyse DCE'))
    })

    it('should display upload button in disabled state initially', () => {
      render(<TenderUpload {...mockProps} />)
      
      const uploadButton = screen.getByRole('button', { name: /lancer l'analyse/i })
      expect(uploadButton).toBeInTheDocument()
      expect(uploadButton).toBeDisabled()
    })
  })

  describe('File Selection', () => {
    it('should handle file selection via input', async () => {
      const user = userEvent.setup()
      render(<TenderUpload {...mockProps} />)
      
      const fileInput = screen.getByTestId('file-input')
      const testFile = new File(['test content'], 'cctp-test.pdf', { type: 'application/pdf' })
      
      await user.upload(fileInput, testFile)
      
      expect(screen.getByText('cctp-test.pdf')).toBeInTheDocument()
      expect(screen.getByText(/pdf/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /lancer l'analyse/i })).toBeEnabled()
    })

    it('should handle multiple file selection', async () => {
      const user = userEvent.setup()
      render(<TenderUpload {...mockProps} />)
      
      const fileInput = screen.getByTestId('file-input')
      const files = [
        new File(['cctp content'], 'cctp.pdf', { type: 'application/pdf' }),
        new File(['ccp content'], 'ccp.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
        new File(['bpu content'], 'bpu.doc', { type: 'application/msword' })
      ]
      
      await user.upload(fileInput, files)
      
      expect(screen.getByText('cctp.pdf')).toBeInTheDocument()
      expect(screen.getByText('ccp.docx')).toBeInTheDocument()
      expect(screen.getByText('bpu.doc')).toBeInTheDocument()
      expect(screen.getByText(/3 fichiers sélectionnés/i)).toBeInTheDocument()
    })

    it('should display file size correctly', async () => {
      const user = userEvent.setup()
      render(<TenderUpload {...mockProps} />)
      
      const fileInput = screen.getByTestId('file-input')
      const testFile = new File(['x'.repeat(1024 * 1024)], 'large-file.pdf', { type: 'application/pdf' })
      Object.defineProperty(testFile, 'size', { value: 1024 * 1024 }) // 1MB
      
      await user.upload(fileInput, testFile)
      
      expect(screen.getByText(/1\.0 mb/i)).toBeInTheDocument()
    })
  })

  describe('Drag and Drop', () => {
    it('should handle drag enter and show drop zone active state', () => {
      render(<TenderUpload {...mockProps} />)
      
      const dropZone = screen.getByTestId('drop-zone')
      
      fireEvent.dragEnter(dropZone, {
        dataTransfer: {
          types: ['Files']
        }
      })
      
      expect(dropZone).toHaveClass('border-blue-500')
      expect(screen.getByText(/relâchez pour télécharger/i)).toBeInTheDocument()
    })

    it('should handle drag leave and return to normal state', () => {
      render(<TenderUpload {...mockProps} />)
      
      const dropZone = screen.getByTestId('drop-zone')
      
      fireEvent.dragEnter(dropZone, {
        dataTransfer: { types: ['Files'] }
      })
      
      fireEvent.dragLeave(dropZone)
      
      expect(dropZone).not.toHaveClass('border-blue-500')
      expect(screen.getByText(/glissez-déposez vos fichiers ici/i)).toBeInTheDocument()
    })

    it('should handle file drop', () => {
      render(<TenderUpload {...mockProps} />)
      
      const dropZone = screen.getByTestId('drop-zone')
      const testFile = new File(['test content'], 'dropped-file.pdf', { type: 'application/pdf' })
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [testFile]
        }
      })
      
      expect(screen.getByText('dropped-file.pdf')).toBeInTheDocument()
    })

    it('should prevent default drag behaviors', () => {
      render(<TenderUpload {...mockProps} />)
      
      const dropZone = screen.getByTestId('drop-zone')
      
      const dragOverEvent = new Event('dragover', { bubbles: true })
      const preventDefaultSpy = vi.spyOn(dragOverEvent, 'preventDefault')
      
      fireEvent(dropZone, dragOverEvent)
      
      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('File Validation', () => {
    it('should reject unsupported file types', async () => {
      const user = userEvent.setup()
      render(<TenderUpload {...mockProps} />)
      
      const fileInput = screen.getByTestId('file-input')
      const invalidFile = new File(['content'], 'document.txt', { type: 'text/plain' })
      
      await user.upload(fileInput, invalidFile)
      
      expect(screen.getByText(/format de fichier non supporté/i)).toBeInTheDocument()
      expect(screen.getByText(/formats acceptés.*pdf.*doc.*docx/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /lancer l'analyse/i })).toBeDisabled()
    })

    it('should reject files larger than 50MB', async () => {
      const user = userEvent.setup()
      render(<TenderUpload {...mockProps} />)
      
      const fileInput = screen.getByTestId('file-input')
      const largeFile = new File(['content'], 'large-file.pdf', { type: 'application/pdf' })
      Object.defineProperty(largeFile, 'size', { value: 60 * 1024 * 1024 }) // 60MB
      
      await user.upload(fileInput, largeFile)
      
      expect(screen.getByText(/fichier trop volumineux/i)).toBeInTheDocument()
      expect(screen.getByText(/taille maximale.*50mb/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /lancer l'analyse/i })).toBeDisabled()
    })

    it('should reject more than 10 files', async () => {
      const user = userEvent.setup()
      render(<TenderUpload {...mockProps} />)
      
      const fileInput = screen.getByTestId('file-input')
      const files = Array.from({ length: 11 }, (_, i) => 
        new File(['content'], `file-${i}.pdf`, { type: 'application/pdf' })
      )
      
      await user.upload(fileInput, files)
      
      expect(screen.getByText(/trop de fichiers/i)).toBeInTheDocument()
      expect(screen.getByText(/maximum 10 fichiers/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /lancer l'analyse/i })).toBeDisabled()
    })

    it('should reject empty files', async () => {
      const user = userEvent.setup()
      render(<TenderUpload {...mockProps} />)
      
      const fileInput = screen.getByTestId('file-input')
      const emptyFile = new File([''], 'empty.pdf', { type: 'application/pdf' })
      Object.defineProperty(emptyFile, 'size', { value: 0 })
      
      await user.upload(fileInput, emptyFile)
      
      expect(screen.getByText(/fichier vide/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /lancer l'analyse/i })).toBeDisabled()
    })
  })

  describe('File Management', () => {
    it('should allow removing individual files', async () => {
      const user = userEvent.setup()
      render(<TenderUpload {...mockProps} />)
      
      const fileInput = screen.getByTestId('file-input')
      const testFile = new File(['content'], 'test-file.pdf', { type: 'application/pdf' })
      
      await user.upload(fileInput, testFile)
      expect(screen.getByText('test-file.pdf')).toBeInTheDocument()
      
      const removeButton = screen.getByRole('button', { name: /supprimer test-file\.pdf/i })
      await user.click(removeButton)
      
      expect(screen.queryByText('test-file.pdf')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /lancer l'analyse/i })).toBeDisabled()
    })

    it('should allow clearing all files', async () => {
      const user = userEvent.setup()
      render(<TenderUpload {...mockProps} />)
      
      const fileInput = screen.getByTestId('file-input')
      const files = [
        new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'file2.pdf', { type: 'application/pdf' })
      ]
      
      await user.upload(fileInput, files)
      expect(screen.getByText(/2 fichiers sélectionnés/i)).toBeInTheDocument()
      
      const clearButton = screen.getByRole('button', { name: /effacer tout/i })
      await user.click(clearButton)
      
      expect(screen.queryByText('file1.pdf')).not.toBeInTheDocument()
      expect(screen.queryByText('file2.pdf')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /lancer l'analyse/i })).toBeDisabled()
    })
  })

  describe('Upload Process', () => {
    it('should handle successful upload', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            uploadId: 'upload_123',
            documents: [
              {
                id: 'doc_123',
                fileName: 'test.pdf',
                fileSize: 1024,
                fileType: 'PDF',
                status: 'PENDING'
              }
            ]
          }
        })
      })
      
      render(<TenderUpload {...mockProps} />)
      
      const fileInput = screen.getByTestId('file-input')
      const testFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      
      await user.upload(fileInput, testFile)
      
      const analysisNameInput = screen.getByLabelText(/nom de l'analyse/i)
      await user.type(analysisNameInput, 'Test Analysis')
      
      const uploadButton = screen.getByRole('button', { name: /lancer l'analyse/i })
      await user.click(uploadButton)
      
      expect(screen.getByText(/téléchargement en cours/i)).toBeInTheDocument()
      
      await waitFor(() => {
        expect(mockProps.onUploadComplete).toHaveBeenCalledWith({
          uploadId: 'upload_123',
          documents: expect.arrayContaining([
            expect.objectContaining({
              fileName: 'test.pdf',
              status: 'PENDING'
            })
          ])
        })
      })
    })

    it('should handle upload error', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'Le fichier dépasse la taille limite'
          }
        })
      })
      
      render(<TenderUpload {...mockProps} />)
      
      const fileInput = screen.getByTestId('file-input')
      const testFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      
      await user.upload(fileInput, testFile)
      
      const uploadButton = screen.getByRole('button', { name: /lancer l'analyse/i })
      await user.click(uploadButton)
      
      await waitFor(() => {
        expect(screen.getByText(/le fichier dépasse la taille limite/i)).toBeInTheDocument()
        expect(mockProps.onUploadError).toHaveBeenCalledWith({
          code: 'FILE_TOO_LARGE',
          message: 'Le fichier dépasse la taille limite'
        })
      })
    })

    it('should show upload progress', async () => {
      const user = userEvent.setup()
      
      let resolveUpload: (value: any) => void
      const uploadPromise = new Promise(resolve => {
        resolveUpload = resolve
      })
      
      mockFetch.mockReturnValueOnce(uploadPromise)
      
      render(<TenderUpload {...mockProps} />)
      
      const fileInput = screen.getByTestId('file-input')
      const testFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      
      await user.upload(fileInput, testFile)
      
      const uploadButton = screen.getByRole('button', { name: /lancer l'analyse/i })
      await user.click(uploadButton)
      
      expect(screen.getByText(/téléchargement en cours/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(uploadButton).toBeDisabled()
      
      // Resolve the upload
      resolveUpload!({
        ok: true,
        json: async () => ({ success: true, data: { uploadId: 'test' } })
      })
      
      await waitFor(() => {
        expect(screen.queryByText(/téléchargement en cours/i)).not.toBeInTheDocument()
      })
    })

    it('should validate analysis name length', async () => {
      const user = userEvent.setup()
      render(<TenderUpload {...mockProps} />)
      
      const analysisNameInput = screen.getByLabelText(/nom de l'analyse/i)
      const longName = 'A'.repeat(101) // Exceeds 100 character limit
      
      await user.type(analysisNameInput, longName)
      
      expect(screen.getByText(/le nom ne peut pas dépasser 100 caractères/i)).toBeInTheDocument()
      
      const fileInput = screen.getByTestId('file-input')
      const testFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(fileInput, testFile)
      
      const uploadButton = screen.getByRole('button', { name: /lancer l'analyse/i })
      expect(uploadButton).toBeDisabled()
    })

    it('should auto-generate analysis name when empty', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { uploadId: 'test', documents: [] }
        })
      })
      
      render(<TenderUpload {...mockProps} />)
      
      const fileInput = screen.getByTestId('file-input')
      const testFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      
      await user.upload(fileInput, testFile)
      
      const uploadButton = screen.getByRole('button', { name: /lancer l'analyse/i })
      await user.click(uploadButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/tenders/upload',
          expect.objectContaining({
            body: expect.stringContaining('Analyse DCE')
          })
        )
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TenderUpload {...mockProps} />)
      
      expect(screen.getByLabelText(/nom de l'analyse/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/sélectionner des fichiers/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /lancer l'analyse/i })).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<TenderUpload {...mockProps} />)
      
      // Tab through interactive elements
      await user.tab()
      expect(screen.getByLabelText(/nom de l'analyse/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByTestId('file-input')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /lancer l'analyse/i })).toHaveFocus()
    })

    it('should announce upload status to screen readers', async () => {
      const user = userEvent.setup()
      render(<TenderUpload {...mockProps} />)
      
      const fileInput = screen.getByTestId('file-input')
      const testFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      
      await user.upload(fileInput, testFile)
      
      expect(screen.getByRole('status')).toHaveTextContent(/1 fichier sélectionné/i)
    })
  })
})