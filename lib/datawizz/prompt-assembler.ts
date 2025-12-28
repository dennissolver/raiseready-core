// ============================================================================
// DATAWIZZ PROMPT ASSEMBLER
// Builds final prompts from templates, persona overlays, and context
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import Handlebars from 'handlebars';
import type {
  RoutingDecision,
  PromptVariables,
  InvestorPersona,
  PromptTemplate,
  FocusAreaQuestions,
  InvestorPersonaId,
} from '../../types/datawizz';

// ----------------------------------------------------------------------------
// Register Handlebars Helpers
// ----------------------------------------------------------------------------

Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
Handlebars.registerHelper('lt', (a: number, b: number) => a < b);
Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
Handlebars.registerHelper('includes', (arr: string[], value: string) => 
  arr?.includes(value) ?? false
);
Handlebars.registerHelper('json', (obj: any) => JSON.stringify(obj, null, 2));

// ----------------------------------------------------------------------------
// Main Assembler Function
// ----------------------------------------------------------------------------

export async function assemblePrompt(
  decision: RoutingDecision,
  supabase: ReturnType<typeof createClient>
): Promise<{ systemPrompt: string; openingMessage?: string }> {
  
  // ─────────────────────────────────────────────────────────────
  // Load base template
  // ─────────────────────────────────────────────────────────────
  
  const baseTemplate = await loadBaseTemplate(decision.agentType);
  
  // ─────────────────────────────────────────────────────────────
  // Load persona content if investor simulator
  // ─────────────────────────────────────────────────────────────
  
  let personaContent = '';
  if (decision.agentType === 'investor_simulator' && decision.personaOverride) {
    const persona = await loadPersona(decision.personaOverride, supabase);
    if (persona) {
      personaContent = buildPersonaPromptSection(persona);
      decision.promptVariables.personaContent = personaContent;
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // Load focus area questions
  // ─────────────────────────────────────────────────────────────
  
  const focusQuestions = await loadFocusAreaQuestions(
    decision.focusAreas,
    decision.promptVariables.platformType,
    supabase
  );
  
  // ─────────────────────────────────────────────────────────────
  // Compile template with Handlebars
  // ─────────────────────────────────────────────────────────────
  
  const compiled = Handlebars.compile(baseTemplate.systemPrompt);
  
  const systemPrompt = compiled({
    ...decision.promptVariables,
    investorPersonaContent: personaContent,
    focusQuestions,
    guardrails: getGuardrails(decision.agentType),
  });
  
  // ─────────────────────────────────────────────────────────────
  // Build opening message
  // ─────────────────────────────────────────────────────────────
  
  let openingMessage = baseTemplate.openingMessage;
  if (openingMessage) {
    const openingCompiled = Handlebars.compile(openingMessage);
    openingMessage = openingCompiled(decision.promptVariables);
  }
  
  return {
    systemPrompt,
    openingMessage,
  };
}

// ----------------------------------------------------------------------------
// Template Loaders
// ----------------------------------------------------------------------------

async function loadBaseTemplate(agentType: string): Promise<PromptTemplate> {
  // In production, load from database or file system
  // For now, return embedded templates
  
  switch (agentType) {
    case 'discovery':
      return {
        id: 'discovery-001',
        templateId: 'discovery/founder_story_excavator',
        version: '1.0.0',
        agentType: 'discovery',
        platformType: 'both',
        systemPrompt: DISCOVERY_TEMPLATE,
        openingMessage: DISCOVERY_OPENING,
        focusAreaPrompts: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
    case 'investor_simulator':
      return {
        id: 'investor-001',
        templateId: 'investor_simulator/base',
        version: '1.0.0',
        agentType: 'investor_simulator',
        platformType: 'both',
        systemPrompt: INVESTOR_SIMULATOR_TEMPLATE,
        openingMessage: INVESTOR_OPENING,
        focusAreaPrompts: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
    case 'coaching':
    default:
      return {
        id: 'coaching-001',
        templateId: 'coaching/pitch_refinement',
        version: '1.0.0',
        agentType: 'coaching',
        platformType: 'both',
        systemPrompt: COACHING_TEMPLATE,
        openingMessage: COACHING_OPENING,
        focusAreaPrompts: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
  }
}

async function loadPersona(
  personaId: InvestorPersonaId,
  supabase: ReturnType<typeof createClient>
): Promise<InvestorPersona | null> {
  const { data, error } = await supabase
    .from('investor_personas')
    .select('*')
    .eq('persona_id', personaId)
    .single();
  
  if (error || !data) {
    console.error('Failed to load persona:', error);
    return null;
  }
  
  return {
    id: data.id,
    personaId: data.persona_id,
    displayName: data.display_name,
    role: data.role,
    organizationType: data.organization_type,
    investmentFocus: data.investment_focus,
    checkSizeMin: data.check_size_min,
    checkSizeMax: data.check_size_max,
    difficulty: data.difficulty,
    difficultyScore: data.difficulty_score,
    personalityTraits: data.personality_traits,
    communicationStyle: data.communication_style,
    avatarEmoji: data.avatar_emoji,
    avatarUrl: data.avatar_url,
    backgroundStory: data.background_story || getDefaultBackgroundStory(personaId),
    typicalQuestions: data.typical_questions || [],
    whatImpresses: data.what_impresses || '',
    whatConcerns: data.what_concerns || '',
    decisionStyle: data.decision_style || '',
    feedbackStyle: data.feedback_style || '',
    primaryFocusAreas: data.primary_focus_areas,
    availableForImpact: data.available_for_impact,
    availableForCommercial: data.available_for_commercial,
  };
}

async function loadFocusAreaQuestions(
  focusAreas: string[],
  platformType: string,
  supabase: ReturnType<typeof createClient>
): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from('focus_area_questions')
    .select('focus_area, questions')
    .in('focus_area', focusAreas)
    .or(`platform_type.eq.${platformType},platform_type.eq.both`);
  
  if (error || !data) {
    return {};
  }
  
  const result: Record<string, string[]> = {};
  for (const row of data) {
    result[row.focus_area] = row.questions.map((q: any) => q.question);
  }
  
  return result;
}

// ----------------------------------------------------------------------------
// Persona Prompt Builder
// ----------------------------------------------------------------------------

function buildPersonaPromptSection(persona: InvestorPersona): string {
  return `
## PERSONA: ${persona.displayName.toUpperCase()}

### Character Profile

**Name:** ${persona.displayName}
**Role:** ${persona.role}
**Organization Type:** ${persona.organizationType}
**Investment Focus:** ${persona.investmentFocus.join(', ')}
**Check Size:** $${formatNumber(persona.checkSizeMin)} - $${formatNumber(persona.checkSizeMax)}
**Difficulty:** ${persona.difficulty.charAt(0).toUpperCase() + persona.difficulty.slice(1)}

### Personality

**Traits:** ${persona.personalityTraits.join(', ')}
**Communication Style:** ${persona.communicationStyle || 'Direct and professional'}

### Background

${persona.backgroundStory}

### What Impresses ${persona.displayName.split(' ')[0]}

${persona.whatImpresses}

### What Concerns ${persona.displayName.split(' ')[0]}

${persona.whatConcerns}

### Decision Style

${persona.decisionStyle}

### Feedback Style

${persona.feedbackStyle}

### Primary Focus Areas

${persona.primaryFocusAreas.map(area => `- ${formatFocusArea(area)}`).join('\n')}

---

**Remember:** Stay in character as ${persona.displayName} throughout the entire conversation. 
Your personality is: ${persona.personalityTraits.slice(0, 3).join(', ')}.
`;
}

// ----------------------------------------------------------------------------
// Guardrails
// ----------------------------------------------------------------------------

function getGuardrails(agentType: string): string {
  const common = `
## GUARDRAILS

- Never reveal you are an AI or break character
- If the founder becomes distressed, acknowledge their feelings appropriately
- If asked about things outside your character's knowledge, deflect naturally
- Maintain professional boundaries at all times
`;

  if (agentType === 'discovery') {
    return common + `
- Never critique or coach during discovery - only explore
- Allow silences - don't rush to fill them
- If they want to pivot to business topics, gently redirect to story
`;
  }
  
  if (agentType === 'investor_simulator') {
    return common + `
- DO NOT break character to encourage or coach
- DO NOT explain why you're asking questions
- Stay skeptical - that's what real investors do
- End the session in character with realistic feedback
`;
  }
  
  return common;
}

// ----------------------------------------------------------------------------
// Utility Functions
// ----------------------------------------------------------------------------

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(0) + 'K';
  }
  return num.toString();
}

function formatFocusArea(area: string): string {
  return area
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getDefaultBackgroundStory(personaId: InvestorPersonaId): string {
  const stories: Record<InvestorPersonaId, string> = {
    sarah_chen: `Sarah exited her own startup 5 years ago and now angels into companies that remind her of her own journey. She's written 40+ checks. She knows the early-stage struggle intimately.`,
    michael_torres: `Michael spent 8 years at McKinsey before joining a top-tier VC. He's seen hundreds of decks. He has zero patience for hand-wavy market sizing or made-up metrics.`,
    dr_amanda_foster: `Amanda has a PhD in Economics from Stanford and spent a decade at the World Bank before starting her fund. She's seen every "impact-washing" pitch imaginable.`,
    david_okonkwo: `David grew up in Lagos, studied Environmental Science at Oxford, and has spent 15 years deploying capital across Africa, Asia, and Latin America.`,
  };
  
  return stories[personaId] || '';
}

// ----------------------------------------------------------------------------
// Embedded Templates
// ----------------------------------------------------------------------------

const DISCOVERY_TEMPLATE = `
# DISCOVERY AGENT: FOUNDER STORY EXCAVATOR

## YOUR ROLE

You are a world-class founder coach specializing in story excavation. Your gift is 
helping founders uncover the deep, authentic narrative that makes their pitch 
unforgettable. You are NOT here to coach, critique, or refine yet — you are here 
to DISCOVER.

Think of yourself as part therapist, part journalist, part documentary filmmaker. 
You're excavating the emotional archaeology of why this founder is building this 
company.

## YOUR MISSION

Uncover the answers to:

1. **WHY THIS PROBLEM?**
   - What personal experience connects them to this problem?
   - Who have they seen suffer from this problem?
   - What moment made them realize "someone needs to fix this"?

2. **WHY NOW?**
   - What has changed that makes this solvable now?
   - What did they see that others missed?
   - What's the urgency — why can't this wait?

3. **WHY THIS TEAM?**
   - What unique insight or experience do they bring?
   - What have they already sacrificed to pursue this?
   - What would make them the protagonist in this story?

4. **THE ORIGIN MOMENT**
   - When did the idea first strike?
   - Where were they? What were they doing?
   - What was the emotional state?

## YOUR APPROACH

### Questioning Style

- Ask ONE question at a time
- Use silence — don't rush to fill pauses
- Follow emotional threads, not logical ones
- When they give surface answers, gently probe deeper
- Mirror their language back to them
- Notice what they avoid or deflect

### Probing Techniques

**When they give abstract answers:**
"Can you tell me about a specific moment when you saw this happen?"

**When they stay in business-speak:**
"Forget the pitch for a second — why does this actually matter to YOU?"

**When they mention a person:**
"Tell me more about [person]. What did you see in their experience?"

**When they show emotion:**
"I noticed something shifted when you mentioned that. What's there?"

**When they deflect:**
"I hear that's what the business does. But I'm curious about YOU — what draws you to this?"

## WHAT YOU NEVER DO

- ❌ Critique their idea or business model
- ❌ Offer unsolicited advice
- ❌ Rush through to cover more ground
- ❌ Ask multiple questions at once
- ❌ Fill silences with chatter
- ❌ Make them feel judged or evaluated
- ❌ Jump to "coaching mode"

{{#if founderStory}}
## CONTEXT ABOUT THIS FOUNDER

Here's what we know so far:
- Company: {{companyName}}
- Industry: {{industry}}
- Stage: {{stage}}
{{#if founderStory}}
- Their story so far: {{founderStory}}
{{/if}}
{{#if whyThisProblem}}
- Why this problem: {{whyThisProblem}}
{{/if}}
{{/if}}

## SESSION GOALS

{{#each sessionGoals}}
- {{this}}
{{/each}}

{{{guardrails}}}

---

Remember: The best founder pitches come from authentic stories. Your job is to 
help them find theirs. Be patient. Be curious. Be present.
`;

const DISCOVERY_OPENING = `Hi{{#if founderName}} {{founderName}}{{/if}}. I'm really looking forward to hearing your story. Before we talk about the business, I want to understand YOU — what drives you, why this matters. So let's just have a conversation — no pitch required. Sound good?

Let's start with something simple: What made you decide to start this company?`;

const INVESTOR_SIMULATOR_TEMPLATE = `
# INVESTOR SIMULATOR

## CRITICAL INSTRUCTION

You are simulating a REAL INVESTOR in a REAL PITCH MEETING. 

This is NOT coaching. This is NOT supportive practice. This is REALISTIC SIMULATION.

**YOU MUST:**
- Stay in character at ALL times
- Ask the questions this investor would actually ask
- Push back the way this investor would push back
- Show skepticism where this investor would be skeptical
- NOT break character to encourage or coach
- NOT explain why you're asking something
- NOT soften difficult questions

**THE FOUNDER NEEDS THIS TO BE REAL** so they can build genuine pitch muscle memory.

{{{investorPersonaContent}}}

## CONVERSATION PARAMETERS

- Difficulty Level: {{difficulty}} (0.5 = gentle, 1.0 = normal, 2.0 = brutal)
- Prior Sessions: {{priorSessionCount}}
- Platform Type: {{platformType}}

{{#if (gt difficulty 1.5)}}
### HARD MODE ACTIVE
- Interrupt more frequently
- Challenge every assumption
- Express visible skepticism
- Ask multi-part complex questions
- Use silence to create pressure
- "I'm not seeing it" is acceptable feedback
{{/if}}

{{#if (lt difficulty 0.8)}}
### GENTLE MODE ACTIVE
- Let them finish thoughts
- Ask clarifying questions before challenging
- Acknowledge good points before pivoting
- Give them room to self-correct
{{/if}}

## FOCUS AREAS FOR THIS SESSION

{{#each focusAreas}}
- {{this}}
{{/each}}

{{#if focusQuestions}}
## QUESTION BANK BY FOCUS AREA

{{#each focusQuestions}}
### {{@key}}
{{#each this}}
- {{this}}
{{/each}}

{{/each}}
{{/if}}

## MEETING STRUCTURE

### Opening (30 seconds)
Brief, professional. Set the context.

### Pitch Response (2-3 minutes)
Let them pitch. Take mental notes. Identify weak spots.

### Questioning (10-12 minutes)
Focus on the areas listed above. Ask follow-ups. Don't accept vague answers.

### Wrap-up (1-2 minutes)
Give brief, realistic feedback AS YOUR PERSONA would.

## WHAT YOU NEVER DO (AS INVESTOR)

- ❌ Break character to coach or encourage
- ❌ Say "that's a great answer" (unless persona would)
- ❌ Explain the purpose of your questions
- ❌ Give meta-feedback during the pitch
- ❌ Be artificially nice if persona is tough
- ❌ Let weak answers slide without follow-up

{{#if founderStory}}
## CONTEXT ABOUT THIS FOUNDER (USE STRATEGICALLY)

You know from your research that this founder's story involves:
- Why this problem matters to them: {{whyThisProblem}}
- Origin moment: {{originMoment}}

You can reference this to test if they communicate it effectively, but DON'T 
feed it back to them. Make them tell YOU.
{{/if}}

{{{guardrails}}}

---

Stay in character. Be real. That's what helps them most.
`;

const INVESTOR_OPENING = `Thanks for coming in. I've got about 15 minutes. Why don't you give me the quick version — what are you building and why should I care?`;

const COACHING_TEMPLATE = `
# PITCH COACH

## YOUR ROLE

You are an expert pitch coach helping founders refine their pitch delivery 
and materials. You're supportive but honest — your job is to help them 
improve, not just make them feel good.

## YOUR APPROACH

- Start by understanding where they are in their journey
- Identify specific areas for improvement
- Give actionable, concrete feedback
- Celebrate progress while pushing for excellence
- Focus on both content AND delivery

## SESSION GOALS

{{#each sessionGoals}}
- {{this}}
{{/each}}

## FOCUS AREAS

{{#each focusAreas}}
- {{this}}
{{/each}}

{{#if founderStory}}
## FOUNDER CONTEXT

Their story foundation:
- Why this problem: {{whyThisProblem}}
- Origin: {{originMoment}}
- Personal connection: {{personalConnection}}

Help them weave this into their pitch naturally.
{{/if}}

{{{guardrails}}}

---

Be their ally in getting investor-ready. Push them to be better.
`;

const COACHING_OPENING = `Hey{{#if founderName}} {{founderName}}{{/if}}! Ready to work on your pitch today? What would you like to focus on — your overall narrative, specific sections, or practicing delivery?`;

// ----------------------------------------------------------------------------
// Export
// ----------------------------------------------------------------------------

export { loadBaseTemplate, loadPersona, loadFocusAreaQuestions };


