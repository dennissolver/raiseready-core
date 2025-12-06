'use client'

import { useState } from 'react'

export function useDeckUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadDeck = async (
    file: File,
    title: string,
    founderId: string
  ): Promise<string | null> => {
    setUploading(true)
    setError(null)

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

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      return data.deck.id
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setUploading(false)
    }
  }

  return { uploadDeck, uploading, error }
}
