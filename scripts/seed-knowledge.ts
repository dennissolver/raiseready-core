import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Need admin key for seeding
)

const INITIAL_KNOWLEDGE = [
  {
    title: "What Young VCs Do All Day",
    content: `[Full article text - we'll research and add real content]`,
    summary: "VCs spend 70% of time on deal flow, 20% on portfolio, 10% on internal",
    category: "investor-psychology",
    tags: ["VC", "early-stage", "deal-flow"],
    founder_types: ["all"],
    source_url: "https://...",
    source_type: "article"
  },
  // Add 10-20 more articles here
]

async function seed() {
  for (const article of INITIAL_KNOWLEDGE) {
    await supabase.from('knowledge_base').insert(article)
    console.log(`✓ Added: ${article.title}`)
  }
}

seed()