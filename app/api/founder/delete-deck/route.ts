// app/api/founder/delete-deck/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const deckId = searchParams.get('deckId')

    if (!deckId) {
      return NextResponse.json(
        { error: 'Deck ID is required' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get deck and verify ownership
    // Assuming founders.id = auth.users.id
    const { data: deck } = await supabase
      .from('pitch_decks')
      .select('file_url, founder_id')
      .eq('id', deckId)
      .single()

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      )
    }

    // Verify user owns this deck (founders.id should match auth.uid())
    if (deck.founder_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own decks' },
        { status: 403 }
      )
    }

    // Delete deck from database (RLS policy will enforce ownership)
    const { error: deleteError } = await supabase
      .from('pitch_decks')
      .delete()
      .eq('id', deckId)
      .eq('founder_id', user.id) // Extra safety check

    if (deleteError) {
      console.error('Error deleting deck:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete deck', details: deleteError.message },
        { status: 500 }
      )
    }

    // Delete from storage
    if (deck.file_url) {
      try {
        const url = new URL(deck.file_url)
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)

        if (pathMatch) {
          const filePath = pathMatch[2]
          const { error: storageError } = await supabase.storage
            .from('pitch-decks')
            .remove([filePath])

          if (storageError) {
            console.error('Error deleting storage file:', storageError)
            // Don't fail the request if storage cleanup fails
          }
        }
      } catch (urlError) {
        console.error('Error parsing file URL:', urlError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Your deck has been deleted successfully'
    })

  } catch (error) {
    console.error('Error in founder delete deck route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
