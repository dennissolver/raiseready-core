'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Circle, Loader2, XCircle, ExternalLink, RotateCcw } from 'lucide-react';

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
}

interface OrchestrationResult {
  success: boolean;
  platformUrl: string | null;
  steps: Array<{
    step: string;
    status: string;
    error?: string;
    duration?: number;
    data?: any;
  }>;
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
// STEP DEFINITIONS
// ============================================================================

const INITIAL_STEPS: Step[] = [
  { id: 'create-supabase', label: 'Creating Supabase project', description: 'Setting up database and authentication', status: 'pending' },
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

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'success':
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    case 'error':
      return <XCircle className="w-6 h-6 text-red-500" />;
    case 'running':
      return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
    case 'skipped':
      return <Circle className="w-6 h-6 text-gray-400" />;
    default:
      return <Circle className="w-6 h-6 text-gray-600" />;
  }
}

function StepItem({ step, isLast }: { step: Step; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <StepIcon status={step.status} />
        {!isLast && (
          <div className={`w-0.5 h-full min-h-[40px] mt-2 ${
            step.status === 'success' ? 'bg-green-500' : 
            step.status === 'error' ? 'bg-red-500' : 'bg-gray-700'
          }`} />
        )}
      </div>
      <div className="flex-1 pb-8">
        <div className="flex items-center gap-2">
          <h3 className={`font-medium ${
            step.status === 'running' ? 'text-blue-400' :
            step.status === 'success' ? 'text-green-400' :
            step.status === 'error' ? 'text-red-400' : 'text-gray-400'
          }`}>
            {step.label}
          </h3>
          {step.duration && (
            <span className="text-xs text-gray-500">({(step.duration / 1000).toFixed(1)}s)</span>
          )}
        </div>
        <p className="text-sm text-gray-500">{step.description}</p>
        {step.error && (
          <p className="text-sm text-red-400 mt-1">{step.error}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SetupPage() {
  const searchParams = useSearchParams();
  const platformType = (searchParams.get('type') as PlatformType) || 'commercial_investor';

  const [currentStep, setCurrentStep] = useState<'form' | 'creating' | 'success' | 'error'>('form');
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [result, setResult] = useState<OrchestrationResult | null>(null);
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
  });

  const platformLabels: Record<PlatformType, string> = {
    impact_investor: 'Impact Investor Platform',
    commercial_investor: 'Commercial Investor Platform',
    family_office: 'Family Office Platform',
    founder_service_provider: 'Founder Service Provider Platform',
  };

  // Update step status based on orchestration results
  const updateStepsFromResult = (result: OrchestrationResult) => {
    setSteps(prev => prev.map(step => {
      const resultStep = result.steps.find(s => s.step === step.id);
      if (resultStep) {
        return {
          ...step,
          status: resultStep.status === 'success' ? 'success' :
                  resultStep.status === 'error' ? 'error' :
                  resultStep.status === 'skipped' ? 'skipped' : 'pending',
          error: resultStep.error,
          duration: resultStep.duration,
        };
      }
      return step;
    }));
  };

  // Simulate step progress while waiting for orchestrator
  const simulateProgress = async () => {
    for (let i = 0; i < INITIAL_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
      setSteps(prev => prev.map((step, idx) =>
        idx === i ? { ...step, status: 'running' } :
        idx < i ? { ...step, status: 'success' } : step
      ));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep('creating');
    setSteps(INITIAL_STEPS.map((s, i) => ({ ...s, status: i === 0 ? 'running' : 'pending' })));

    // Start progress simulation
    const progressPromise = simulateProgress();

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
          branding: {
            company: {
              name: formData.companyName,
              tagline: 'AI-Powered Pitch Coaching',
              description: `${formData.companyName} helps founders perfect their pitch.`,
              website: formData.companyWebsite,
            },
            colors: { primary: '#8B5CF6', accent: '#10B981', background: '#0F172A', text: '#F8FAFC' },
            logo: { url: null },
            thesis: { focusAreas: [], sectors: [], philosophy: '' },
            contact: { email: formData.companyEmail, phone: null, linkedin: null },
            platformType: formData.platformType,
          },
        }),
      });

      const data: OrchestrationResult = await response.json();
      setResult(data);
      updateStepsFromResult(data);

      if (data.success) {
        setCurrentStep('success');
      } else {
        setCurrentStep('error');
      }
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
  };

  // ============================================================================
  // RENDER: FORM
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

          <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900 rounded-xl p-8">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b border-slate-700 pb-2">Company Information</h2>

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
                <label className="block text-sm font-medium mb-1">Company Website</label>
                <input
                  type="url"
                  value={formData.companyWebsite}
                  onChange={e => setFormData(prev => ({ ...prev, companyWebsite: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://acme.vc"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Company Email *</label>
                <input
                  type="email"
                  required
                  value={formData.companyEmail}
                  onChange={e => setFormData(prev => ({ ...prev, companyEmail: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="contact@acme.vc"
                />
              </div>
            </div>

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
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.adminLastName}
                    onChange={e => setFormData(prev => ({ ...prev, adminLastName: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.adminPhone}
                  onChange={e => setFormData(prev => ({ ...prev, adminPhone: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b border-slate-700 pb-2">AI Coach</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Coach Name</label>
                  <input
                    type="text"
                    value={formData.agentName}
                    onChange={e => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Voice</label>
                  <select
                    value={formData.voiceGender}
                    onChange={e => setFormData(prev => ({ ...prev, voiceGender: e.target.value as 'female' | 'male' }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
          {/* Steps */}
          <div className="mb-8">
            {steps.map((step, idx) => (
              <StepItem key={step.id} step={step} isLast={idx === steps.length - 1} />
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