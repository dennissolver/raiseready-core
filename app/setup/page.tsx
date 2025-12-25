'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle, Circle, Loader2, XCircle, ExternalLink, RotateCcw,
  Sparkles, Globe, Trash2, MinusCircle, AlertCircle, ShieldCheck
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type PlatformType = 'founder_service_provider' | 'impact_investor' | 'commercial_investor' | 'family_office';
type StepStatus = 'pending' | 'running' | 'verifying' | 'success' | 'error' | 'skipped' | 'warning';

interface Step {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
  message?: string;
  error?: string;
  duration?: number;
  isCleanup?: boolean;
  verified?: boolean;
  verificationDetails?: string;
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
  fullyVerified?: boolean;
  platformUrl: string | null;
  steps: Array<{
    step: string;
    status: string;
    message?: string;
    error?: string;
    duration?: number;
    verified?: boolean;
    verificationDetails?: string;
  }>;
  resources: {
    supabase: { projectId: string; url: string } | null;
    github: { repoUrl: string; repoName: string } | null;
    vercel: { projectId: string; url: string } | null;
    elevenlabs: { agentId: string } | null;
  };
  verification?: {
    passed: number;
    total: number;
    allPassed: boolean;
  };
  rollback?: { performed: boolean };
  error?: string;
  duration?: number;
}

// ============================================================================
// STEP DEFINITIONS
// ============================================================================

const STEP_CONFIG: Record<string, { label: string; description: string; isCleanup?: boolean }> = {
  'cleanup-supabase': { label: 'Checking Supabase', description: 'Looking for existing project...', isCleanup: true },
  'cleanup-vercel': { label: 'Checking Vercel', description: 'Looking for existing deployment...', isCleanup: true },
  'cleanup-github': { label: 'Checking GitHub', description: 'Looking for existing repository...', isCleanup: true },
  'create-supabase': { label: 'Creating Supabase', description: 'Setting up database...' },
  'run-migrations': { label: 'Applying schema', description: 'Creating tables and policies...' },
  'create-elevenlabs': { label: 'Creating voice agent', description: 'Setting up AI coaching...' },
  'create-github': { label: 'Creating repository', description: 'Pushing platform code...' },
  'create-vercel': { label: 'Creating deployment', description: 'Configuring hosting...' },
  'configure-auth': { label: 'Configuring auth', description: 'Setting up login...' },
  'trigger-deployment': { label: 'Deploying platform', description: 'Building your site...' },
  'verify-deployment': { label: 'Verifying deployment', description: 'Confirming site is live...' },
  'send-welcome-email': { label: 'Sending welcome email', description: 'Notifying admin...' },
  'rollback': { label: 'Rolling back', description: 'Cleaning up resources...', isCleanup: true },
};

const STEP_ORDER = [
  'cleanup-supabase', 'cleanup-vercel', 'cleanup-github',
  'create-supabase', 'run-migrations', 'create-elevenlabs',
  'create-github', 'create-vercel', 'configure-auth',
  'trigger-deployment', 'verify-deployment', 'send-welcome-email',
];

function getInitialSteps(): Step[] {
  return STEP_ORDER.map(id => ({
    id,
    label: STEP_CONFIG[id]?.label || id,
    description: STEP_CONFIG[id]?.description || '',
    status: 'pending' as StepStatus,
    isCleanup: STEP_CONFIG[id]?.isCleanup,
  }));
}

// ============================================================================
// STATUS COLOR HELPERS
// ============================================================================

