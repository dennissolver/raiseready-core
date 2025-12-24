'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Circle, Loader2, XCircle, ExternalLink, RotateCcw, Sparkles, Globe, Trash2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type PlatformType = 'impact_investor' | 'commercial_investor' | 'family_office' | 'founder_service_provider';

type StepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

interface Step {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
  error?: string;
  duration?: number;
  isCleanup?: boolean;
}

interface ExtractedBranding {
  company: { name: string; tagline: string; description: string; website: string };
  colors: { primary: string; accent: string; background: string; text: string };
  logo: { url: string | null; base64: string | null };
  thesis: { focusAreas: string[]; sectors: string[]; philosophy: string };
  contact: { email: string | null; phone: string | null; linkedin: string | null };
  platformType: PlatformType;
}

interface FormData {
  companyName: string;
  companyWebsite: string;
  companyEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  agentName: string;
  voiceGender: 'female' | 'male';
  platformType: PlatformType;
  branding: ExtractedBranding | null;
}

interface OrchestrationResult {
  success: boolean;
  platformUrl: string | null;
  steps: Array<{ step: string; status: string; error?: string; duration?: number; data?: any }>;
  resources: {
    supabase: { projectId: string; url: string } | null;
    github: { repoUrl: string; repoName: string } | null;
    vercel: { projectId: string; url: string } | null;
    elevenlabs: { agentId: string } | null;
  };
  rollback?: { performed: boolean; results?: any };
  error?: string;
  duration?: number;
}

// ============================================================================
// STEP DEFINITIONS - All steps including cleanup
// ============================================================================

