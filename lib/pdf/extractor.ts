import pdf from 'pdf-parse'

/**
 * Extract text content from a PDF buffer
 * Used by the deck upload route for initial text extraction
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer)
    return data.text
  } catch (error) {
    console.error('PDF text extraction error:', error)
    throw new Error('Failed to extract text from PDF')
  }
}

/**
 * Extract text with basic metadata
 */
export async function extractPDFData(buffer: Buffer): Promise<{
  text: string
  numPages: number
  metadata: {
    title?: string
    author?: string
    creator?: string
  }
}> {
  try {
    const data = await pdf(buffer)

    return {
      text: data.text,
      numPages: data.numpages,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        creator: data.info?.Creator,
      },
    }
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error('Failed to extract PDF data')
  }
}