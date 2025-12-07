# Privacy Compliance Configuration

This document details how RaiseReady platforms comply with our stated privacy policies regarding AI service data handling.

## Quick Reference

| Provider | Training Opt-Out | Data Retention | Configuration |
|----------|------------------|----------------|---------------|
| **Anthropic (Claude)** | ✅ Default opt-out | 30 days max | No action needed |
| **OpenAI** | ⚠️ Requires setup | Org setting | Dashboard config |
| **ElevenLabs** | ⚠️ Requires setup | Configurable | API/Dashboard |

## Anthropic (Claude)

### Status: ✅ Compliant by Default

Anthropic's API policy states that **customer data is NOT used for model training** unless you explicitly opt in. No additional configuration is required.

**References:**
- [Anthropic Privacy Policy](https://www.anthropic.com/policies/privacy-policy)
- [Anthropic API Data Policy](https://docs.anthropic.com/en/docs/resources/data-privacy)

### Temperature Settings

For consistent/deterministic outputs, we use `temperature: 0` in:
- `lib/ai/scoring.ts` - Deck analysis and scoring
- `lib/ai/extraction.ts` - Founder insights extraction  
- `lib/ai/investor-extraction.ts` - Investor criteria extraction

For natural conversation variation, we use `temperature: 0.8` in:
- `lib/ai/anthropic.ts` - Coaching conversations

---

## OpenAI (if used)

### Status: ⚠️ Requires Manual Configuration

If your deployment uses OpenAI (e.g., GPT-4o for market analysis), you must configure training opt-out.

### Option 1: Organization-Level Opt-Out (Recommended)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to **Settings → Data Controls**
3. Disable **"Improve our models"**

### Option 2: Per-Request Header

Add this header to all OpenAI API calls:

```typescript
headers: {
  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  'Content-Type': 'application/json',
  'X-Data-Opt-Out': 'true'  // Opt out of training
}
```

---

## ElevenLabs Voice AI

### Status: ⚠️ Requires Configuration

ElevenLabs agents must be configured with privacy settings to match our policy.

### Required Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `data_collection_enabled` | `false` | No PII logging |
| `retention_days` | `0` | Immediate deletion |
| `audio_saving_enabled` | `false` | No audio retention |

### Configuration Methods

#### Method 1: Automated (Recommended)

Run during deployment:

```bash
# Verify current settings
npx ts-node scripts/verify-privacy-compliance.ts

# Fix any issues automatically
npx ts-node scripts/verify-privacy-compliance.ts --fix
```

Or configure directly:

```bash
npx ts-node lib/elevenlabs/agent-config.ts configure
```

#### Method 2: Dashboard

1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Navigate to **Conversational AI → Your Agent → Settings**
3. Go to **Privacy** section
4. Configure:
   - Enable "No PII will be logged"
   - Set retention to **0 days**
   - Disable audio saving

#### Method 3: API

```typescript
import { configureAgentPrivacy, DEFAULT_PRIVACY_CONFIG } from '@/lib/elevenlabs/agent-config'

await configureAgentPrivacy(agentId, DEFAULT_PRIVACY_CONFIG)
```

### Verification

```typescript
import { verifyAgentPrivacy, DEFAULT_PRIVACY_CONFIG } from '@/lib/elevenlabs/agent-config'

const result = await verifyAgentPrivacy(agentId, DEFAULT_PRIVACY_CONFIG)
if (!result.compliant) {
  console.error('Privacy issues:', result.issues)
}
```

---

## Deployment Checklist

### New Deployment

- [ ] Run `npx ts-node scripts/verify-privacy-compliance.ts --fix`
- [ ] Verify OpenAI dashboard settings (if OpenAI is used)
- [ ] Confirm ElevenLabs agent shows "0 days" retention in dashboard

### White-Label Client Deployment

When deploying for a new client:

1. Create ElevenLabs agent for client
2. Configure privacy settings:
   ```bash
   ELEVENLABS_AGENT_ID=<new-agent-id> npx ts-node lib/elevenlabs/agent-config.ts configure
   ```
3. Verify:
   ```bash
   ELEVENLABS_AGENT_ID=<new-agent-id> npx ts-node scripts/verify-privacy-compliance.ts
   ```

### CI/CD Integration

Add to your deployment pipeline:

```yaml
# GitHub Actions example
- name: Verify Privacy Compliance
  run: npx ts-node scripts/verify-privacy-compliance.ts
  env:
    ELEVENLABS_API_KEY: ${{ secrets.ELEVENLABS_API_KEY }}
    ELEVENLABS_AGENT_ID: ${{ secrets.ELEVENLABS_AGENT_ID }}
```

---

## What We Promise Users

From our Privacy Policy FAQ:

> **Q: Does Anthropic Claude train on my pitch deck?**  
> A: No. We have a Data Processing Agreement with Anthropic that explicitly prohibits using your data for model training.

> **Q: How long does Anthropic keep my pitch deck?**  
> A: Maximum 30 days (for troubleshooting), but we can configure zero-day retention for sensitive data.

> **Q: Does ElevenLabs keep my voice recordings?**  
> A: No. We've enabled zero-retention mode for voice coaching sessions.

---

## Enterprise Options

### Zero Retention Mode (ElevenLabs Enterprise)

For enterprise clients requiring additional assurance:
- Contact ElevenLabs for Zero Retention Mode access
- Available for healthcare, banking, and sensitive data use cases
- Provides additional logging restrictions

### Data Residency

For clients requiring data to remain in specific regions:
- Anthropic: US-based processing
- ElevenLabs: EU isolated environments available for enterprise
- Supabase: Already configured for AWS Sydney (Australia)

---

## Audit Trail

### Verification Logs

The compliance script logs verification results. Store these for audit purposes:

```bash
npx ts-node scripts/verify-privacy-compliance.ts > privacy-audit-$(date +%Y%m%d).log
```

### Regular Checks

Schedule weekly verification:

```bash
# cron entry
0 9 * * 1 cd /path/to/app && npx ts-node scripts/verify-privacy-compliance.ts
```

---

## Contact

For privacy compliance questions:
- **Internal:** dennis@corporateaisolutions.com
- **Technical:** Check this document first, then contact dev team

Last updated: 2024