const INITIAL_STEPS: Step[] = [
  // Pre-cleanup steps
  { id: 'cleanup-supabase', label: 'Checking existing Supabase', description: 'Looking for existing project to clean up', status: 'pending', isCleanup: true },
  { id: 'cleanup-vercel', label: 'Checking existing Vercel', description: 'Looking for existing deployment to clean up', status: 'pending', isCleanup: true },
  { id: 'cleanup-github', label: 'Checking existing GitHub', description: 'Looking for existing repository to clean up', status: 'pending', isCleanup: true },

  // Creation steps
  { id: 'create-supabase', label: 'Creating Supabase project', description: 'Setting up database and authentication', status: 'pending' },
  { id: 'wait-supabase', label: 'Waiting for Supabase', description: 'Project initializing...', status: 'pending' },
  { id: 'run-migrations', label: 'Applying database schema', description: 'Creating tables, policies, and storage', status: 'pending' },
  { id: 'create-elevenlabs', label: 'Creating voice agent', description: 'Setting up AI voice coaching', status: 'pending' },
  { id: 'create-github', label: 'Setting up repository', description: 'Creating codebase from template', status: 'pending' },
  { id: 'create-vercel', label: 'Creating deployment', description: 'Configuring hosting and environment', status: 'pending' },
  { id: 'configure-auth', label: 'Configuring authentication', description: 'Setting up login redirects', status: 'pending' },
  { id: 'trigger-deployment', label: 'Deploying platform', description: 'Building and launching your site', status: 'pending' },
  { id: 'send-welcome-email', label: 'Sending welcome email', description: 'Notifying administrator', status: 'pending' },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function StepIcon({ status, isCleanup }: { status: StepStatus; isCleanup?: boolean }) {
  if (isCleanup) {
    switch (status) {
      case 'success': return <Trash2 className="w-5 h-5 text-orange-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running': return <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />;
      case 'skipped': return <Circle className="w-5 h-5 text-gray-500" />;
      default: return <Circle className="w-5 h-5 text-gray-600" />;
    }
  }

  switch (status) {
    case 'success': return <CheckCircle className="w-6 h-6 text-green-500" />;
    case 'error': return <XCircle className="w-6 h-6 text-red-500" />;
    case 'running': return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
    case 'skipped': return <Circle className="w-6 h-6 text-gray-400" />;
    default: return <Circle className="w-6 h-6 text-gray-600" />;
  }
}

function StepItem({ step, isLast }: { step: Step; isLast: boolean }) {
  const isCleanup = step.isCleanup;

  return (
    <div className={`flex gap-3 ${isCleanup ? 'opacity-80' : ''}`}>
      <div className="flex flex-col items-center">
        <StepIcon status={step.status} isCleanup={isCleanup} />
        {!isLast && (
          <div className={`w-0.5 h-full min-h-[32px] mt-1 ${
            step.status === 'success' ? (isCleanup ? 'bg-orange-500/50' : 'bg-green-500') : 
            step.status === 'error' ? 'bg-red-500' : 'bg-gray-700'
          }`} />
        )}
      </div>
      <div className={`flex-1 ${isCleanup ? 'pb-4' : 'pb-6'}`}>
        <div className="flex items-center gap-2">
          <h3 className={`${isCleanup ? 'text-sm' : 'font-medium'} ${
            step.status === 'running' ? (isCleanup ? 'text-orange-400' : 'text-blue-400') :
            step.status === 'success' ? (isCleanup ? 'text-orange-400' : 'text-green-400') :
            step.status === 'error' ? 'text-red-400' : 'text-gray-400'
          }`}>
            {step.label}
          </h3>
          {step.duration && step.duration > 0 && (
            <span className="text-xs text-gray-500">({(step.duration / 1000).toFixed(1)}s)</span>
          )}
        </div>
        <p className={`text-sm text-gray-500 ${isCleanup ? 'text-xs' : ''}`}>{step.description}</p>
        {step.error && <p className="text-sm text-red-400 mt-1">{step.error}</p>}
      </div>
    </div>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded border border-gray-600" style={{ backgroundColor: color }} />
      <span className="text-sm text-gray-400">{label}: {color}</span>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );
}

// ============================================================================
// MAIN SETUP CONTENT
// ============================================================================

function SetupContent() {
  const searchParams = useSearchParams();
  const platformType = (searchParams.get('type') as PlatformType) || 'commercial_investor';

  const [currentStep, setCurrentStep] = useState<'form' | 'extracting' | 'review' | 'creating' | 'success' | 'error'>('form');
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    companyWebsite: '',
    companyEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPhone: '',
    agentName: 'Maya',
    voiceGender: 'female',
    platformType,
    branding: null,
  });

  const platformLabels: Record<PlatformType, string> = {
    impact_investor: 'Impact Investor Platform',
    commercial_investor: 'Commercial Investor Platform',
    family_office: 'Family Office Platform',
    founder_service_provider: 'Founder Service Provider Platform',
  };

  // ============================================================================
  // STEP SIMULATION - Show progress as orchestration runs
  // ============================================================================

  const simulateSteps = async () => {
    const stepOrder = [
      'cleanup-supabase',
      'cleanup-vercel',
      'cleanup-github',
      'create-supabase',
      'wait-supabase',
      'run-migrations',
      'create-elevenlabs',
      'create-github',
      'create-vercel',
      'configure-auth',
      'trigger-deployment',
      'send-welcome-email',
    ];

    // Start cleanup steps
    for (let i = 0; i < 3; i++) {
      setSteps(prev => prev.map((s, idx) => ({
        ...s,
        status: idx === i ? 'running' : idx < i ? 'success' : s.status,
      })));
      await new Promise(r => setTimeout(r, 500));
    }

    // Mark cleanup complete
    setSteps(prev => prev.map((s, idx) => ({
      ...s,
      status: idx < 3 ? 'success' : idx === 3 ? 'running' : 'pending',
    })));
  };

  const updateStepsFromResult = (result: OrchestrationResult) => {
    // Map orchestrator step names to our UI step names
    const stepMapping: Record<string, string[]> = {
      'pre-cleanup': ['cleanup-supabase', 'cleanup-vercel', 'cleanup-github'],
      'create-supabase': ['create-supabase', 'wait-supabase'],
      'run-migrations': ['run-migrations'],
      'create-elevenlabs': ['create-elevenlabs'],
      'create-github': ['create-github'],
      'create-vercel': ['create-vercel'],
      'configure-auth': ['configure-auth'],
      'trigger-deployment': ['trigger-deployment'],
      'send-welcome-email': ['send-welcome-email'],
    };

    setSteps(prev => {
      const newSteps = [...prev];

      for (const resultStep of result.steps) {
        const uiStepIds = stepMapping[resultStep.step] || [resultStep.step];

        for (const uiStepId of uiStepIds) {
          const idx = newSteps.findIndex(s => s.id === uiStepId);
          if (idx !== -1) {
            newSteps[idx] = {
              ...newSteps[idx],
              status: resultStep.status === 'success' ? 'success' :
                      resultStep.status === 'error' ? 'error' :
                      resultStep.status === 'skipped' ? 'skipped' : 'pending',
              error: resultStep.error,
              duration: resultStep.duration ? resultStep.duration / uiStepIds.length : undefined,
            };
          }
        }
      }

      return newSteps;
    });
  };

  // ============================================================================
  // EXTRACTION
  // ============================================================================

  const handleExtract = async () => {
    if (!formData.companyWebsite) {
      setExtractionError('Please enter a website URL');
      return;
    }

    setCurrentStep('extracting');
    setExtractionError(null);

    try {
      const response = await fetch('/api/setup/extract-branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: formData.companyWebsite }),
      });

      const data = await response.json();

      if (data.success && data.branding) {
        setFormData(prev => ({
          ...prev,
          companyName: data.branding.company.name || prev.companyName,
          companyEmail: data.branding.contact?.email || prev.companyEmail,
          platformType: data.branding.platformType || prev.platformType,
          branding: data.branding,
        }));
        setCurrentStep('review');
      } else {
        setExtractionError(data.error || 'Extraction failed');
        setCurrentStep('form');
      }
    } catch (error: any) {
      setExtractionError(error.message || 'Failed to extract branding');
      setCurrentStep('form');
    }
  };

  const handleSkipExtraction = () => {
    setFormData(prev => ({
      ...prev,
      branding: {
        company: { name: prev.companyName, tagline: 'AI-Powered Pitch Coaching', description: '', website: prev.companyWebsite },
        colors: { primary: '#8B5CF6', accent: '#10B981', background: '#0F172A', text: '#F8FAFC' },
        logo: { url: null, base64: null },
        thesis: { focusAreas: [], sectors: [], philosophy: '' },
        contact: { email: prev.companyEmail, phone: null, linkedin: null },
        platformType: prev.platformType,
      },
    }));
    setCurrentStep('review');
  };

  // ============================================================================
  // ORCHESTRATION
  // ============================================================================

  const handleCreate = async () => {
    setCurrentStep('creating');
    setSteps(INITIAL_STEPS);

    // Start step simulation
    simulateSteps();

    try {
      const response = await fetch('/api/setup/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          companyWebsite: formData.companyWebsite,
          companyEmail: formData.companyEmail,
          adminFirstName: formData.adminFirstName,
          adminLastName: formData.adminLastName,
          adminEmail: formData.adminEmail,
          adminPhone: formData.adminPhone,
          agentName: formData.agentName,
          voiceGender: formData.voiceGender,
          platformMode: 'screening',
          branding: formData.branding,
        }),
      });

      const data: OrchestrationResult = await response.json();
      setResult(data);
      updateStepsFromResult(data);
      setCurrentStep(data.success ? 'success' : 'error');
    } catch (error: any) {
      setCurrentStep('error');
      setResult({
        success: false,
        platformUrl: null,
        steps: [],
        resources: { supabase: null, github: null, vercel: null, elevenlabs: null },
        error: error.message || 'An unexpected error occurred',
      });
    }
  };

  const handleRetry = () => {
    setCurrentStep('form');
    setSteps(INITIAL_STEPS);
    setResult(null);
    setFormData(prev => ({ ...prev, branding: null }));
  };

  // ============================================================================
  // RENDER: FORM (Initial)
  // ============================================================================

  if (currentStep === 'form') {
    return (
      <div className="min-h-screen bg-slate-950 text-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">RaiseReady Platform Setup</h1>
            <p className="text-gray-400">Create a white-label pitch coaching platform in minutes</p>
            <div className="mt-4 inline-block px-4 py-2 bg-purple-500/20 rounded-full text-purple-300 text-sm">
              {platformLabels[platformType]}
            </div>
          </div>

          <div className="space-y-6 bg-slate-900 rounded-xl p-8">
            <div>
              <label className="block text-sm font-medium mb-1">Company Website *</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  value={formData.companyWebsite}
                  onChange={e => setFormData(prev => ({ ...prev, companyWebsite: e.target.value }))}
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://acme.vc"
                />
                <button
                  type="button"
                  onClick={handleExtract}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Extract
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">We'll extract your branding, colors, and logo automatically</p>
              {extractionError && <p className="text-sm text-red-400 mt-2">{extractionError}</p>}
            </div>

            <div className="text-center text-gray-500">— or —</div>

            <button
              type="button"
              onClick={handleSkipExtraction}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
            >
              Skip Extraction & Configure Manually
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: EXTRACTING
  // ============================================================================

  if (currentStep === 'extracting') {
    return (
      <div className="min-h-screen bg-slate-950 text-white py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Globe className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold mb-2">Extracting Branding</h1>
          <p className="text-gray-400 mb-4">Analyzing {formData.companyWebsite}...</p>
          <div className="flex items-center justify-center gap-2 text-purple-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Extracting colors, logo, and company info</span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: REVIEW (After Extraction)
  // ============================================================================

  if (currentStep === 'review') {
    const branding = formData.branding!;

    return (
      <div className="min-h-screen bg-slate-950 text-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Review & Configure</h1>
            <p className="text-gray-400">We extracted the following from your website</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-6 bg-slate-900 rounded-xl p-8">
            {/* Extracted Branding Preview */}
            <div className="bg-slate-800 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-purple-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Extracted Branding
              </h3>
              {branding.logo.url && (
                <div className="flex items-center gap-3">
                  <img src={branding.logo.base64 || branding.logo.url} alt="Logo" className="h-10 w-auto" />
                  <span className="text-sm text-gray-400">Logo detected</span>
                </div>
              )}
              <div className="flex flex-wrap gap-4">
                <ColorSwatch color={branding.colors.primary} label="Primary" />
                <ColorSwatch color={branding.colors.accent} label="Accent" />
                <ColorSwatch color={branding.colors.background} label="Background" />
              </div>
              <div className="text-sm text-gray-400">
                Platform type: <span className="text-white">{platformLabels[branding.platformType]}</span>
              </div>
            </div>

            {/* Company Info */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b border-slate-700 pb-2">Company Information</h2>

              <div>
                <label className="block text-sm font-medium mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Company Email *</label>
                <input
                  type="email"
                  required
                  value={formData.companyEmail}
                  onChange={e => setFormData(prev => ({ ...prev, companyEmail: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Administrator */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b border-slate-700 pb-2">Administrator</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.adminFirstName}
                    onChange={e => setFormData(prev => ({ ...prev, adminFirstName: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.adminLastName}
                    onChange={e => setFormData(prev => ({ ...prev, adminLastName: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Admin Email *</label>
                <input
                  type="email"
                  required
                  value={formData.adminEmail}
                  onChange={e => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.adminPhone}
                  onChange={e => setFormData(prev => ({ ...prev, adminPhone: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* AI Coach */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b border-slate-700 pb-2">AI Coach</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Coach Name</label>
                  <input
                    type="text"
                    value={formData.agentName}
                    onChange={e => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Voice</label>
                  <select
                    value={formData.voiceGender}
                    onChange={e => setFormData(prev => ({ ...prev, voiceGender: e.target.value as 'female' | 'male' }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
            >
              Create Platform
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: CREATING / SUCCESS / ERROR
  // ============================================================================

  const cleanupSteps = steps.filter(s => s.isCleanup);
  const creationSteps = steps.filter(s => !s.isCleanup);

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {currentStep === 'creating' && 'Creating Your Platform'}
            {currentStep === 'success' && 'Platform Created!'}
            {currentStep === 'error' && 'Setup Failed'}
          </h1>
          <p className="text-gray-400">
            {currentStep === 'creating' && 'This may take 2-3 minutes...'}
            {currentStep === 'success' && 'Your platform is ready to use'}
            {currentStep === 'error' && (result?.rollback?.performed ? 'Resources have been cleaned up' : 'An error occurred during setup')}
          </p>
        </div>

        <div className="bg-slate-900 rounded-xl p-8">
          {/* Cleanup Steps Section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-orange-400 mb-3 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Pre-flight Cleanup
            </h3>
            <div className="pl-2 border-l-2 border-orange-500/30">
              {cleanupSteps.map((step, idx) => (
                <StepItem key={step.id} step={step} isLast={idx === cleanupSteps.length - 1} />
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700 my-6"></div>

          {/* Creation Steps Section */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Platform Creation
            </h3>
            {creationSteps.map((step, idx) => (
              <StepItem key={step.id} step={step} isLast={idx === creationSteps.length - 1} />
            ))}
          </div>

          {/* Success Panel */}
          {currentStep === 'success' && result && (
            <div className="border-t border-slate-700 pt-6 space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h3 className="text-green-400 font-semibold mb-2">Your platform is live!</h3>
                <a
                  href={result.platformUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-green-300 hover:text-green-200"
                >
                  {result.platformUrl}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {result.resources.github && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-1">GitHub Repository</h4>
                  <a
                    href={result.resources.github.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                  >
                    {result.resources.github.repoUrl}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {result.duration && (
                <p className="text-sm text-gray-500 text-center">
                  Completed in {(result.duration / 1000).toFixed(1)} seconds
                </p>
              )}
            </div>
          )}

          {/* Error Panel */}
          {currentStep === 'error' && result && (
            <div className="border-t border-slate-700 pt-6 space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-red-400 font-semibold mb-2">Error</h3>
                <p className="text-red-300">{result.error || 'An unexpected error occurred'}</p>
              </div>

              {result.rollback?.performed && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <h3 className="text-yellow-400 font-semibold mb-2">Cleanup Performed</h3>
                  <p className="text-yellow-300 text-sm">
                    Any partially created resources have been automatically deleted.
                  </p>
                </div>
              )}

              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE (Suspense wrapper)
// ============================================================================

export default function SetupPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SetupContent />
    </Suspense>
  );
}