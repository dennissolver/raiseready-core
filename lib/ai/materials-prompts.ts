import { clientConfig } from '@/config';
// Materials Improvement Mode Prompts
// Specialized coaching for iterative deck refinement

export interface ImprovementContext {
  categoryName: string
  currentScore: number
  targetScore: number
  founderId: string
  founderProfile?: any
  previousAnalysis?: any
  deckContext?: any
}

// Define the priority type for reuse
type PriorityLevel = 'critical' | 'important' | 'nice-to-have'

export const MATERIALS_PROMPTS = {

  // Mode transition prompt - moving from discovery to materials
  TRANSITION_TO_MATERIALS: (discoveryInsights: any, weakestAreas: string[]) => `
I now understand your story and motivation. That personal connection to the problem is powerful - investors will feel that.

Now let's translate that passion into materials that land with investors.

Based on your deck analysis, here are your focus areas:
${weakestAreas.map((area, i) => `${i + 1}. ${area}`).join('\n')}

I'm going to help you strengthen each of these systematically. We'll work through them one at a time, and after each improvement, you can re-upload your deck so we can see your progress.

Ready to start with the biggest opportunity: ${weakestAreas[0]}?
`,

  // Category-specific coaching prompts
  CATEGORY_COACHING: {

    problemClarity: (context: ImprovementContext) => `
Let's strengthen your problem statement. Currently scoring ${context.currentScore}/100.

**What makes a powerful problem slide:**

1. **Specificity over generality**
   ❌ "Healthcare is expensive"
   ✅ "Rural families in Kenya spend 40% of income on basic healthcare, delaying treatment until emergencies"

2. **Human story meets data**
   - Start with a real person/scenario
   - Back it with compelling statistics
   - Show the emotional AND financial cost

3. **Why now?**
   - What's changed that makes this solvable now?
   - Why hasn't this been solved before?

${context.founderProfile?.personal_story ? `\n**Your advantage:** You have a powerful personal story about ${context.founderProfile.personal_story}. Let's use that as your opening.\n` : ''}

**Your specific improvements:**

Looking at your deck, here's what to add/change:

[I'll analyze your specific content and provide targeted suggestions]

What questions do you have about strengthening your problem statement?
`,

    solutionFit: (context: ImprovementContext) => `
Let's make your solution feel inevitable. Currently ${context.currentScore}/100.

**What investors need to believe:**

1. **This solution uniquely solves THIS problem**
   - Not just "a good idea" but "THE answer"
   - Why alternatives won't work
   - What insight do you have that others miss?

2. **Show, don't just tell**
   - Prototype screenshots
   - User testimonials
   - Before/after comparisons

3. **The "aha moment"**
   - Help investors see what you see
   - Make the solution feel obvious in hindsight

${context.founderProfile?.founder_type === 'impact' ? `\n**For impact investors:** Show how your solution creates lasting change, not just temporary relief.\n` : ''}

**Your specific improvements:**

[Analyzing your solution slides now...]

What aspect of your solution do users love most?
`,

    marketOpportunity: (context: ImprovementContext) => `
Let's make your market opportunity irresistible. Currently ${context.currentScore}/100.

**Market slides that win:**

1. **The TAM/SAM/SOM framework**
   - TAM: Total addressable market (big vision)
   - SAM: Serviceable available (realistic reach)
   - SOM: Serviceable obtainable (3-5 year target)

2. **Bottom-up validation**
   - Top-down: "$50B industry"
   - Bottom-up: "10M target customers × $50/year = $500M SAM"
   - Bottom-up is more credible

3. **Growth narrative**
   - Why is this market growing?
   - What trends favor your solution?
   - Who's entering the market now that wasn't before?

4. **Beachhead strategy**
   - Who do you serve FIRST?
   - Why start there?
   - How do you expand from there?

**Your specific improvements:**

Let me see your current market sizing...

Walk me through: Who is your very first customer segment? Why them specifically?
`,

    teamCredibility: (context: ImprovementContext) => `
Let's make investors believe in YOUR team. Currently ${context.currentScore}/100.

**What investors assess:**

1. **Domain expertise**
   - Why are YOU the right person for THIS problem?
   - What unique insights do you have?
   - Relevant experience (doesn't have to be prestigious)

2. **Complementary skills**
   - Technical + Business + Domain
   - What gaps exist and how will you fill them?

3. **Commitment signals**
   - Why won't you give up?
   - Skin in the game
   - Previous pivots/resilience

4. **Advisors/supporters**
   - Who believes in you?
   - Strategic advisors who open doors

${context.founderProfile?.team_background ? `\n**Your team context:** ${JSON.stringify(context.founderProfile.team_background)}\n` : ''}

**Your specific improvements:**

Tell me: What's the story of how your team came together? There's usually gold there.
`,

    impactPotential: (context: ImprovementContext) => `
Let's make your impact measurable and compelling. Currently ${context.currentScore}/100.

**Impact investors need to see:**

1. **Theory of Change**
   - IF we do X
   - THEN Y will happen
   - BECAUSE (mechanism)
   - RESULTING IN Z impact

2. **Measurable outcomes**
   - Not just outputs ("trained 100 people")
   - But outcomes ("increased income by 30%")
   - Tracked over time

3. **SDG alignment**
   - Which UN SDGs do you address?
   - Primary vs secondary impacts
   - Quantified where possible

4. **Scalability**
   - Does impact scale linearly with growth?
   - How do you maintain quality at scale?

5. **Stakeholder benefit**
   - Who benefits directly?
   - Who benefits indirectly?
   - Any negative externalities to address?

**RaiseReady Impact Framework:**

Have you used the SDG Impact Calculator yet? It can help quantify your impact in dollar-equivalent terms that investors understand.

**Your specific improvements:**

What's your primary impact metric? How do you currently measure it?
`,

    financialViability: (context: ImprovementContext) => `
Let's build confidence in your business model. Currently ${context.currentScore}/100.

**Financial slides that work:**

1. **Revenue model clarity**
   - How do you make money? (specific)
   - Unit economics that make sense
   - Path to profitability (even if years away)

2. **Key assumptions**
   - Pricing validated with customers
   - Conversion rates based on something real
   - Cost structure understood

3. **Capital efficiency**
   - How far does this funding take you?
   - What milestones will you hit?
   - When will you raise again?

4. **For impact ventures:**
   - Blended value proposition
   - How does social impact drive revenue?
   - Sustainability model (not grant-dependent)

${context.founderProfile?.funding_motivation ? `\n**Why you're raising now:** ${context.founderProfile.funding_motivation}\n` : ''}

**Your specific improvements:**

Walk me through: If a customer pays you $X, what does it cost you to deliver? How did you validate that pricing?
`,
  },

  // Progress celebration prompts
  SCORE_IMPROVEMENT: (oldScore: number, newScore: number, improvement: number, category: string) => `
🎉 Excellent progress!

**${category}:** ${oldScore} → ${newScore} (+${improvement})

${improvement >= 20 ? "That's a massive jump! Your revisions really landed." :
  improvement >= 10 ? "Strong improvement. This is much more investor-ready now." :
  "Good progress. Let's push this even higher."}

Let me review what you changed...

[Analyzing the improvements in your new version]
`,

  // When a category hits target
  CATEGORY_COMPLETED: (category: string, score: number, remainingAreas: string[]) => `
✅ **${category} is now strong** (${score}/100)

${remainingAreas.length > 0
  ? `Great work! Let's move to the next area: ${remainingAreas[0]}`
  : `Amazing! All your categories are now in good shape. Your overall deck score is investor-ready. Ready to move to verbal pitch practice?`}
`,

  // Transition to verbal practice
  READY_FOR_VERBAL: (finalScore: number, improvements: any) => `
🎉 Your deck is now investor-ready! (${finalScore}/100)

**Your improvement journey:**
${Object.entries(improvements).map(([cat, change]: [string, any]) =>
  `• ${cat}: +${change} points`
).join('\n')}

You've put in the work on your materials. But here's the truth: even the best deck won't land if your verbal delivery doesn't match the quality of your slides.

**Next phase:** Let's practice your PITCH - your delivery, pacing, and how you handle questions.

We can do this in a few ways:
1. **Friendly practice** - I'll listen to your full pitch and give comprehensive feedback
2. **Active coaching** - I'll interrupt with questions like an engaged investor would
3. **Investor simulation** - I'll roleplay as different investor types with realistic tough questions

Which sounds most valuable to you right now?
`,

  // When founder needs encouragement
  ENCOURAGEMENT: (currentScore: number, startScore: number) => `
I know this feels like a lot of work. But you've already improved from ${startScore} to ${currentScore}.

Every founder who's successfully raised has been through this refinement process. The difference is they pushed through.

Your story is compelling. Your solution matters. We just need to make sure your deck does justice to both.

Take a break if you need one. When you're ready, we'll keep going.

What's most frustrating about this process right now?
`,
}

// Helper to generate contextual improvement guidance
export function generateImprovementPrompt(
  category: keyof typeof MATERIALS_PROMPTS.CATEGORY_COACHING,
  context: ImprovementContext
): string {
  const basePrompt = MATERIALS_PROMPTS.CATEGORY_COACHING[category](context)
  return basePrompt
}

// Determine which categories need focus
export function identifyFocusAreas(scores: Record<string, number>, threshold: number = 70): string[] {
  return Object.entries(scores)
    .filter(([_, score]) => score < threshold)
    .sort(([_, a], [__, b]) => a - b) // Sort by lowest score first
    .map(([category, _]) => category)
}

// Calculate improvement suggestions priority
export function prioritizeImprovements(
  scores: Record<string, number>,
  founderProfile?: any
): Array<{category: string, score: number, priority: PriorityLevel}> {
  return Object.entries(scores).map(([category, score]): {
    category: string
    score: number
    priority: PriorityLevel
  } => ({
    category,
    score,
    priority: score < 50 ? 'critical' : score < 70 ? 'important' : 'nice-to-have'
  })).sort((a, b) => {
    // Critical items first
    if (a.priority === 'critical' && b.priority !== 'critical') return -1
    if (b.priority === 'critical' && a.priority !== 'critical') return 1
    // Then by score (lowest first)
    return a.score - b.score
  })
}