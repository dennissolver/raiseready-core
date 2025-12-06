import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('pitch_decks')
    .select('id, founder_id, title, readiness_score')
    .gte('readiness_score', 60)
    .order('readiness_score', { ascending: false })
  
  console.log('Data:', data)
  console.log('Error:', error)
  
  return Response.json({ decks: data, error })
}

