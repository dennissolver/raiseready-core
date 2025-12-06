import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for proxy operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ProxyClient {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  monthly_token_limit: number;
  monthly_cost_limit_usd: number;
}

export interface UsageLog {
  client_id: string;
  endpoint: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  request_metadata?: Record<string, any>;
}

// Token pricing per 1M tokens (as of Dec 2024)
export const PRICING = {
  anthropic: {
    'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'default': { input: 3.00, output: 15.00 },
  },
  openai: {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    'text-embedding-3-small': { input: 0.02, output: 0 },
    'text-embedding-3-large': { input: 0.13, output: 0 },
    'default': { input: 2.50, output: 10.00 },
  },
};

/**
 * Validate client credentials
 */
export async function validateClient(
  clientId: string | null,
  clientSecret: string | null
): Promise<ProxyClient | null> {
  if (!clientId || !clientSecret) {
    console.log('Proxy: Missing client credentials');
    return null;
  }

  const { data, error } = await supabase
    .from('proxy_clients')
    .select('id, name, slug, is_active, monthly_token_limit, monthly_cost_limit_usd')
    .eq('slug', clientId)
    .eq('client_secret', clientSecret)
    .single();

  if (error || !data) {
    console.log(`Proxy: Invalid credentials for client ${clientId}`);
    return null;
  }

  if (!data.is_active) {
    console.log(`Proxy: Client ${clientId} is inactive`);
    return null;
  }

  return data as ProxyClient;
}

/**
 * Check if client is over their usage limit
 */
export async function isOverLimit(clientId: string): Promise<{ over: boolean; reason?: string }> {
  const yearMonth = new Date().toISOString().slice(0, 7); // '2024-12'

  // Get client limits
  const { data: client } = await supabase
    .from('proxy_clients')
    .select('monthly_token_limit, monthly_cost_limit_usd')
    .eq('id', clientId)
    .single();

  if (!client) {
    return { over: true, reason: 'Client not found' };
  }

  // Get current month usage
  const { data: usage } = await supabase
    .from('proxy_usage_monthly')
    .select('total_tokens, total_cost_usd')
    .eq('client_id', clientId)
    .eq('year_month', yearMonth)
    .single();

  if (!usage) {
    // No usage yet this month
    return { over: false };
  }

  if (usage.total_tokens >= client.monthly_token_limit) {
    return { over: true, reason: `Token limit reached: ${usage.total_tokens}/${client.monthly_token_limit}` };
  }

  if (parseFloat(usage.total_cost_usd) >= parseFloat(client.monthly_cost_limit_usd)) {
    return { over: true, reason: `Cost limit reached: $${usage.total_cost_usd}/$${client.monthly_cost_limit_usd}` };
  }

  return { over: false };
}

/**
 * Calculate cost based on tokens and model
 */
export function calculateCost(
  provider: 'anthropic' | 'openai',
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const providerPricing = PRICING[provider] || PRICING.anthropic;
  const modelPricing = providerPricing[model as keyof typeof providerPricing] || providerPricing.default;

  const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

/**
 * Log usage to database
 */
export async function logUsage(log: UsageLog): Promise<void> {
  const { error } = await supabase.from('proxy_usage_logs').insert({
    client_id: log.client_id,
    endpoint: log.endpoint,
    model: log.model,
    provider: log.provider,
    input_tokens: log.input_tokens,
    output_tokens: log.output_tokens,
    total_tokens: log.total_tokens,
    cost_usd: log.cost_usd,
    request_metadata: log.request_metadata || {},
  });

  if (error) {
    console.error('Failed to log usage:', error);
  }
}

/**
 * Generate a secure client secret
 */
export function generateClientSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let secret = 'rr_'; // prefix for RaiseReady
  for (let i = 0; i < 40; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

/**
 * Get client usage summary
 */
export async function getClientUsageSummary(clientId: string) {
  const yearMonth = new Date().toISOString().slice(0, 7);

  const { data } = await supabase
    .from('proxy_usage_monthly')
    .select('*')
    .eq('client_id', clientId)
    .eq('year_month', yearMonth)
    .single();

  return data || {
    total_requests: 0,
    total_tokens: 0,
    total_cost_usd: 0,
  };
}