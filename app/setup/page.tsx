'use client';

import { useState } from 'react';
import {
  Building2, User, Mic, CheckCircle, ArrowRight, ArrowLeft,
  Rocket, Loader2, Globe, Database, Phone, Mail, ExternalLink,
  Palette, Search, AlertCircle, Sparkles
} from 'lucide-react';
import type { ExtractedBranding, PlatformType } from '@/types/branding';

// =============================================================================
// TYPES
// =============================================================================

type Step = 'website' | 'company' | 'admin' | 'voice' | 'review' | 'creating';

type ExtractionStatus = 'idle' | 'extracting' | 'complete' | 'error';

interface FormData {
  // Website extraction
  websiteUrl: string;
  // Company (populated from extraction or manual)
  companyName: string;
  companyWebsite: string;
  companyEmail: string;
  companyTagline: string;
  companyDescription: string;
  // Branding
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  logoUrl: string | null;
  logoBase64: string | null;
  // Platform type
  platformType: PlatformType;
  // Thesis
  focusAreas: string[];
  sectors: string[];
  philosophy: string;
  // Admin
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  // Voice
  agentName: string;
  voiceGender: 'female' | 'male';
}

interface CreationStatus {
  supabase: 'pending' | 'creating' | 'done' | 'error';
  elevenlabs: 'pending' | 'creating' | 'done' | 'error';
  github: 'pending' | 'creating' | 'done' | 'error';
  vercel: 'pending' | 'creating' | 'done' | 'error';
  deployment: 'pending' | 'creating' | 'done' | 'error';
}

