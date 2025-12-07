/**
 * ElevenLabs Agent Configuration
 *
 * This script configures ElevenLabs agents with privacy-compliant settings.
 * Run during deployment or use the functions to verify/update agent settings.
 *
 * PRIVACY SETTINGS:
 * - data_collection.enabled: false (no PII logging)
 * - retention_days: 0 (immediate deletion after call)
 * - audio_saving: false (no audio recording retention)
 *
 * Usage:
 *   npx ts-node scripts/configure-elevenlabs-agent.ts
 *
 * Or import functions:
 *   import { configureAgentPrivacy, verifyAgentPrivacy } from '@/lib/elevenlabs/agent-config'
 */

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'

export interface AgentPrivacyConfig {
  /** Disable data collection/PII logging */
  dataCollectionEnabled: boolean
  /** Number of days to retain conversation data (0 = immediate deletion) */
  retentionDays: number
  /** Whether to save audio recordings */
  audioSavingEnabled: boolean
}

export interface AgentConfig {
  agentId: string
  name?: string
  privacy: AgentPrivacyConfig
}

/**
 * Default privacy configuration for RaiseReady platforms
 * Matches our stated privacy policy
 */
export const DEFAULT_PRIVACY_CONFIG: AgentPrivacyConfig = {
  dataCollectionEnabled: false,  // No PII logged
  retentionDays: 0,              // Immediate deletion
  audioSavingEnabled: false,     // No audio retention
}

/**
 * Get current agent configuration from ElevenLabs
 */
export async function getAgentConfig(agentId: string): Promise<any> {
  const response = await fetch(`${ELEVENLABS_API_URL}/convai/agents/${agentId}`, {
    method: 'GET',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get agent config: ${error}`)
  }

  return response.json()
}

/**
 * Update agent with privacy-compliant settings
 */
export async function configureAgentPrivacy(
  agentId: string,
  config: AgentPrivacyConfig = DEFAULT_PRIVACY_CONFIG
): Promise<void> {
  const updatePayload = {
    platform_settings: {
      privacy: {
        // Disable data collection (PII logging)
        data_collection_enabled: config.dataCollectionEnabled,
        // Set retention period (0 = immediate deletion)
        retention_days: config.retentionDays,
        // Disable audio saving
        audio_saving_enabled: config.audioSavingEnabled,
      },
    },
  }

  const response = await fetch(`${ELEVENLABS_API_URL}/convai/agents/${agentId}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatePayload),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update agent privacy settings: ${error}`)
  }

  console.log(`✅ Agent ${agentId} privacy settings updated:`)
  console.log(`   - Data collection: ${config.dataCollectionEnabled ? 'enabled' : 'disabled'}`)
  console.log(`   - Retention: ${config.retentionDays} days`)
  console.log(`   - Audio saving: ${config.audioSavingEnabled ? 'enabled' : 'disabled'}`)
}

/**
 * Verify agent privacy settings match expected configuration
 */
export async function verifyAgentPrivacy(
  agentId: string,
  expectedConfig: AgentPrivacyConfig = DEFAULT_PRIVACY_CONFIG
): Promise<{ compliant: boolean; issues: string[] }> {
  const issues: string[] = []

  try {
    const agentConfig = await getAgentConfig(agentId)
    const privacy = agentConfig.platform_settings?.privacy || {}

    // Check data collection
    if (privacy.data_collection_enabled !== expectedConfig.dataCollectionEnabled) {
      issues.push(
        `Data collection is ${privacy.data_collection_enabled ? 'enabled' : 'disabled'}, ` +
        `expected ${expectedConfig.dataCollectionEnabled ? 'enabled' : 'disabled'}`
      )
    }

    // Check retention
    const currentRetention = privacy.retention_days ?? -1 // -1 = unlimited
    if (currentRetention !== expectedConfig.retentionDays) {
      issues.push(
        `Retention is ${currentRetention === -1 ? 'unlimited' : `${currentRetention} days`}, ` +
        `expected ${expectedConfig.retentionDays} days`
      )
    }

    // Check audio saving
    if (privacy.audio_saving_enabled !== expectedConfig.audioSavingEnabled) {
      issues.push(
        `Audio saving is ${privacy.audio_saving_enabled ? 'enabled' : 'disabled'}, ` +
        `expected ${expectedConfig.audioSavingEnabled ? 'enabled' : 'disabled'}`
      )
    }

    return {
      compliant: issues.length === 0,
      issues,
    }
  } catch (error) {
    return {
      compliant: false,
      issues: [`Failed to verify: ${error instanceof Error ? error.message : 'Unknown error'}`],
    }
  }
}

/**
 * Configure all agents for a deployment
 */
export async function configureAllAgents(
  agentIds: string[],
  config: AgentPrivacyConfig = DEFAULT_PRIVACY_CONFIG
): Promise<void> {
  console.log(`\n🔒 Configuring privacy settings for ${agentIds.length} agent(s)...\n`)

  for (const agentId of agentIds) {
    try {
      await configureAgentPrivacy(agentId, config)
    } catch (error) {
      console.error(`❌ Failed to configure agent ${agentId}:`, error)
    }
  }

  console.log('\n✅ Agent configuration complete\n')
}

/**
 * Verify all agents for a deployment
 */
export async function verifyAllAgents(
  agentIds: string[],
  expectedConfig: AgentPrivacyConfig = DEFAULT_PRIVACY_CONFIG
): Promise<{ allCompliant: boolean; results: Record<string, { compliant: boolean; issues: string[] }> }> {
  console.log(`\n🔍 Verifying privacy settings for ${agentIds.length} agent(s)...\n`)

  const results: Record<string, { compliant: boolean; issues: string[] }> = {}
  let allCompliant = true

  for (const agentId of agentIds) {
    const result = await verifyAgentPrivacy(agentId, expectedConfig)
    results[agentId] = result

    if (result.compliant) {
      console.log(`✅ Agent ${agentId}: Compliant`)
    } else {
      allCompliant = false
      console.log(`❌ Agent ${agentId}: Non-compliant`)
      result.issues.forEach(issue => console.log(`   - ${issue}`))
    }
  }

  console.log(`\n${allCompliant ? '✅ All agents compliant' : '⚠️ Some agents need attention'}\n`)

  return { allCompliant, results }
}

// ============================================================================
// CLI EXECUTION
// ============================================================================

async function main() {
  const agentId = process.env.ELEVENLABS_AGENT_ID || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID

  if (!agentId) {
    console.error('❌ No agent ID found. Set ELEVENLABS_AGENT_ID or NEXT_PUBLIC_ELEVENLABS_AGENT_ID')
    process.exit(1)
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('❌ No API key found. Set ELEVENLABS_API_KEY')
    process.exit(1)
  }

  const command = process.argv[2] || 'verify'

  switch (command) {
    case 'configure':
      await configureAgentPrivacy(agentId, DEFAULT_PRIVACY_CONFIG)
      break

    case 'verify':
      const result = await verifyAgentPrivacy(agentId, DEFAULT_PRIVACY_CONFIG)
      if (!result.compliant) {
        console.log('\n⚠️ Agent is not compliant with privacy policy!')
        console.log('Run: npx ts-node scripts/configure-elevenlabs-agent.ts configure')
        process.exit(1)
      }
      break

    case 'show':
      const config = await getAgentConfig(agentId)
      console.log(JSON.stringify(config.platform_settings, null, 2))
      break

    default:
      console.log('Usage: npx ts-node scripts/configure-elevenlabs-agent.ts [configure|verify|show]')
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}