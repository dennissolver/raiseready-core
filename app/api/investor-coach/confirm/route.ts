import { clientConfig } from '@/config';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, criteria } = await request.json()
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Save criteria to " + clientConfig.company.name + " profile
    await supabase
      .from('founders')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    // Mark discovery session as confirmed
    await supabase
      .from('investor_discovery_sessions')
      .update({
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    // Trigger initial matching (fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/match-founders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        investorId: user.id,
        criteria 
      })
    }).catch(err => console.error('Initial matching failed:', err))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Confirmation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to confirm' },
      { status: 500 }
    )
  }
}