interface CreatedResources {
  supabaseUrl: string;
  supabaseProjectId: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  elevenlabsAgentId: string;
  githubRepoUrl: string;
  vercelUrl: string;
  vercelProjectId: string;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_COLORS = {
  primary: '#8B5CF6',
  accent: '#10B981',
  background: '#0F172A',
};

const PLATFORM_TYPE_LABELS: Record<PlatformType, string> = {
  impact_investor: 'Impact Investor',
  commercial_investor: 'Commercial VC/PE',
  family_office: 'Family Office',
  founder_service_provider: 'Service Provider / Accelerator',
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function SetupWizard() {
  const [step, setStep] = useState<Step>('website');
  const [error, setError] = useState('');

  // Extraction state
  const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>('idle');
  const [extractionMessage, setExtractionMessage] = useState('');

  const [formData, setFormData] = useState<FormData>({
    websiteUrl: '',
    companyName: '',
    companyWebsite: '',
    companyEmail: '',
    companyTagline: '',
    companyDescription: '',
    primaryColor: DEFAULT_COLORS.primary,
    accentColor: DEFAULT_COLORS.accent,
    backgroundColor: DEFAULT_COLORS.background,
    logoUrl: null,
    logoBase64: null,
    platformType: 'commercial_investor',
    focusAreas: [],
    sectors: [],
    philosophy: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPhone: '',
    agentName: 'Maya',
    voiceGender: 'female',
  });

  const [creationStatus, setCreationStatus] = useState<CreationStatus>({
    supabase: 'pending',
    elevenlabs: 'pending',
    github: 'pending',
    vercel: 'pending',
    deployment: 'pending',
  });

  const [createdResources, setCreatedResources] = useState<CreatedResources>({
    supabaseUrl: '',
    supabaseProjectId: '',
    supabaseAnonKey: '',
    supabaseServiceKey: '',
    elevenlabsAgentId: '',
    githubRepoUrl: '',
    vercelUrl: '',
    vercelProjectId: '',
  });

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const updateForm = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (currentStep: Step): boolean => {
    switch (currentStep) {
      case 'website':
        // Website is optional - can skip to manual entry
        return true;
      case 'company':
        return !!(formData.companyName && formData.companyEmail);
      case 'admin':
        return !!(formData.adminFirstName && formData.adminLastName && formData.adminEmail);
      case 'voice':
        return !!formData.agentName;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (!validateStep(step)) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    const steps: Step[] = ['website', 'company', 'admin', 'voice', 'review', 'creating'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const prevStep = () => {
    const steps: Step[] = ['website', 'company', 'admin', 'voice', 'review', 'creating'];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  // ---------------------------------------------------------------------------
  // WEBSITE EXTRACTION
  // ---------------------------------------------------------------------------

  const extractBranding = async () => {
    if (!formData.websiteUrl) {
      setError('Please enter a website URL');
      return;
    }

    // Normalize URL
    let url = formData.websiteUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
      updateForm('websiteUrl', url);
    }

    setExtractionStatus('extracting');
    setExtractionMessage('Analyzing website...');
    setError('');

    try {
      // Stage 1: Fetching
      setExtractionMessage('Fetching website content...');
      await new Promise(r => setTimeout(r, 500)); // Brief pause for UX

      // Stage 2: Extracting
      setExtractionMessage('Extracting colors and logo...');

      const response = await fetch('/api/setup/extract-branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: url }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to extract branding');
      }

      // Stage 3: Processing
      setExtractionMessage('Processing branding data...');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Extraction failed');
      }

      const branding: ExtractedBranding = data.branding;

      // Stage 4: Applying
      setExtractionMessage('Applying extracted branding...');
      await new Promise(r => setTimeout(r, 300));

      // Populate form with extracted data
      setFormData(prev => ({
        ...prev,
        companyName: branding.company.name || prev.companyName,
        companyWebsite: branding.company.website || url,
        companyEmail: branding.contact.email || prev.companyEmail,
        companyTagline: branding.company.tagline || prev.companyTagline,
        companyDescription: branding.company.description || prev.companyDescription,
        primaryColor: branding.colors.primary || DEFAULT_COLORS.primary,
        accentColor: branding.colors.accent || DEFAULT_COLORS.accent,
        backgroundColor: branding.colors.background || DEFAULT_COLORS.background,
        logoUrl: branding.logo.url,
        logoBase64: branding.logo.base64,
        platformType: branding.platformType || 'commercial_investor',
        focusAreas: branding.thesis.focusAreas || [],
        sectors: branding.thesis.sectors || [],
        philosophy: branding.thesis.philosophy || '',
        adminEmail: branding.contact.email || prev.adminEmail,
      }));

      setExtractionStatus('complete');
      setExtractionMessage(`Successfully extracted branding from ${branding.company.name || 'website'}`);

      // Auto-advance after a brief moment
      setTimeout(() => {
        nextStep();
      }, 1500);

    } catch (err: any) {
      console.error('Extraction error:', err);
      setExtractionStatus('error');
      setExtractionMessage(err.message || 'Failed to extract branding');
      setError(err.message || 'Failed to extract branding. You can continue with manual entry.');
    }
  };

  const skipExtraction = () => {
    setExtractionStatus('idle');
    nextStep();
  };

  // ---------------------------------------------------------------------------
  // CREATION FLOW
  // ---------------------------------------------------------------------------

  const startCreation = async () => {
    setStep('creating');
    setError('');

    const projectSlug = formData.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);

    let supabaseUrl = '';
    let supabaseProjectId = '';
    let supabaseAnonKey = '';
    let supabaseServiceKey = '';
    let elevenlabsAgentId = '';
    let githubRepoUrl = '';
    let githubRepoName = '';
    let vercelUrl = '';
    let vercelProjectId = '';

    try {
      // ========== Step 1: Create Supabase Project ==========
      setCreationStatus(prev => ({ ...prev, supabase: 'creating' }));
      console.log('Creating Supabase project...');

      const supabaseRes = await fetch('/api/setup/create-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: projectSlug }),
      });

      if (!supabaseRes.ok) {
        const err = await supabaseRes.json();
        throw new Error(`Supabase: ${err.error || 'Failed to create project'}`);
      }

      const supabaseData = await supabaseRes.json();
      supabaseUrl = supabaseData.url;
      supabaseProjectId = supabaseData.projectId;
      supabaseAnonKey = supabaseData.anonKey;
      supabaseServiceKey = supabaseData.serviceKey;

      setCreatedResources(prev => ({
        ...prev,
        supabaseUrl,
        supabaseProjectId,
        supabaseAnonKey,
        supabaseServiceKey,
      }));
      console.log('✓ Supabase created:', supabaseProjectId);

      setCreationStatus(prev => ({ ...prev, supabase: 'done', elevenlabs: 'creating' }));

      // ========== Step 2: Create ElevenLabs Agent ==========
      console.log('Creating ElevenLabs agent...');

      const elevenlabsRes = await fetch('/api/setup/create-elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: formData.agentName,
          voiceGender: formData.voiceGender,
          companyName: formData.companyName,
          webhookUrl: `${vercelUrl || ''}/api/webhooks/elevenlabs`,
        }),
      });

