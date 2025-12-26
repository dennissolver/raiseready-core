'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle, Circle, Loader2, XCircle, ExternalLink, RotateCcw,
  Sparkles, Globe, Trash2, MinusCircle, AlertCircle, ShieldCheck,
  Database, Github, Mic, Clock, RefreshCw, ArrowRight
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type PlatformType = 'founder_service_provider' | 'impact_investor' | 'commercial_investor' | 'family_office';
type CleanupStatus = 'pending' | 'deleting' | 'testing' | 'verified' | 'not_found' | 'error';
type CreateStatus = 'pending' | 'creating' | 'verifying' | 'ready' | 'warning' | 'error' | 'skipped';

interface CleanupComponent {
  id: string;
  name: string;
  icon: any;
  status: CleanupStatus;
  message?: string;
  attempts?: number;
}

interface CreateStep {
  id: string;
  name: string;
  icon: any;
  status: CreateStatus;
  message?: string;
  duration?: number;
  verified?: boolean;
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
  steps: Array<{
    step: string;
    status: string;
    message?: string;
    error?: string;
    duration?: number;
    verified?: boolean;
  }>;
  resources: {
    supabase: { projectId: string; url: string } | null;
    github: { repoUrl: string; repoName: string } | null;
    vercel: { projectId: string; url: string } | null;
    elevenlabs: { agentId: string } | null;
  };
  error?: string;
  duration?: number;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const getInitialCleanupComponents = (): CleanupComponent[] => [
  { id: 'supabase', name: 'Supabase Database', icon: Database, status: 'pending' },
  { id: 'github', name: 'GitHub Repository', icon: Github, status: 'pending' },
  { id: 'vercel', name: 'Vercel Project', icon: Globe, status: 'pending' },
  { id: 'elevenlabs', name: 'ElevenLabs Agent', icon: Mic, status: 'pending' },
];

const getInitialCreateSteps = (): CreateStep[] => [
  { id: 'supabase', name: 'Create Supabase Database', icon: Database, status: 'pending' },
  { id: 'elevenlabs', name: 'Create Voice Agent', icon: Mic, status: 'pending' },
  { id: 'github', name: 'Create GitHub Repository', icon: Github, status: 'pending' },
  { id: 'vercel', name: 'Create Vercel Project', icon: Globe, status: 'pending' },
  { id: 'auth', name: 'Configure Authentication', icon: ShieldCheck, status: 'pending' },
  { id: 'deploy', name: 'Deploy & Verify', icon: Sparkles, status: 'pending' },
];

// ============================================================================
// STATUS COMPONENTS
// ============================================================================

function CleanupStatusIcon({ status }: { status: CleanupStatus }) {
  switch (status) {
    case 'pending':
      return <Clock className="w-5 h-5 text-gray-500" />;
    case 'deleting':
      return <Trash2 className="w-5 h-5 text-orange-500 animate-pulse" />;
    case 'testing':
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'verified':
    case 'not_found':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500" />;
  }
}

function CreateStatusIcon({ status }: { status: CreateStatus }) {
  switch (status) {
    case 'pending':
      return <Clock className="w-5 h-5 text-gray-500" />;
    case 'creating':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'verifying':
      return <RefreshCw className="w-5 h-5 text-purple-500 animate-spin" />;
    case 'ready':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'skipped':
      return <MinusCircle className="w-5 h-5 text-gray-500" />;
  }
}

function getCleanupStatusText(status: CleanupStatus): string {
  switch (status) {
    case 'pending': return 'Waiting...';
    case 'deleting': return 'Deleting...';
    case 'testing': return 'Verifying deletion...';
    case 'verified': return 'Verified deleted';
    case 'not_found': return 'Not found (clean)';
    case 'error': return 'Error';
  }
}

function getCreateStatusText(status: CreateStatus): string {
  switch (status) {
    case 'pending': return 'Waiting...';
    case 'creating': return 'Creating...';
    case 'verifying': return 'Verifying...';
    case 'ready': return 'Ready ✓';
    case 'warning': return 'Warning';
    case 'error': return 'Error';
    case 'skipped': return 'Skipped';
  }
}

function getCleanupStatusColor(status: CleanupStatus): string {
  switch (status) {
    case 'pending': return 'border-gray-700 bg-gray-900/50';
    case 'deleting': return 'border-orange-500/50 bg-orange-500/10';
    case 'testing': return 'border-blue-500/50 bg-blue-500/10';
    case 'verified':
    case 'not_found': return 'border-green-500/50 bg-green-500/10';
    case 'error': return 'border-red-500/50 bg-red-500/10';
  }
}

function getCreateStatusColor(status: CreateStatus): string {
  switch (status) {
    case 'pending': return 'border-gray-700 bg-gray-900/50';
    case 'creating': return 'border-blue-500/50 bg-blue-500/10';
    case 'verifying': return 'border-purple-500/50 bg-purple-500/10';
    case 'ready': return 'border-green-500/50 bg-green-500/10';
    case 'warning': return 'border-yellow-500/50 bg-yellow-500/10';
    case 'error': return 'border-red-500/50 bg-red-500/10';
    case 'skipped': return 'border-gray-700 bg-gray-900/50';
  }
}

// ============================================================================
// CLEANUP COMPONENT ROW
// ============================================================================

function CleanupComponentRow({ component }: { component: CleanupComponent }) {
  const Icon = component.icon;
  const statusColor = getCleanupStatusColor(component.status);
  const statusText = getCleanupStatusText(component.status);
  const isActive = ['deleting', 'testing'].includes(component.status);
  const isDone = ['verified', 'not_found'].includes(component.status);

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-300 ${statusColor}`}>
      <div className={`p-2 rounded-lg ${isDone ? 'bg-green-500/20' : isActive ? 'bg-orange-500/20' : 'bg-gray-800'}`}>
        <Icon className={`w-5 h-5 ${isDone ? 'text-green-400' : isActive ? 'text-orange-400' : 'text-gray-400'}`} />
      </div>

      <div className="flex-1">
        <div className="font-medium text-white">{component.name}</div>
        <div className={`text-sm ${isDone ? 'text-green-400' : isActive ? 'text-orange-400' : 'text-gray-500'}`}>
          {component.message || statusText}
          {component.attempts && component.attempts > 1 && ` (${component.attempts} attempts)`}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <CleanupStatusIcon status={component.status} />
      </div>
    </div>
  );
}

// ============================================================================
// CREATE STEP ROW
// ============================================================================

function CreateStepRow({ step, disabled }: { step: CreateStep; disabled: boolean }) {
  const Icon = step.icon;
  const statusColor = disabled ? 'border-gray-800 bg-gray-900/30 opacity-50' : getCreateStatusColor(step.status);
  const statusText = getCreateStatusText(step.status);
  const isActive = ['creating', 'verifying'].includes(step.status);
  const isDone = step.status === 'ready';

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-300 ${statusColor}`}>
      <div className={`p-2 rounded-lg ${isDone ? 'bg-green-500/20' : isActive ? 'bg-blue-500/20' : 'bg-gray-800'}`}>
        <Icon className={`w-5 h-5 ${isDone ? 'text-green-400' : isActive ? 'text-blue-400' : 'text-gray-400'}`} />
      </div>

