import { clientConfig } from '@/config';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { investorId, criteria } = await request.json()
    console.log('Starting matching for investor:', investorId)

    const supabase = await createClient()
    const { data: decks, error: queryError } = await supabase
      .from('pitch_decks')
      .select('id, founder_id, title, readiness_score')
      .gte('readiness_score', criteria.min_readiness_score || 60)
      .order('readiness_score', { ascending: false })

    if (queryError) {
      console.error('Query error:', queryError)
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    if (!decks || decks.length === 0) {
      console.log('No decks found')
      return NextResponse.json({ success: true, matches: 0 })
    }

    console.log('Found', decks.length, 'decks')

    const matches = []
    const weights = criteria.evaluation_weights || { team: 0.4, traction: 0.3, timing: 0.2, deck_quality: 0.1 }

    for (const deck of decks) {
      if (!deck.founder_id) continue

      const { data: founder } = await supabase
        .from('founders')
        .select('*')
        .eq('id', deck.founder_id)
        .single()

      if (!founder) continue

      console.log('Evaluating:', founder.email, founder.founder_type, deck.readiness_score || 0)

      if (criteria.required_sectors?.length > 0 && !criteria.required_sectors.includes(founder.founder_type)) {
        console.log('  Skip - wrong sector')
        continue
      }

      if (criteria.preferred_stages?.length > 0 && !criteria.preferred_stages.includes(founder.funding_stage)) {
        console.log('  Skip - wrong stage')
        continue
      }

      const teamScore = 0.8
      const tractionScore = founder.has_customers ? 0.7 : 0.3
      let totalScore = teamScore * weights.team * 100 + tractionScore * weights.traction * 100 + (deck.readiness_score || 0) * weights.deck_quality

      console.log('  Score:', Math.round(totalScore))

      if (totalScore >= 60) {
        const matchData = {
          founder_id: founder.id,
          investor_id: investorId,
          deck_id: deck.id,
          match_score: Math.round(totalScore),
          match_reasons: [founder.founder_type, 'Score: ' + (deck.readiness_score || 0) + '/100', founder.funding_stage],
          status: 'suggested'
        }

        const { error: insertError } = await supabase.from('founder_investor_matches').insert(matchData)

        if (insertError) {
          console.error('  Insert failed:', insertError)
        } else {
          console.log('  Match created!')
          matches.push(matchData)
        }
      }
    }

    console.log('Created', matches.length, 'matches')
    return NextResponse.json({ success: true, matches: matches.length })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
