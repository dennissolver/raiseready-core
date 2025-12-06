-- =============================================================================
-- RAISEREADY ADMIN PLATFORM SCHEMA
-- =============================================================================
-- Database: raiseready-admin
-- Purpose: Tracks all client platforms created via the setup wizard
-- Run: Manually in Supabase SQL Editor after creating project
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CLIENTS TABLE (tracks all client platforms)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Company info (from setup wizard Step 1)
  company_name TEXT NOT NULL,
  company_website TEXT,
  company_phone TEXT,
  company_email TEXT,
  
  -- Admin user info (from setup wizard Step 2)
  admin_first_name TEXT NOT NULL,
  admin_last_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  admin_phone TEXT,
  
  -- Voice agent config (from setup wizard Step 3)
  voice_config JSONB DEFAULT '{}'::jsonb,
  -- Structure: { "agentName": "Sarah", "gender": "female", "language": "english", "type": "professional" }
  
  -- Theme/branding (extracted from website)
  theme_config JSONB DEFAULT '{}'::jsonb,
  -- Structure: { "primary": "#3B82F6", "accent": "#10B981", "background": "#0F172A" }
  
  -- Thesis (extracted from website)
  thesis_config JSONB DEFAULT '{}'::jsonb,
  -- Structure: { "philosophy": "...", "sectors": [...], "stages": [...] }
  
  -- LLM preference (from setup wizard Step 4)
  llm_provider TEXT DEFAULT 'claude' CHECK (llm_provider IN ('claude', 'chatgpt', 'gemini', 'grok')),
  
  -- -----------------------------------------------------------------------------
  -- CREATED RESOURCES (populated during creation process)
  -- -----------------------------------------------------------------------------
  
  -- Supabase
  supabase_project_id TEXT,
  supabase_project_ref TEXT,
  supabase_url TEXT,
  supabase_anon_key TEXT,
  supabase_db_password TEXT, -- Encrypted or stored securely
  
  -- GitHub
  github_repo_url TEXT,
  github_repo_name TEXT,
  github_repo_full_name TEXT, -- owner/repo
  
  -- Vercel
  vercel_project_id TEXT,
  vercel_project_name TEXT,
  vercel_url TEXT,
  vercel_deployment_id TEXT,
  
  -- ElevenLabs
  elevenlabs_agent_id TEXT,
  elevenlabs_agent_name TEXT,
  
  -- -----------------------------------------------------------------------------
  -- STATUS TRACKING
  -- -----------------------------------------------------------------------------
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Wizard submitted, not started
    'creating',     -- Currently being created
    'active',       -- Successfully created and running
    'suspended',    -- Temporarily disabled
    'failed'        -- Creation failed
  )),
  
  creation_step TEXT CHECK (creation_step IN (
    'supabase',
    'extraction',
    'elevenlabs', 
    'github',
    'vercel',
    'completed'
  )),
  
  creation_started_at TIMESTAMPTZ,
  creation_completed_at TIMESTAMPTZ,
  creation_error TEXT,
  
  -- -----------------------------------------------------------------------------
  -- METADATA
  -- -----------------------------------------------------------------------------
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- -----------------------------------------------------------------------------
  -- FUTURE: BILLING (Phase 2+)
  -- -----------------------------------------------------------------------------
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  billing_email TEXT,
  trial_ends_at TIMESTAMPTZ,
  
  -- -----------------------------------------------------------------------------
  -- CONSTRAINTS
  -- -----------------------------------------------------------------------------
  UNIQUE(company_name),
  UNIQUE(github_repo_name),
  UNIQUE(supabase_project_ref)
);

-- -----------------------------------------------------------------------------
-- ADMIN USERS TABLE (who can access /setup)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin', 'viewer')),
  
  -- Permissions
  can_create_clients BOOLEAN DEFAULT true,
  can_delete_clients BOOLEAN DEFAULT false,
  can_manage_admins BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- CREATION LOGS TABLE (audit trail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS creation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  step TEXT NOT NULL CHECK (step IN (
    'supabase_create',
    'supabase_schema',
    'extraction_fetch',
    'extraction_analyze',
    'elevenlabs_create',
    'github_create',
    'github_config',
    'github_push',
    'vercel_create',
    'vercel_env',
    'vercel_deploy'
  )),
  
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
  
  -- Details for debugging
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  error_stack TEXT,
  duration_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- API KEYS TABLE (optional: if clients provide their own keys)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  key_type TEXT NOT NULL CHECK (key_type IN ('anthropic', 'openai', 'elevenlabs')),
  encrypted_key TEXT NOT NULL, -- Encrypt before storing!
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(client_id, key_type)
);

-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_admin_email ON clients(admin_email);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);

CREATE INDEX IF NOT EXISTS idx_creation_logs_client_id ON creation_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_creation_logs_created_at ON creation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creation_logs_status ON creation_logs(status);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- -----------------------------------------------------------------------------
-- UPDATED_AT TRIGGER FUNCTION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE creation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_api_keys ENABLE ROW LEVEL SECURITY;

-- Admin users policies
CREATE POLICY "Admin users can view all clients"
  ON clients FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin users can create clients"
  ON clients FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND can_create_clients = true));

CREATE POLICY "Admin users can update clients"
  ON clients FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Superadmins can delete clients"
  ON clients FOR DELETE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND can_delete_clients = true));

CREATE POLICY "Admin users can view logs"
  ON creation_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin users can create logs"
  ON creation_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin users can view admin_users"
  ON admin_users FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Superadmins can manage admin_users"
  ON admin_users FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND can_manage_admins = true));

CREATE POLICY "Admin users can view client_api_keys"
  ON client_api_keys FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin users can manage client_api_keys"
  ON client_api_keys FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Service role bypass (for API routes using service_role key)
CREATE POLICY "Service role full access clients" ON clients FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access creation_logs" ON creation_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access admin_users" ON admin_users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access client_api_keys" ON client_api_keys FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Get client creation progress
CREATE OR REPLACE FUNCTION get_client_creation_progress(p_client_id UUID)
RETURNS TABLE (
  step TEXT,
  status TEXT,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.step,
    cl.status,
    cl.duration_ms,
    cl.error_message,
    cl.created_at
  FROM creation_logs cl
  WHERE cl.client_id = p_client_id
  ORDER BY cl.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_clients BIGINT,
  active_clients BIGINT,
  creating_clients BIGINT,
  failed_clients BIGINT,
  clients_this_month BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_clients,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT as active_clients,
    COUNT(*) FILTER (WHERE status = 'creating')::BIGINT as creating_clients,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_clients,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::BIGINT as clients_this_month
  FROM clients;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SEED DATA (Run after signing up)
-- =============================================================================
-- 
-- Step 1: Sign up via the app or add user in Authentication → Users
-- Step 2: Run this with YOUR email:
--
-- INSERT INTO admin_users (id, email, full_name, role, can_create_clients, can_delete_clients, can_manage_admins)
-- SELECT 
--   id, 
--   email, 
--   COALESCE(raw_user_meta_data->>'full_name', 'Admin'),
--   'superadmin',
--   true,
--   true,
--   true
-- FROM auth.users
-- WHERE email = 'your-email@example.com';
--
-- =============================================================================
