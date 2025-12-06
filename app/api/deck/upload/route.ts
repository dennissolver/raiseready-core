import { clientConfig } from '@/config';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractTextFromPDF } from '@/lib/pdf/extractor'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string

    if (!file || !title) {
      return NextResponse.json(
        { error: 'Missing file or title' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (fileExt !== 'pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      )
    }

    // Upload file to storage
    const fileName = `${user.id}/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pitch-decks')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('pitch-decks')
      .getPublicUrl(uploadData.path)

    // ✅ CHECK FOR EXISTING DECK WITH SAME TITLE
    const { data: existingDeck } = await supabase
      .from('pitch_decks')
      .select('id, version')
      .eq('founder_id', user.id)
      .eq('title', title)
      .eq('is_latest', true)
      .single()

    let versionNumber = 1
    let parentDeckId = null

    if (existingDeck) {
      // ✅ INCREMENT VERSION
      versionNumber = (existingDeck.version || 1) + 1
      parentDeckId = existingDeck.id

      // ✅ MARK OLD VERSION AS NOT LATEST
      await supabase
        .from('pitch_decks')
        .update({ is_latest: false })
        .eq('id', existingDeck.id)
    }

    // ✅ INSERT WITH PROPER VERSIONING
    const { data: deck, error: dbError } = await supabase
      .from('pitch_decks')
      .insert({
        founder_id: user.id,
        title,
        file_url: publicUrl,
        file_type: fileExt,
        status: 'analyzing',
        version: versionNumber,
        parent_deck_id: parentDeckId,
        is_latest: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save deck', details: dbError.message },
        { status: 500 }
      )
    }

    // Extract PDF text for later analysis
    const arrayBuffer = await file.arrayBuffer()
    const deckText = await extractTextFromPDF(Buffer.from(arrayBuffer))

    // Store extracted text
    await supabase
      .from('pitch_decks')
      .update({
        extracted_text: deckText,
        status: 'pending_analysis',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deck.id)

    // Note: The /api/deck/analyze endpoint will handle AI analysis
    // This is triggered from the upload page after redirect

    // Trigger investor matching in background (non-blocking)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (appUrl) {
      fetch(`${appUrl}/api/match-investors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: deck.id,
          founderId: user.id,
        }),
      }).catch(err => console.error('Investor matching failed:', err))
    }

    return NextResponse.json({
      success: true,
      deck: {
        ...deck,
        version: versionNumber,
        parent_deck_id: parentDeckId,
      },
      isNewVersion: versionNumber > 1,
      message: versionNumber > 1
        ? `Updated to version ${versionNumber}`
        : 'Deck uploaded successfully',
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