      <div className="flex-1">
        <div className={`font-medium ${disabled ? 'text-gray-600' : 'text-white'}`}>{step.name}</div>
        <div className={`text-sm ${isDone ? 'text-green-400' : isActive ? 'text-blue-400' : 'text-gray-500'}`}>
          {disabled ? 'Waiting for cleanup...' : (step.message || statusText)}
          {step.duration && ` (${(step.duration / 1000).toFixed(1)}s)`}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {disabled ? (
          <Clock className="w-5 h-5 text-gray-600" />
        ) : (
          <CreateStatusIcon status={step.status} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PHASE HEADER
// ============================================================================

function PhaseHeader({
  phase,
  title,
  subtitle,
  icon: Icon,
  isActive,
  isComplete,
  count
}: {
  phase: number;
  title: string;
  subtitle: string;
  icon: any;
  isActive: boolean;
  isComplete: boolean;
  count?: string;
}) {
  return (
    <div className={`flex items-center gap-4 mb-4 p-4 rounded-lg border ${
      isComplete ? 'border-green-500/50 bg-green-500/10' :
      isActive ? 'border-purple-500/50 bg-purple-500/10' :
      'border-gray-700 bg-gray-900/50'
    }`}>
      <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
        isComplete ? 'bg-green-500 text-white' :
        isActive ? 'bg-purple-500 text-white' :
        'bg-gray-700 text-gray-400'
      }`}>
        {isComplete ? <CheckCircle className="w-5 h-5" /> : phase}
      </div>

      <div className="flex-1">
        <div className={`font-semibold ${isComplete ? 'text-green-400' : isActive ? 'text-purple-400' : 'text-gray-400'}`}>
          {title}
        </div>
        <div className="text-sm text-gray-500">{subtitle}</div>
      </div>

      {count && (
        <div className={`text-sm font-medium ${isComplete ? 'text-green-400' : 'text-gray-500'}`}>
          {count}
        </div>
      )}

      <Icon className={`w-6 h-6 ${
        isComplete ? 'text-green-400' :
        isActive ? 'text-purple-400' :
        'text-gray-600'
      }`} />
    </div>
  );
}

// ============================================================================
// COLOR SWATCH
// ============================================================================

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
  const platformType = (searchParams.get('type') as PlatformType) || 'founder_service_provider';

  // UI State
  const [currentStep, setCurrentStep] = useState<'form' | 'extracting' | 'review' | 'running' | 'success' | 'error'>('form');
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'cleanup' | 'create'>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Cleanup State
  const [cleanupComponents, setCleanupComponents] = useState<CleanupComponent[]>(getInitialCleanupComponents());
  const [cleanupComplete, setCleanupComplete] = useState(false);

  // Create State
  const [createSteps, setCreateSteps] = useState<CreateStep[]>(getInitialCreateSteps());

  // Result State
  const [result, setResult] = useState<OrchestrationResult | null>(null);

  // Form State
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
    'founder_service_provider': 'Founder Services (No Investor Portal)',
    'impact_investor': 'Impact Investors & Founders',
    'commercial_investor': 'Commercial Investors (VCs, Angels, PE)',
    'family_office': 'Family Offices (Patient Capital)',
  };

  // ============================================================================
  // ELAPSED TIME COUNTER
  // ============================================================================

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (currentStep === 'running') {
      setElapsedTime(0);
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentStep]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const updateCleanupComponent = (id: string, updates: Partial<CleanupComponent>) => {
    setCleanupComponents(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const updateCreateStep = (id: string, updates: Partial<CreateStep>) => {
    setCreateSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const allCleanupVerified = cleanupComponents.every(c =>
    c.status === 'verified' || c.status === 'not_found'
  );

  const cleanupVerifiedCount = cleanupComponents.filter(c =>
    c.status === 'verified' || c.status === 'not_found'
  ).length;

  const createReadyCount = createSteps.filter(s =>
    s.status === 'ready' || s.status === 'warning'
  ).length;

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
        body: JSON.stringify({
          companyWebsite: formData.companyWebsite,
          companyName: formData.companyName,
        }),
      });

      const data = await response.json();

      if (data.success && data.branding) {
        const extractedColors = data.branding.colors || {};
        const fullBranding: ExtractedBranding = {
          company: {
            name: formData.companyName,
            tagline: data.branding.description || 'AI-Powered Pitch Coaching',
            description: data.branding.description || '',
            website: formData.companyWebsite
          },
          colors: {
            primary: extractedColors.primary || '#8B5CF6',
            accent: extractedColors.accent || '#10B981',
            background: extractedColors.background || '#0F172A',
            text: extractedColors.text || '#F8FAFC'
          },
          logo: { url: null, base64: null },
          thesis: { focusAreas: [], sectors: [], philosophy: data.branding.description || '' },
          contact: { email: formData.companyEmail, phone: null, linkedin: null },
          platformType: formData.platformType,
        };

        setFormData(prev => ({ ...prev, branding: fullBranding }));
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
  // MAIN ORCHESTRATION
  // ============================================================================

  const handleCreate = async () => {
    // Reset states
    setCurrentStep('running');
    setCurrentPhase('cleanup');
    setCleanupComplete(false);
    setCleanupComponents(getInitialCleanupComponents());
    setCreateSteps(getInitialCreateSteps());
    setResult(null);

    const projectSlug = formData.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);

    try {
      // ======================================================================
      // PHASE 1: CLEANUP - Delete and verify each component
      // ======================================================================

      // Set all to "deleting" initially
      setCleanupComponents(prev => prev.map(c => ({ ...c, status: 'deleting' as CleanupStatus })));

      const cleanupResponse = await fetch('/api/setup/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectSlug,
          companyName: formData.companyName,
          companyWebsite: formData.companyWebsite, // v5: Also search by website domain
        }),
      });

      const cleanupData = await cleanupResponse.json();

      // Update each component based on cleanup results
      if (cleanupData.results) {
        for (const result of cleanupData.results) {
          const componentId = result.component.toLowerCase();

          if (result.verified) {
            updateCleanupComponent(componentId, {
              status: result.found ? 'verified' : 'not_found',
              message: result.found
                ? `Deleted and verified`
                : 'Not found (clean)',
              attempts: result.attempts,
            });
          } else {
            updateCleanupComponent(componentId, {
              status: 'error',
              message: result.error || 'Failed to delete',
              attempts: result.attempts,
            });
          }
        }
      }

      // Check if all cleanup succeeded
      if (!cleanupData.success || !cleanupData.allVerifiedDeleted) {
        const failedComponents = cleanupData.results
          ?.filter((r: any) => !r.verified)
          ?.map((r: any) => r.component)
          ?.join(', ') || 'unknown';

        throw new Error(`Cleanup failed for: ${failedComponents}`);
      }

      // Mark cleanup as complete
      setCleanupComplete(true);

      // ======================================================================
      // PHASE 2: CREATE - Build all components
      // ======================================================================
      setCurrentPhase('create');

      const orchestrateResponse = await fetch('/api/setup/orchestrate', {
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
          platformType: formData.platformType,
          platformMode: 'screening',
          branding: formData.branding,
          skipPreCleanup: true, // We already did cleanup
        }),
      });

      const orchestrateData: OrchestrationResult = await orchestrateResponse.json();

      // Update create steps from result
      if (orchestrateData.steps) {
        for (const step of orchestrateData.steps) {
          const stepId = step.step;

          let status: CreateStatus = 'pending';
          if (step.status === 'success') status = 'ready';
          else if (step.status === 'warning') status = 'warning';
          else if (step.status === 'error') status = 'error';
          else if (step.status === 'skipped') status = 'skipped';

          updateCreateStep(stepId, {
            status,
            message: step.message || step.error,
            duration: step.duration,
            verified: step.verified,
          });
        }
      }

      setResult(orchestrateData);
      setCurrentStep(orchestrateData.success ? 'success' : 'error');

    } catch (error: any) {
      setResult({
        success: false,
        platformUrl: null,
        steps: [],
        resources: { supabase: null, github: null, vercel: null, elevenlabs: null },
        error: error.message || 'An unexpected error occurred',
      });
      setCurrentStep('error');
    }
  };

  const handleRetry = () => {
    setCurrentStep('form');
    setCurrentPhase('idle');
    setCleanupComponents(getInitialCleanupComponents());
    setCreateSteps(getInitialCreateSteps());
    setCleanupComplete(false);
    setResult(null);
    setElapsedTime(0);
    setFormData(prev => ({ ...prev, branding: null }));
  };

  // ============================================================================
  // RENDER: EXTRACTING
  // ============================================================================

  if (currentStep === 'extracting') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Analyzing Website</h2>
          <p className="text-gray-400">Extracting branding and colors...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: REVIEW BRANDING
  // ============================================================================

  if (currentStep === 'review' && formData.branding) {
    const { branding } = formData;

    if (!branding.company || !branding.colors) {
      setCurrentStep('form');
      return null;
    }

    return (
      <div className="min-h-screen bg-slate-950 text-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Review Branding</h1>
            <p className="text-gray-400">Confirm the extracted information</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-8 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Company</h3>
              <div className="grid gap-2 text-sm">
                <div><span className="text-gray-400">Name:</span> {branding.company.name}</div>
                <div><span className="text-gray-400">Tagline:</span> {branding.company.tagline}</div>
                <div><span className="text-gray-400">Website:</span> {branding.company.website}</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Colors</h3>
              <div className="grid grid-cols-2 gap-3">
                <ColorSwatch color={branding.colors.primary} label="Primary" />
                <ColorSwatch color={branding.colors.accent} label="Accent" />
                <ColorSwatch color={branding.colors.background} label="Background" />
                <ColorSwatch color={branding.colors.text} label="Text" />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setCurrentStep('form')}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
              >
                Edit Details
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                Create Platform
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: FORM
  // ============================================================================

  if (currentStep === 'form') {
    return (
      <div className="min-h-screen bg-slate-950 text-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-sm mb-4">
              <Sparkles className="w-4 h-4" />
              {platformLabels[platformType]}
            </div>
            <h1 className="text-3xl font-bold mb-2">Create Your Platform</h1>
            <p className="text-gray-400">Enter your details to generate a white-label platform</p>
          </div>

          {extractionError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-400">{extractionError}</p>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleExtract(); }} className="bg-slate-900 rounded-xl p-8 space-y-6">
            {/* Company */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b border-slate-700 pb-2">Company</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Acme Ventures"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Website</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.companyWebsite}
                    onChange={e => setFormData(prev => ({ ...prev, companyWebsite: e.target.value }))}
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="https://acmeventures.com"
                  />
                  <button
                    type="button"
                    onClick={handleExtract}
                    disabled={!formData.companyWebsite}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Extract
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company Email *</label>
                <input
                  type="email"
                  required
                  value={formData.companyEmail}
                  onChange={e => setFormData(prev => ({ ...prev, companyEmail: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="contact@acmeventures.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Platform Type *</label>
                <select
                  value={formData.platformType}
                  onChange={e => setFormData(prev => ({ ...prev, platformType: e.target.value as PlatformType }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="founder_service_provider">Founder Services (No Investor Portal)</option>
                  <option value="impact_investor">Impact Investors & Founders</option>
                  <option value="commercial_investor">Commercial Investors (VCs, Angels, PE)</option>
                  <option value="family_office">Family Offices (Patient Capital)</option>
                </select>
              </div>
            </div>

            {/* Admin */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b border-slate-700 pb-2">Admin User</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.adminFirstName}
                    onChange={e => setFormData(prev => ({ ...prev, adminFirstName: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.adminLastName}
                    onChange={e => setFormData(prev => ({ ...prev, adminLastName: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
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
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                />
              </div>
            </div>

            {/* Voice */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b border-slate-700 pb-2">AI Coach</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.agentName}
                    onChange={e => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Voice</label>
                  <select
                    value={formData.voiceGender}
                    onChange={e => setFormData(prev => ({ ...prev, voiceGender: e.target.value as 'female' | 'male' }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleSkipExtraction}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
              >
                Skip Extraction
              </button>
              <button type="submit" className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors">
                Extract & Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: RUNNING / SUCCESS / ERROR
  // ============================================================================

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {currentStep === 'running' && 'Creating Your Platform'}
            {currentStep === 'success' && 'Platform Created!'}
            {currentStep === 'error' && 'Setup Failed'}
          </h1>
          <p className="text-gray-400">
            {currentStep === 'running' && `Elapsed: ${Math.floor(elapsedTime / 60)}:${(elapsedTime % 60).toString().padStart(2, '0')}`}
            {currentStep === 'success' && 'All components verified and ready'}
            {currentStep === 'error' && 'An error occurred during setup'}
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* ================================================================
              PHASE 1: CLEANUP
          ================================================================ */}
          <div className="bg-slate-900 rounded-xl p-6">
            <PhaseHeader
              phase={1}
              title="Cleanup - Verify Deletion"
              subtitle="Delete any existing components and verify they're gone"
              icon={Trash2}
              isActive={currentPhase === 'cleanup'}
              isComplete={cleanupComplete}
              count={`${cleanupVerifiedCount}/4 verified`}
            />

            <div className="space-y-3">
              {cleanupComponents.map(component => (
                <CleanupComponentRow key={component.id} component={component} />
              ))}
            </div>

            {/* Cleanup Status Message */}
            {currentPhase === 'cleanup' && !cleanupComplete && (
              <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <p className="text-orange-400 text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting and verifying each component. Creation will start when all are confirmed deleted.
                </p>
              </div>
            )}

            {cleanupComplete && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-green-400 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  All components verified deleted. Proceeding to creation...
                </p>
              </div>
            )}
          </div>

          {/* ================================================================
              PHASE 2: CREATE
          ================================================================ */}
          <div className={`bg-slate-900 rounded-xl p-6 transition-opacity duration-300 ${
            cleanupComplete ? 'opacity-100' : 'opacity-50'
          }`}>
            <PhaseHeader
              phase={2}
              title="Create - Build Components"
              subtitle="Create and verify each component is ready"
              icon={Sparkles}
              isActive={currentPhase === 'create'}
              isComplete={currentStep === 'success'}
              count={`${createReadyCount}/6 ready`}
            />

            <div className="space-y-3">
              {createSteps.map(step => (
                <CreateStepRow
                  key={step.id}
                  step={step}
                  disabled={!cleanupComplete}
                />
              ))}
            </div>

            {/* Waiting for cleanup message */}
            {!cleanupComplete && currentStep === 'running' && (
              <div className="mt-4 p-3 bg-gray-800 border border-gray-700 rounded-lg">
                <p className="text-gray-400 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Waiting for all cleanup verifications to complete before starting creation...
                </p>
              </div>
            )}
          </div>

          {/* ================================================================
              SUCCESS RESULT
          ================================================================ */}
          {currentStep === 'success' && result && (
            <div className="bg-slate-900 rounded-xl p-6 space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Your platform is live!
                </h3>
                <a
                  href={result.platformUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-green-300 hover:text-green-200 transition-colors"
                >
                  {result.platformUrl}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {result.resources.github && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-1">GitHub Repository</h4>
                  <a
                    href={result.resources.github.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {result.resources.github.repoUrl}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {result.duration && (
                <p className="text-sm text-gray-500 text-center">
                  Completed in {(result.duration / 1000).toFixed(1)}s
                </p>
              )}
            </div>
          )}

          {/* ================================================================
              ERROR RESULT
          ================================================================ */}
          {currentStep === 'error' && result && (
            <div className="bg-slate-900 rounded-xl p-6 space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Error
                </h3>
                <p className="text-red-300">{result.error}</p>
              </div>

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
// MAIN PAGE
// ============================================================================

export default function SetupPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SetupContent />
    </Suspense>
  );
}