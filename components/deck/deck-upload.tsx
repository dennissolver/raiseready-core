'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, Loader2 } from 'lucide-react'

interface DeckUploadProps {
  onUploadComplete: (deckId: string) => void
  founderId: string
}

export function DeckUpload({ onUploadComplete, founderId }: DeckUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile)
        setError('')
        if (!title) setTitle(selectedFile.name.replace('.pdf', ''))
      } else {
        setError('Please upload a PDF file')
      }
    }
  }

  const handleUpload = async () => {
    if (!file || !title) {
      setError('Please provide both file and title')
      return
    }

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title)
      formData.append('founderId', founderId)

      const response = await fetch('/api/deck/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Upload failed')

      onUploadComplete(data.deck.id)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Upload Your Pitch Deck</CardTitle>
        <CardDescription>
          Upload your PDF pitch deck to get AI-powered coaching and feedback
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="title" className="text-sm font-medium">Deck Title</label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Series A Pitch - January 2025"
            disabled={uploading}
          />
        </div>

        <div>
          <label htmlFor="file" className="text-sm font-medium">PDF File</label>
          <div className="mt-2">
            <label htmlFor="file" className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
              {file ? (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-5 h-5" />
                  <span>{file.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                  <Upload className="w-8 h-8" />
                  <span>Click to upload PDF</span>
                </div>
              )}
              <input id="file" type="file" accept=".pdf" className="hidden" onChange={handleFileChange} disabled={uploading} />
            </label>
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">{error}</div>
        )}

        <Button onClick={handleUpload} disabled={!file || !title || uploading} className="w-full">
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload & Analyze
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
