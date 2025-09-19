'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TenderUploadRequestSchema } from '@/lib/validators/dce/tender-upload'

interface FileWithPreview {
  // File properties
  name: string
  size: number
  type: string
  lastModified: number
  
  // Additional properties
  preview?: string
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  classification?: {
    type: string
    confidence: number
    reasoning: string
  }
}

interface TenderUploadProps {
  projectId: string
  onUploadComplete?: (uploadId: string, documents: any[]) => void
  onUploadError?: (error: string) => void
}

export function TenderUpload({ projectId, onUploadComplete, onUploadError }: TenderUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [analysisName, setAnalysisName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFiles = useCallback((filesToValidate: File[]) => {
    const errors: string[] = []
    
    // Check file count
    if (filesToValidate.length > 10) {
      errors.push('Maximum 10 fichiers autorisés')
    }
    
    // Check each file
    filesToValidate.forEach((file, index) => {
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        errors.push(`Fichier ${index + 1}: Type non autorisé (${file.type})`)
      }
      
      // Check file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        errors.push(`Fichier ${index + 1}: Taille maximale 50MB dépassée`)
      }
      
      // Check filename
      if (file.name.length > 255) {
        errors.push(`Fichier ${index + 1}: Nom trop long (max 255 caractères)`)
      }
    })
    
    return errors
  }, [])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const errors = validateFiles(acceptedFiles)
    setValidationErrors(errors)
    
    if (errors.length === 0) {
      const newFiles: FileWithPreview[] = acceptedFiles.map(file => ({
        // File properties
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        
        // Additional properties
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: 'pending' as const,
        progress: 0
      }))
      
      setFiles(prev => [...prev, ...newFiles])
    }
  }, [validateFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 10,
    maxSize: 50 * 1024 * 1024 // 50MB
  })

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  const clearAllFiles = useCallback(() => {
    setFiles([])
    setValidationErrors([])
  }, [])

  const handleUpload = async () => {
    if (files.length === 0) {
      setValidationErrors(['Aucun fichier sélectionné'])
      return
    }

    if (!analysisName.trim()) {
      setValidationErrors(['Nom d\'analyse requis'])
      return
    }

    // Validate request data
    const requestData = {
      files: files.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type
      })),
      projectId,
      analysisName: analysisName.trim()
    }

    const validation = TenderUploadRequestSchema.safeParse(requestData)
    if (!validation.success) {
      setValidationErrors(validation.error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ))
      return
    }

    setIsUploading(true)
    setValidationErrors([])
    
    try {
      // Update file statuses to uploading
      setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })))

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 10
        })
      }, 200)

      const response = await fetch('/api/tenders/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'current-user-id' // TODO: Get from auth context
        },
        body: JSON.stringify(requestData)
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Erreur lors de l\'upload')
      }

      // Update file statuses based on results
      const processedFiles = result.data.documents || []
      setFiles(prev => prev.map(f => {
        const processed = processedFiles.find((pf: any) => pf.fileName === f.name)
        if (processed) {
          return {
            ...f,
            status: 'success' as const,
            progress: 100,
            classification: processed.classification
          }
        }
        return { ...f, status: 'error' as const, error: 'Traitement échoué' }
      }))

      // Call success callback
      onUploadComplete?.(result.data.uploadId, processedFiles)

    } catch (error) {
      console.error('Upload error:', error)
      
      // Update all files to error status
      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      })))

      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'upload'
      setValidationErrors([errorMessage])
      onUploadError?.(errorMessage)

    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const getFileIcon = (file: FileWithPreview) => {
    if (file.status === 'success') return <CheckCircle2 className="h-4 w-4 text-green-500" />
    if (file.status === 'error') return <AlertCircle className="h-4 w-4 text-red-500" />
    return <FileText className="h-4 w-4 text-muted-foreground" />
  }

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'application/pdf': return 'PDF'
      case 'application/msword': return 'DOC'
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return 'DOCX'
      default: return 'Fichier'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Analysis Name Input */}
      <div className="space-y-2">
        <Label htmlFor="analysisName">Nom de l'analyse</Label>
        <Input
          id="analysisName"
          value={analysisName}
          onChange={(e) => setAnalysisName(e.target.value)}
          placeholder="Ex: Analyse DCE Projet Infrastructure 2024"
          className="max-w-md"
          disabled={isUploading}
        />
      </div>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Téléchargement de Documents DCE
          </CardTitle>
          <CardDescription>
            Glissez-déposez vos documents d'appel d'offres ou cliquez pour parcourir.
            Formats acceptés: PDF, DOC, DOCX (max 50MB par fichier, 10 fichiers max)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${isUploading ? 'pointer-events-none opacity-50' : 'hover:border-primary hover:bg-primary/5'}
            `}
          >
            <input {...getInputProps()} ref={fileInputRef} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? 'Déposez les fichiers ici' : 'Glissez vos documents ici'}
              </p>
              <p className="text-sm text-muted-foreground">
                ou <span className="text-primary underline">parcourez vos fichiers</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Fichiers sélectionnés ({files.length})</CardTitle>
              <CardDescription>
                Vérifiez vos documents avant de lancer l'analyse
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFiles}
              disabled={isUploading}
            >
              Tout effacer
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{file.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {getFileTypeLabel(file.type)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        {file.status === 'uploading' && (
                          <div className="flex items-center gap-2">
                            <Progress value={file.progress} className="w-20" />
                            <span>{file.progress}%</span>
                          </div>
                        )}
                        {file.status === 'success' && file.classification && (
                          <Badge variant="outline" className="text-xs">
                            {file.classification.type.toUpperCase()} 
                            ({Math.round(file.classification.confidence * 100)}%)
                          </Badge>
                        )}
                        {file.status === 'error' && file.error && (
                          <span className="text-red-500">{file.error}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isUploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Upload en cours...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || isUploading || !analysisName.trim()}
          className="flex-1 max-w-xs"
        >
          {isUploading ? 'Upload en cours...' : `Analyser ${files.length} document${files.length !== 1 ? 's' : ''}`}
        </Button>
        
        {files.length > 0 && !isUploading && (
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Ajouter des fichiers
          </Button>
        )}
      </div>
    </div>
  )
}