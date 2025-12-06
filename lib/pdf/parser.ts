import pdf from 'pdf-parse'

export interface ParsedDeck {
  text: string
  pages: string[]
  numPages: number
  metadata: {
    title?: string
    author?: string
    creator?: string
  }
}

export async function parsePDF(buffer: Buffer): Promise<ParsedDeck> {
  try {
    const data = await pdf(buffer)

    // Split text by page (approximate - pdf-parse doesn't give exact page breaks)
    const estimatedPageLength = Math.ceil(data.text.length / data.numpages)
    const pages: string[] = []

    for (let i = 0; i < data.numpages; i++) {
      const start = i * estimatedPageLength
      const end = start + estimatedPageLength
      pages.push(data.text.substring(start, end))
    }

    return {
      text: data.text,
      pages,
      numPages: data.numpages,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        creator: data.info?.Creator,
      },
    }
  } catch (error) {
    console.error('PDF parsing error:', error)
    throw new Error('Failed to parse PDF')
  }
}

export function extractSlideText(pages: string[]): Array<{ slideNumber: number; text: string }> {
  return pages.map((text, index) => ({
    slideNumber: index + 1,
    text: text.trim(),
  }))
}