function getStatusColor(status: StepStatus, verified?: boolean, isCleanup?: boolean): {
  icon: string;
  text: string;
  line: string;
  bg: string;
} {
  // Cleanup steps use orange palette
  if (isCleanup) {
    switch (status) {
      case 'success':
        return { icon: 'text-orange-400', text: 'text-orange-300', line: 'bg-orange-500/50', bg: 'bg-orange-500/10' };
      case 'running':
        return { icon: 'text-orange-400', text: 'text-orange-300', line: 'bg-orange-500/30', bg: 'bg-orange-500/10' };
      default:
        return { icon: 'text-gray-600', text: 'text-gray-400', line: 'bg-gray-700', bg: 'bg-transparent' };
    }
  }

  // Main creation steps
  switch (status) {
    case 'pending':
      return { icon: 'text-gray-600', text: 'text-gray-400', line: 'bg-gray-700', bg: 'bg-transparent' };
    case 'running':
      return { icon: 'text-orange-500', text: 'text-orange-400', line: 'bg-orange-500/30', bg: 'bg-orange-500/10' };
    case 'verifying':
      return { icon: 'text-yellow-500', text: 'text-yellow-400', line: 'bg-yellow-500/30', bg: 'bg-yellow-500/10' };
    case 'success':
      // Only green if verified, otherwise orange/yellow
      if (verified === true) {
        return { icon: 'text-green-500', text: 'text-green-400', line: 'bg-green-500/50', bg: 'bg-green-500/10' };
      } else if (verified === false) {
        return { icon: 'text-yellow-500', text: 'text-yellow-400', line: 'bg-yellow-500/50', bg: 'bg-yellow-500/10' };
      }
      // No verification field means old behavior - show green
      return { icon: 'text-green-500', text: 'text-green-400', line: 'bg-green-500/50', bg: 'bg-green-500/10' };
    case 'warning':
      return { icon: 'text-yellow-500', text: 'text-yellow-400', line: 'bg-yellow-500/50', bg: 'bg-yellow-500/10' };
    case 'error':
      return { icon: 'text-red-500', text: 'text-red-400', line: 'bg-red-500/50', bg: 'bg-red-500/10' };
    case 'skipped':
      return { icon: 'text-gray-500', text: 'text-gray-500', line: 'bg-gray-700', bg: 'bg-transparent' };
    default:
      return { icon: 'text-gray-600', text: 'text-gray-400', line: 'bg-gray-700', bg: 'bg-transparent' };
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

function StepIcon({ status, verified, isCleanup }: { status: StepStatus; verified?: boolean; isCleanup?: boolean }) {
  const size = isCleanup ? 'w-4 h-4' : 'w-5 h-5';
  const colors = getStatusColor(status, verified, isCleanup);

  switch (status) {
    case 'success':
      if (verified === true) {
        return <ShieldCheck className={`${size} ${colors.icon}`} />;
      } else if (verified === false) {
        return <AlertCircle className={`${size} ${colors.icon}`} />;
      }
      return <CheckCircle className={`${size} ${colors.icon}`} />;
    case 'error':
      return <XCircle className={`${size} ${colors.icon}`} />;
    case 'running':
    case 'verifying':
      return <Loader2 className={`${size} ${colors.icon} animate-spin`} />;
    case 'skipped':
      return <MinusCircle className={`${size} ${colors.icon}`} />;
    case 'warning':
      return <AlertCircle className={`${size} ${colors.icon}`} />;
    default:
      return <Circle className={`${size} ${colors.icon}`} />;
  }
}

function StepItem({ step, isLast }: { step: Step; isLast: boolean }) {
  const isCleanup = step.isCleanup;
  const colors = getStatusColor(step.status, step.verified, isCleanup);

  // Dynamic description based on state
  let displayDescription = step.description;
  if (step.status === 'success' && step.verificationDetails) {
    displayDescription = step.verificationDetails;
  } else if (step.message) {
    displayDescription = step.message;
  } else if (step.error) {
    displayDescription = step.error;
  }

  return (
    <div className={`flex gap-3 ${isCleanup ? 'opacity-90' : ''}`}>
      <div className="flex flex-col items-center">
        <StepIcon status={step.status} verified={step.verified} isCleanup={isCleanup} />
        {!isLast && (
          <div className={`w-0.5 flex-1 min-h-[24px] mt-1 ${colors.line}`} />
        )}
      </div>
      <div className={`flex-1 ${isCleanup ? 'pb-3' : 'pb-5'}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className={`${isCleanup ? 'text-sm' : 'font-medium'} ${colors.text}`}>
            {step.label}
          </h3>
          {step.duration && step.duration > 0 && (
            <span className="text-xs text-gray-500">({(step.duration / 1000).toFixed(1)}s)</span>
          )}
          {step.verified === true && !isCleanup && (
            <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">verified</span>
          )}
          {step.verified === false && step.status === 'success' && !isCleanup && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">unverified</span>
          )}
        </div>
        <p className={`text-sm ${step.status === 'error' ? 'text-red-400' : 'text-gray-500'} ${isCleanup ? 'text-xs' : ''}`}>
          {displayDescription}
        </p>
      </div>
    </div>
  );
}

function VerificationSummary({ verification }: { verification?: { passed: number; total: number; allPassed: boolean } }) {
  if (!verification) return null;

  const { passed, total, allPassed } = verification;
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className={`rounded-lg p-4 mb-4 ${allPassed ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allPassed ? (
            <ShieldCheck className="w-5 h-5 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          )}
          <span className={allPassed ? 'text-green-400' : 'text-yellow-400'}>
            Verification: {passed}/{total} checks passed
          </span>
        </div>
        <div className="text-sm text-gray-400">{percentage}%</div>
      </div>
      <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${allPassed ? 'bg-green-500' : 'bg-yellow-500'}`}
          style={{ width: `${percentage}%` }}
        />
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
  const platformType = (searchParams.get('type') as PlatformType) || 'founder_service_provider';

  const [currentStep, setCurrentStep] = useState<'form' | 'extracting' | 'review' | 'creating' | 'success' | 'error'>('form');
  const [steps, setSteps] = useState<Step[]>(getInitialSteps());
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
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

    if (currentStep === 'creating') {
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
  // STEP PROGRESS - Mark steps as running in sequence (orange, not green)
  // ============================================================================

  const startProgressSimulation = () => {
    let currentIdx = 0;

    const interval = setInterval(() => {
      setSteps(prev => {
        const newSteps = [...prev];

        // Mark current as running (ORANGE, not green)
        if (currentIdx < newSteps.length) {
          // Leave previous step as running (will be updated by real result)
          if (newSteps[currentIdx].status === 'pending') {
            newSteps[currentIdx].status = 'running';
          }
          currentIdx++;
        }

        return newSteps;
      });

      if (currentIdx >= STEP_ORDER.length) {
        clearInterval(interval);
      }
    }, 2000); // Slower to match real progress

    return () => clearInterval(interval);
  };

  // ============================================================================
  // UPDATE STEPS FROM REAL RESULT
  // ============================================================================

  const updateStepsFromResult = (result: OrchestrationResult) => {
    setSteps(prev => {
      const newSteps = [...prev];

      for (const resultStep of result.steps) {
        const idx = newSteps.findIndex(s => s.id === resultStep.step);
        if (idx !== -1) {
          // Map status correctly including verification state
          let mappedStatus: StepStatus = 'pending';
          if (resultStep.status === 'success') {
            mappedStatus = 'success';
          } else if (resultStep.status === 'error') {
            mappedStatus = 'error';
          } else if (resultStep.status === 'skipped') {
            mappedStatus = 'skipped';
          } else if (resultStep.status === 'verifying') {
            mappedStatus = 'verifying';
          } else if (resultStep.status === 'in_progress') {
            mappedStatus = 'running';
          }

          newSteps[idx] = {
            ...newSteps[idx],
            status: mappedStatus,
            message: resultStep.message,
            error: resultStep.error,
            duration: resultStep.duration,
            verified: resultStep.verified,
            verificationDetails: resultStep.verificationDetails,
          };
        } else {
          // Handle new steps like 'verify-deployment' or 'rollback'
          if (STEP_CONFIG[resultStep.step]) {
            newSteps.push({
              id: resultStep.step,
              label: STEP_CONFIG[resultStep.step].label,
              description: STEP_CONFIG[resultStep.step].description,
              status: resultStep.status === 'success' ? 'success' :
                      resultStep.status === 'error' ? 'error' :
                      resultStep.status === 'skipped' ? 'skipped' : 'pending',
              message: resultStep.message,
              error: resultStep.error,
              duration: resultStep.duration,
              isCleanup: STEP_CONFIG[resultStep.step].isCleanup,
              verified: resultStep.verified,
              verificationDetails: resultStep.verificationDetails,
            });
          }
        }
      }

      // Mark remaining pending/running steps as skipped if we had an error
      if (!result.success) {
        newSteps.forEach((step, idx) => {
          if (step.status === 'pending' || step.status === 'running') {
            newSteps[idx] = { ...step, status: 'skipped', message: 'Skipped due to error' };
          }
        });
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
        body: JSON.stringify({
          companyWebsite: formData.companyWebsite,
          companyName: formData.companyName,
        }),
      });

      const data = await response.json();

      if (data.success && data.branding) {
        // Construct full branding object from API response + form data
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

        setFormData(prev => ({
          ...prev,
          branding: fullBranding,
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
    setSteps(getInitialSteps());

    // Start simulation (shows orange for in-progress)
    const stopSimulation = startProgressSimulation();

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
          platformType: formData.platformType,
          platformMode: 'screening',
          branding: formData.branding,
        }),
      });

      const data: OrchestrationResult = await response.json();
      stopSimulation();
      setResult(data);
      updateStepsFromResult(data);
      setCurrentStep(data.success ? 'success' : 'error');
    } catch (error: any) {
      stopSimulation();
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
    setSteps(getInitialSteps());
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

    // Ensure branding has required structure (defensive check)
    if (!branding.company || !branding.colors) {
      // Redirect back to form if branding is incomplete
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
            {/* Company */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Company</h3>
              <div className="grid gap-2 text-sm">
                <div><span className="text-gray-400">Name:</span> {branding.company.name}</div>
                <div><span className="text-gray-400">Tagline:</span> {branding.company.tagline}</div>
                <div><span className="text-gray-400">Website:</span> {branding.company.website}</div>
              </div>
            </div>

            {/* Colors */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Colors</h3>
              <div className="grid grid-cols-2 gap-3">
                <ColorSwatch color={branding.colors.primary} label="Primary" />
                <ColorSwatch color={branding.colors.accent} label="Accent" />
                <ColorSwatch color={branding.colors.background} label="Background" />
                <ColorSwatch color={branding.colors.text} label="Text" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setCurrentStep('form')}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold"
              >
                Edit Details
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
              >
                Create Platform
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
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg flex items-center gap-2"
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
                <p className="text-xs text-gray-400 mt-1">
                  {formData.platformType === 'founder_service_provider' && 'For service providers like Lionheart - founders only, no investor matching'}
                  {formData.platformType === 'impact_investor' && 'For impact-focused funds - includes SDG tracking and impact returns'}
                  {formData.platformType === 'commercial_investor' && 'For VCs, angels, and PE - traditional fundraising metrics'}
                  {formData.platformType === 'family_office' && 'For family offices - patient capital, long-term focus'}
                </p>
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
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold"
              >
                Skip Extraction
              </button>
              <button type="submit" className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold">
                Extract & Continue
              </button>
            </div>
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
            {currentStep === 'success' && (result?.fullyVerified ? 'Platform Verified!' : 'Platform Created')}
            {currentStep === 'error' && 'Setup Failed'}
          </h1>
          <p className="text-gray-400">
            {currentStep === 'creating' && `Elapsed: ${Math.floor(elapsedTime / 60)}:${(elapsedTime % 60).toString().padStart(2, '0')}`}
            {currentStep === 'success' && (result?.fullyVerified ? 'All verifications passed' : 'Some verifications pending')}
            {currentStep === 'error' && 'An error occurred during setup'}
          </p>
        </div>

        <div className="bg-slate-900 rounded-xl p-8">
          {/* Verification Summary */}
          {(currentStep === 'success' || currentStep === 'error') && result?.verification && (
            <VerificationSummary verification={result.verification} />
          )}

          {/* Cleanup Steps */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-orange-400 mb-3 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Pre-flight Cleanup
            </h3>
            <div className="pl-2 border-l border-orange-500/30">
              {cleanupSteps.map((step, idx) => (
                <StepItem key={step.id} step={step} isLast={idx === cleanupSteps.length - 1} />
              ))}
            </div>
          </div>

          <div className="border-t border-slate-700 my-6" />

          {/* Creation Steps */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Platform Creation
            </h3>
            {creationSteps.map((step, idx) => (
              <StepItem key={step.id} step={step} isLast={idx === creationSteps.length - 1} />
            ))}
          </div>

          {/* Success */}
          {currentStep === 'success' && result && (
            <div className="border-t border-slate-700 pt-6 space-y-4">
              <div className={`rounded-lg p-4 ${result.fullyVerified ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                <h3 className={`font-semibold mb-2 ${result.fullyVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                  {result.fullyVerified ? 'Your platform is live and verified!' : 'Platform created - some checks pending'}
                </h3>
                <a
                  href={result.platformUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 hover:opacity-80 ${result.fullyVerified ? 'text-green-300' : 'text-yellow-300'}`}
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
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
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

          {/* Error */}
          {currentStep === 'error' && result && (
            <div className="border-t border-slate-700 pt-6 space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-red-400 font-semibold mb-2">Error</h3>
                <p className="text-red-300">{result.error}</p>
              </div>

              {result.rollback?.performed && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-300 text-sm">Resources have been cleaned up.</p>
                </div>
              )}

              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold"
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