import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export interface StoredFile {
  id: string
  filePath: string
  originalName: string
  size: number
  mimeType: string
  uploadedAt: Date
}

/**
 * Service for storing and retrieving uploaded files
 * In production, this would use cloud storage (S3, GCS, etc.)
 * For development, we use local filesystem
 */
export class FileStorageService {
  private readonly storageDir: string

  constructor() {
    // Create storage directory in temp folder for development
    this.storageDir = path.join(process.cwd(), 'temp', 'uploads')
    this.ensureStorageDir()
  }

  /**
   * Store a file and return storage metadata
   */
  async storeFile(fileBuffer: Buffer, originalName: string, mimeType: string): Promise<StoredFile> {
    const fileId = uuidv4()
    const extension = path.extname(originalName)
    const fileName = `${fileId}${extension}`
    const filePath = path.join(this.storageDir, fileName)

    try {
      // Write file to storage
      await fs.writeFile(filePath, fileBuffer)

      const storedFile: StoredFile = {
        id: fileId,
        filePath,
        originalName,
        size: fileBuffer.length,
        mimeType,
        uploadedAt: new Date()
      }

      console.log(`File stored successfully: ${originalName} -> ${filePath}`)
      return storedFile

    } catch (error) {
      console.error(`Failed to store file ${originalName}:`, error)
      throw new Error(`Erreur de stockage du fichier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  /**
   * Retrieve a file buffer by file ID
   */
  async getFileBuffer(fileId: string): Promise<Buffer> {
    try {
      // Find file by ID pattern
      const files = await fs.readdir(this.storageDir)
      const targetFile = files.find(file => file.startsWith(fileId))
      
      if (!targetFile) {
        throw new Error(`Fichier non trouvé: ${fileId}`)
      }

      const filePath = path.join(this.storageDir, targetFile)
      const buffer = await fs.readFile(filePath)
      
      console.log(`File retrieved successfully: ${fileId} (${buffer.length} bytes)`)
      return buffer

    } catch (error) {
      console.error(`Failed to retrieve file ${fileId}:`, error)
      throw new Error(`Erreur de récupération du fichier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  /**
   * Get file metadata by ID
   */
  async getFileMetadata(fileId: string): Promise<StoredFile | null> {
    try {
      const files = await fs.readdir(this.storageDir)
      const targetFile = files.find(file => file.startsWith(fileId))
      
      if (!targetFile) {
        return null
      }

      const filePath = path.join(this.storageDir, targetFile)
      const stats = await fs.stat(filePath)
      
      return {
        id: fileId,
        filePath,
        originalName: targetFile, // In real implementation, this would be stored separately
        size: stats.size,
        mimeType: 'application/pdf', // In real implementation, this would be stored
        uploadedAt: stats.birthtime
      }

    } catch (error) {
      console.error(`Failed to get file metadata ${fileId}:`, error)
      return null
    }
  }

  /**
   * Delete a file by ID
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const files = await fs.readdir(this.storageDir)
      const targetFile = files.find(file => file.startsWith(fileId))
      
      if (!targetFile) {
        return false
      }

      const filePath = path.join(this.storageDir, targetFile)
      await fs.unlink(filePath)
      
      console.log(`File deleted successfully: ${fileId}`)
      return true

    } catch (error) {
      console.error(`Failed to delete file ${fileId}:`, error)
      return false
    }
  }

  /**
   * Convert buffer to File object for LlamaCloud
   */
  bufferToFile(buffer: Buffer, filename: string, mimeType: string): File {
    // Create a File-like object that LlamaCloud can handle
    const blob = new Blob([buffer], { type: mimeType })
    return new File([blob], filename, { type: mimeType })
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.access(this.storageDir)
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(this.storageDir, { recursive: true })
      console.log(`Created storage directory: ${this.storageDir}`)
    }
  }

  /**
   * Clean up old files (development utility)
   */
  async cleanupOldFiles(maxAgeHours: number = 24): Promise<number> {
    try {
      const files = await fs.readdir(this.storageDir)
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000)
      let deletedCount = 0

      for (const file of files) {
        const filePath = path.join(this.storageDir, file)
        const stats = await fs.stat(filePath)
        
        if (stats.birthtime.getTime() < cutoffTime) {
          await fs.unlink(filePath)
          deletedCount++
        }
      }

      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old files`)
      }

      return deletedCount

    } catch (error) {
      console.error('Failed to cleanup old files:', error)
      return 0
    }
  }
}