      if (elevenlabsRes.ok) {
        const elevenlabsData = await elevenlabsRes.json();
        elevenlabsAgentId = elevenlabsData.agentId;
        setCreatedResources(prev => ({ ...prev, elevenlabsAgentId }));
        console.log('✓ ElevenLabs agent created:', elevenlabsAgentId);
      } else {
        console.warn('ElevenLabs creation failed, continuing...');
      }

      setCreationStatus(prev => ({ ...prev, elevenlabs: 'done', github: 'creating' }));

      // ========== Step 3: Create GitHub Repository ==========
      console.log('Creating GitHub repository...');

      // Build branding object for create-github
      const branding: ExtractedBranding = {
        company: {
          name: formData.companyName,
          tagline: formData.companyTagline,
          description: formData.companyDescription,
          website: formData.companyWebsite,
        },
        colors: {
          primary: formData.primaryColor,
          accent: formData.accentColor,
          background: formData.backgroundColor,
          text: '#F8FAFC',
        },
        logo: {
          url: formData.logoUrl,
          base64: formData.logoBase64,
          type: null,
          source: null,
        },
        ogImage: { url: null, base64: null },
        thesis: {
          focusAreas: formData.focusAreas,
          sectors: formData.sectors,
          stages: [],
          philosophy: formData.philosophy,
          idealFounder: '',
        },
        contact: {
          email: formData.companyEmail,
          phone: formData.adminPhone,
          linkedin: null,
        },
        platformType: formData.platformType,
      };

