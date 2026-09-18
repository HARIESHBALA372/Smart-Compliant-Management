/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useState, useCallback, useRef } from 'react'
import { Upload, X, FileIcon, Image } from 'lucide-react'
import { formatFileSize } from '@/utils'
import { FILE_UPLOAD } from '@/constants'
import { Button } from './Button'

interface FileUploaderProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  maxFiles?: number
}

export function FileUploader({ files, onFilesChange, maxFiles = 5 }: FileUploaderProps) {
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return
      setError(null)
      const validFiles: File[] = []

      for (const file of Array.from(newFiles)) {
        if (file.size > FILE_UPLOAD.MAX_SIZE) {
          setError(`File "${file.name}" exceeds 10MB limit`)
          continue
        }
        if (!FILE_UPLOAD.ALLOWED_TYPES.includes(file.type)) {
          setError(`File type "${file.type}" is not supported`)
          continue
        }
        validFiles.push(file)
      }

      const combined = [...files, ...validFiles].slice(0, maxFiles)
      onFilesChange(combined)
    },
    [files, maxFiles, onFilesChange],
  )

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
      >
        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Drag and drop files here, or <span className="text-blue-600 dark:text-blue-400">browse</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">Max {formatFileSize(FILE_UPLOAD.MAX_SIZE)} per file. Max {maxFiles} files.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        accept={FILE_UPLOAD.ALLOWED_TYPES.join(',')}
      />

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              {file.type.startsWith('image/') ? (
                <Image className="h-5 w-5 text-blue-500" />
              ) : (
                <FileIcon className="h-5 w-5 text-gray-500" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeFile(i)} aria-label={`Remove ${file.name}`}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