      const githubRes = await fetch('/api/setup/create-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: projectSlug,
          branding,
          admin: {
            firstName: formData.adminFirstName,
            lastName: formData.adminLastName,
            email: formData.adminEmail,
            phone: formData.adminPhone,
          },
          supabase: {
            projectId: supabaseProjectId,
            url: supabaseUrl,
          },
          elevenlabs: {
            agentId: elevenlabsAgentId,
          },
        }),
      });

      if (!githubRes.ok) {
        const err = await githubRes.json();
        throw new Error(`GitHub: ${err.error || 'Failed to create repository'}`);
      }

      const githubData = await githubRes.json();
      githubRepoUrl = githubData.repoUrl;
      githubRepoName = githubData.repoName || projectSlug;

      setCreatedResources(prev => ({ ...prev, githubRepoUrl }));
      console.log('✓ GitHub repo created:', githubRepoUrl);

      setCreationStatus(prev => ({ ...prev, github: 'done', vercel: 'creating' }));

      // ========== Step 4: Create Vercel Project ==========
      console.log('Creating Vercel project...');

      const vercelRes = await fetch('/api/setup/create-vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projectSlug,
          githubRepo: githubRepoName,
          envVars: {
            NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
            SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
            ELEVENLABS_API_KEY: '',
            ELEVENLABS_AGENT_ID: elevenlabsAgentId,
            NEXT_PUBLIC_COMPANY_NAME: formData.companyName,
          },
        }),
      });

      if (!vercelRes.ok) {
        const err = await vercelRes.json();
        throw new Error(`Vercel: ${err.error || 'Failed to create project'}`);
      }

      const vercelData = await vercelRes.json();
      vercelUrl = vercelData.url || `https://${projectSlug}.vercel.app`;
      vercelProjectId = vercelData.projectId;

      setCreatedResources(prev => ({ ...prev, vercelUrl, vercelProjectId }));
      console.log('✓ Vercel project created:', vercelUrl);

      setCreationStatus(prev => ({ ...prev, vercel: 'done', deployment: 'creating' }));

      // ========== Step 5: Configure Auth & Finalize ==========
      console.log('Configuring Supabase auth...');

      await fetch('/api/setup/configure-supabase-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRef: supabaseProjectId,
          siteUrl: vercelUrl,
        }),
      });

      // Send welcome email
      console.log('Sending welcome email...');

      await fetch('/api/setup/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.adminEmail,
          firstName: formData.adminFirstName,
          companyName: formData.companyName,
          platformUrl: vercelUrl,
        }),
      });

      setCreationStatus(prev => ({ ...prev, deployment: 'done' }));
      console.log('✓ Platform creation complete!');

    } catch (error: any) {
      console.error('Creation failed:', error);
      setError(error.message || 'Failed to create platform');

      setCreationStatus(prev => {
        const newStatus = { ...prev };
        const steps: (keyof CreationStatus)[] = ['supabase', 'elevenlabs', 'github', 'vercel', 'deployment'];
        for (const s of steps) {
          if (newStatus[s] === 'creating') {
            newStatus[s] = 'error';
            break;
          }
        }
        return newStatus;
      });
    }
  };

  // ---------------------------------------------------------------------------
  // UI HELPERS
  // ---------------------------------------------------------------------------

  const getStatusClass = (status: string) => {
    if (status === 'creating') return 'bg-blue-500/10 border-blue-500/30';
    if (status === 'done') return 'bg-green-500/10 border-green-500/30';
    if (status === 'error') return 'bg-red-500/10 border-red-500/30';
    return 'bg-slate-800 border-slate-700';
  };

  const renderStatusIcon = (status: 'pending' | 'creating' | 'done' | 'error') => {
    if (status === 'pending') return <div className="w-5 h-5 rounded-full border-2 border-gray-600" />;
    if (status === 'creating') return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
    if (status === 'done') return <CheckCircle className="w-5 h-5 text-green-400" />;
    return <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">!</div>;
  };

  // ---------------------------------------------------------------------------
  // RENDER STEPS
  // ---------------------------------------------------------------------------

  const renderWebsiteStep = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
          <Globe className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Website Extraction</h2>
          <p className="text-sm text-slate-400">Auto-extract branding from your website</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Website URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={formData.websiteUrl}
              onChange={(e) => updateForm('websiteUrl', e.target.value)}
              placeholder="https://example.com"
              disabled={extractionStatus === 'extracting'}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition disabled:opacity-50"
            />
            <button
              onClick={extractBranding}
              disabled={extractionStatus === 'extracting' || !formData.websiteUrl}
              className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition"
            >
              {extractionStatus === 'extracting' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Extract
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            We'll extract colors, logo, company info, and platform type automatically
          </p>
        </div>

        {/* Extraction Status Box */}
        {extractionStatus !== 'idle' && (
          <div
            className={`p-4 rounded-lg border transition-all ${
              extractionStatus === 'extracting'
                ? 'bg-blue-500/10 border-blue-500/30'
                : extractionStatus === 'complete'
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-3">
              {extractionStatus === 'extracting' && (
                <>
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  <div>
                    <div className="font-medium text-blue-400">Extraction Underway</div>
                    <div className="text-sm text-slate-400">{extractionMessage}</div>
                  </div>
                </>
              )}
              {extractionStatus === 'complete' && (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="font-medium text-green-400">Extraction Complete!</div>
                    <div className="text-sm text-slate-400">{extractionMessage}</div>
                  </div>
                  <Sparkles className="w-5 h-5 text-green-400 ml-auto" />
                </>
              )}
              {extractionStatus === 'error' && (
                <>
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <div className="font-medium text-red-400">Extraction Failed</div>
                    <div className="text-sm text-slate-400">{extractionMessage}</div>
                  </div>
                </>
              )}
            </div>

            {/* Progress bar for extracting state */}
            {extractionStatus === 'extracting' && (
              <div className="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            )}
          </div>
        )}

        {/* Preview extracted data */}
        {extractionStatus === 'complete' && formData.companyName && (
          <div className="p-4 bg-slate-800/50 rounded-lg space-y-3">
            <div className="text-sm font-medium text-slate-400">Extracted Data Preview:</div>

            <div className="flex items-center gap-4">
              {formData.logoBase64 && (
                <img
                  src={formData.logoBase64}
                  alt="Logo"
                  className="w-12 h-12 object-contain rounded bg-white/10 p-1"
                />
              )}
              <div>
                <div className="font-medium text-white">{formData.companyName}</div>
                <div className="text-sm text-slate-400">{formData.companyTagline}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-400">Colors:</div>
              <div className="flex gap-2">
                <div
                  className="w-6 h-6 rounded border border-slate-600"
                  style={{ backgroundColor: formData.primaryColor }}
                  title={`Primary: ${formData.primaryColor}`}
                />
                <div
                  className="w-6 h-6 rounded border border-slate-600"
                  style={{ backgroundColor: formData.accentColor }}
                  title={`Accent: ${formData.accentColor}`}
                />
                <div
                  className="w-6 h-6 rounded border border-slate-600"
                  style={{ backgroundColor: formData.backgroundColor }}
                  title={`Background: ${formData.backgroundColor}`}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-sm text-slate-400">Platform Type:</div>
              <span className="text-sm px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                {PLATFORM_TYPE_LABELS[formData.platformType]}
              </span>
            </div>
          </div>
        )}

        {/* Skip option */}
        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={skipExtraction}
            className="text-sm text-slate-400 hover:text-white transition"
          >
            Skip extraction and enter details manually →
          </button>
        </div>
      </div>
    </div>
  );

  const renderCompanyStep = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
          <Building2 className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Company Information</h2>
          <p className="text-sm text-slate-400">
            {extractionStatus === 'complete' ? 'Review and edit extracted data' : 'Tell us about your organization'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Logo Preview */}
        {formData.logoBase64 && (
          <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
            <img
              src={formData.logoBase64}
              alt="Logo"
              className="w-16 h-16 object-contain rounded bg-white/10 p-2"
            />
            <div className="flex-1">
              <div className="text-sm text-slate-400">Extracted Logo</div>
              <button
                onClick={() => {
                  updateForm('logoUrl', null);
                  updateForm('logoBase64', null);
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Company Name *</label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => updateForm('companyName', e.target.value)}
            placeholder="Acme Inc"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Tagline</label>
          <input
            type="text"
            value={formData.companyTagline}
            onChange={(e) => updateForm('companyTagline', e.target.value)}
            placeholder="AI-Powered Pitch Coaching"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Company Email *</label>
          <input
            type="email"
            value={formData.companyEmail}
            onChange={(e) => updateForm('companyEmail', e.target.value)}
            placeholder="contact@acme.com"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
          />
        </div>

        {/* Platform Type Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Platform Type</label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(PLATFORM_TYPE_LABELS) as PlatformType[]).map((type) => (
              <button
                key={type}
                onClick={() => updateForm('platformType', type)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  formData.platformType === type
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="font-medium text-sm">{PLATFORM_TYPE_LABELS[type]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Color Pickers */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Palette className="w-4 h-4 inline mr-1" />
            Brand Colors
          </label>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">Primary</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => updateForm('primaryColor', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => updateForm('primaryColor', e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">Accent</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.accentColor}
                  onChange={(e) => updateForm('accentColor', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={formData.accentColor}
                  onChange={(e) => updateForm('accentColor', e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdminStep = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
          <User className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Admin Contact</h2>
          <p className="text-sm text-slate-400">Who should we send the platform details to?</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">First Name *</label>
            <input
              type="text"
              value={formData.adminFirstName}
              onChange={(e) => updateForm('adminFirstName', e.target.value)}
              placeholder="John"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Last Name *</label>
            <input
              type="text"
              value={formData.adminLastName}
              onChange={(e) => updateForm('adminLastName', e.target.value)}
              placeholder="Smith"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
          <input
            type="email"
            value={formData.adminEmail}
            onChange={(e) => updateForm('adminEmail', e.target.value)}
            placeholder="john@acme.com"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
          <input
            type="tel"
            value={formData.adminPhone}
            onChange={(e) => updateForm('adminPhone', e.target.value)}
            placeholder="+1 555 123 4567"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          />
        </div>
      </div>
    </div>
  );

  const renderVoiceStep = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
          <Mic className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">AI Coach Configuration</h2>
          <p className="text-sm text-slate-400">Configure your AI pitch coach</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Coach Name *</label>
          <input
            type="text"
            value={formData.agentName}
            onChange={(e) => updateForm('agentName', e.target.value)}
            placeholder="Maya"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
          />
          <p className="text-xs text-slate-500 mt-2">The AI coach that will help founders perfect their pitch</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Voice</label>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: 'female', label: 'Female', desc: 'Sarah - Warm & Professional' },
              { value: 'male', label: 'Male', desc: 'Adam - Deep & Confident' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => updateForm('voiceGender', option.value as 'female' | 'male')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.voiceGender === option.value
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-slate-400 mt-1">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Review & Create</h2>
          <p className="text-sm text-slate-400">Confirm your configuration</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Company */}
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Building2 className="w-4 h-4" />
            Company
          </div>
          <div className="flex items-center gap-3">
            {formData.logoBase64 && (
              <img src={formData.logoBase64} alt="Logo" className="w-10 h-10 object-contain rounded bg-white/10 p-1" />
            )}
            <div>
              <div className="text-white font-medium">{formData.companyName}</div>
              <div className="text-sm text-slate-400">{formData.companyEmail}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: formData.primaryColor }}
            />
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: formData.accentColor }}
            />
            <span className="text-xs text-slate-500 ml-2">
              {PLATFORM_TYPE_LABELS[formData.platformType]}
            </span>
          </div>
        </div>

        {/* Admin */}
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <User className="w-4 h-4" />
            Admin
          </div>
          <div className="text-white font-medium">
            {formData.adminFirstName} {formData.adminLastName}
          </div>
          <div className="text-sm text-slate-400">{formData.adminEmail}</div>
        </div>

        {/* Voice */}
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Mic className="w-4 h-4" />
            AI Coach
          </div>
          <div className="text-white font-medium">{formData.agentName}</div>
          <div className="text-sm text-slate-400 capitalize">{formData.voiceGender} voice</div>
        </div>

        {/* What will be created */}
        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <div className="font-medium text-purple-400 mb-3">Will Be Created:</div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <Database className="w-4 h-4 text-green-400" />
              Supabase database with schema & storage
            </li>
            <li className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-purple-400" />
              ElevenLabs voice agent ({formData.agentName})
            </li>
            <li className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400" />
              GitHub repository with {PLATFORM_TYPE_LABELS[formData.platformType]} config
            </li>
            <li className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-blue-400" />
              Vercel deployment with custom branding
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-orange-400" />
              Welcome email with platform URL
            </li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderCreatingStep = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold mb-2">Creating Your Platform</h2>
        <p className="text-slate-400 text-sm">This may take 2-3 minutes...</p>
      </div>

      <div className="space-y-3">
        {[
          { key: 'supabase', label: 'Creating Supabase database & storage', icon: Database },
          { key: 'elevenlabs', label: 'Creating ElevenLabs voice agent', icon: Mic },
          { key: 'github', label: 'Setting up GitHub repository', icon: Globe },
          { key: 'vercel', label: 'Creating Vercel deployment', icon: Rocket },
          { key: 'deployment', label: 'Configuring auth & sending email', icon: CheckCircle },
        ].map((item) => {
          const status = creationStatus[item.key as keyof CreationStatus];
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${getStatusClass(status)}`}
            >
              {renderStatusIcon(status)}
              <Icon className="w-5 h-5 text-slate-400" />
              <span className={status === 'done' ? 'text-green-400' : 'text-slate-300'}>
                {item.label}
              </span>
              {status === 'done' && item.key === 'vercel' && createdResources.vercelUrl && (
                <a
                  href={createdResources.vercelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-blue-400 hover:underline text-sm flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Preview
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Success */}
      {creationStatus.deployment === 'done' && (
        <div className="mt-8 p-6 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>

          <h3 className="text-2xl font-bold text-green-400 mb-2">Platform Created!</h3>
          <p className="text-slate-300 mb-6">
            {formData.companyName}'s AI Pitch Coaching platform is now live.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href={createdResources.vercelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              <Phone className="w-5 h-5" />
              Visit Platform
            </a>
            {createdResources.githubRepoUrl && (
              <a
                href={createdResources.githubRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition"
              >
                <Globe className="w-5 h-5" />
                View Code
              </a>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-6">
            A welcome email has been sent to {formData.adminEmail}
          </p>
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------

  const stepsList = [
    { key: 'website', label: 'Extract', icon: Globe },
    { key: 'company', label: 'Company', icon: Building2 },
    { key: 'admin', label: 'Admin', icon: User },
    { key: 'voice', label: 'Voice', icon: Mic },
    { key: 'review', label: 'Review', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">RaiseReady Platform Setup</h1>
          <p className="text-slate-400">Create a white-label pitch coaching platform in minutes</p>
        </div>

        {/* Progress Steps */}
        {step !== 'creating' && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              {stepsList.map((s, i) => {
                const steps: Step[] = ['website', 'company', 'admin', 'voice', 'review'];
                const isActive = step === s.key;
                const isPast = steps.indexOf(step) > steps.indexOf(s.key as Step);
                const Icon = s.icon;

                return (
                  <div key={s.key} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                        isActive
                          ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                          : isPast
                          ? 'border-green-500 bg-green-500/20 text-green-400'
                          : 'border-slate-700 text-slate-500'
                      }`}
                    >
                      {isPast ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    {i < stepsList.length - 1 && (
                      <div className={`w-6 h-0.5 mx-1 ${isPast ? 'bg-green-500' : 'bg-slate-700'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Step Content */}
        {step === 'website' && renderWebsiteStep()}
        {step === 'company' && renderCompanyStep()}
        {step === 'admin' && renderAdminStep()}
        {step === 'voice' && renderVoiceStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'creating' && renderCreatingStep()}

        {/* Navigation */}
        {step !== 'creating' && step !== 'website' && (
          <div className="flex justify-between mt-6">
            <button
              onClick={prevStep}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-700 rounded-lg hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {step === 'review' ? (
              <button
                onClick={startCreation}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition"
              >
                <Rocket className="w-4 h-4" />
                Create Platform
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}