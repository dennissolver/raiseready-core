'use client';

import { useState } from 'react';
import {
  Building2, User, Mic, Brain, CheckCircle, ArrowRight, ArrowLeft,
  Rocket, Loader2, Sparkles, Globe, Target, Users, Briefcase,
  Heart, Scale, TrendingUp, GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

// ============================================================================
// TYPES
// ============================================================================

type PlatformType = 'impact_investor' | 'commercial_investor' | 'family_office' | 'founder_service_provider';
type PlatformMode = 'screening' | 'coaching';

type Step =
  | 'platform_type'    // NEW: First step - choose platform type
  | 'company'
  | 'admin'
  | 'voice'
  | 'ai'
  | 'type_config'      // NEW: Type-specific configuration
  | 'review'
  | 'creating';

interface PlatformTypeOption {
  type: PlatformType;
  label: string;
  description: string;
  icon: React.ElementType;
  mode: PlatformMode;
  features: string[];
}

interface FormData {
  // Platform Type
  platformType: PlatformType;

  // Company Info
  companyName: string;
  companyWebsite: string;
  companyPhone: string;
  companyEmail: string;

  // Admin
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;

  // Voice Agent
  agentName: string;
  voiceGender: 'female' | 'male';
  voiceLanguage: string;
  voiceType: string;

  // AI
  llmProvider: 'claude' | 'chatgpt' | 'gemini' | 'grok';

  // Extracted (from website)
  extractedThesis: string;
  extractedColors: {
    primary: string;
    accent: string;
    background: string;
  };

  // === TYPE-SPECIFIC FIELDS ===

  // Impact Investor
  prioritySdgs: number[];
  targetFinancialReturn: number;
  targetImpactReturn: number;

  // Commercial Investor
  primaryMetrics: string[];
  minimumRevenue: string;
  preferredGrowthRate: string;

  // Family Office
  investmentHorizon: string;
  familyMission: string;
  legacyPriorities: string[];
  reputationSensitivity: string;
  decisionMakerType: string;
  involvementLevel: string;
  acceptsBelowMarketReturns: boolean;
  riskTolerance: string;

  // Service Provider
  serviceProviderType: string;
  targetClientStages: string[];
  targetClientSectors: string[];
  coachingFocusAreas: string[];
  referralTrackingEnabled: boolean;
}

interface CreationStatus {
  supabase: 'pending' | 'creating' | 'done' | 'error';
  vercel: 'pending' | 'creating' | 'done' | 'error';
  elevenlabs: 'pending' | 'creating' | 'done' | 'error';
  extraction: 'pending' | 'creating' | 'done' | 'error';
  github: 'pending' | 'creating' | 'done' | 'error';
  deployment: 'pending' | 'creating' | 'done' | 'error';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PLATFORM_TYPES: PlatformTypeOption[] = [
  {
    type: 'impact_investor',
    label: 'Impact Investor',
    description: 'SDG-aligned investing with RealChange Impact Index. Screen founders for financial returns AND measurable social/environmental impact.',
    icon: Heart,
    mode: 'screening',
    features: ['SDG Alignment Scoring', 'Blended Returns Calculator', 'Impact Thesis Matching', 'Theory of Change Analysis'],
  },
  {
    type: 'commercial_investor',
    label: 'Commercial Investor',
    description: 'Growth-focused investing with traditional metrics. Screen founders based on ARR, MRR, unit economics, and market opportunity.',
    icon: TrendingUp,
    mode: 'screening',
    features: ['Growth Metrics Analysis', 'Financial Health Scoring', 'Market Fit Assessment', 'Deal Flow Management'],
  },
  {
    type: 'family_office',
    label: 'Family Office',
    description: 'Values-aligned, long-term wealth stewardship. Screen founders for mission fit, reputation alignment, and generational value creation.',
    icon: Users,
    mode: 'screening',
    features: ['Values Alignment Scoring', 'Legacy Priority Matching', 'Long-term Fit Analysis', 'Reputation Risk Assessment'],
  },
  {
    type: 'founder_service_provider',
    label: 'Founder Service Provider',
    description: 'Pitch coaching for law firms, accelerators, and consultancies. Help your clients improve their pitch quality as a value-add service.',
    icon: GraduationCap,
    mode: 'coaching',
    features: ['Pitch Quality Scoring', 'AI Coaching Sessions', 'Progress Tracking', 'Client Portfolio Management'],
  },
];

const SDG_OPTIONS = [
  { value: 1, label: '1. No Poverty' },
  { value: 2, label: '2. Zero Hunger' },
  { value: 3, label: '3. Good Health' },
  { value: 4, label: '4. Quality Education' },
  { value: 5, label: '5. Gender Equality' },
  { value: 6, label: '6. Clean Water' },
  { value: 7, label: '7. Clean Energy' },
  { value: 8, label: '8. Decent Work' },
  { value: 9, label: '9. Industry & Innovation' },
  { value: 10, label: '10. Reduced Inequalities' },
  { value: 11, label: '11. Sustainable Cities' },
  { value: 12, label: '12. Responsible Consumption' },
  { value: 13, label: '13. Climate Action' },
  { value: 14, label: '14. Life Below Water' },
  { value: 15, label: '15. Life on Land' },
  { value: 16, label: '16. Peace & Justice' },
  { value: 17, label: '17. Partnerships' },
];

const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth'];
const SECTORS = ['FinTech', 'HealthTech', 'EdTech', 'CleanTech', 'AgTech', 'PropTech', 'DeepTech', 'SaaS', 'Marketplace', 'Consumer', 'Enterprise', 'Other'];

const SERVICE_PROVIDER_TYPES = [
  { value: 'law_firm', label: 'Law Firm' },
  { value: 'accelerator', label: 'Accelerator' },
  { value: 'incubator', label: 'Incubator' },
  { value: 'consultancy', label: 'Consultancy' },
  { value: 'advisory', label: 'Advisory Firm' },
  { value: 'accounting_firm', label: 'Accounting Firm' },
  { value: 'other', label: 'Other' },
];

const COACHING_FOCUS_AREAS = [
  { value: 'problem_solution_clarity', label: 'Problem/Solution Clarity' },
  { value: 'market_sizing', label: 'Market Sizing' },
  { value: 'business_model', label: 'Business Model' },
  { value: 'team_credibility', label: 'Team Credibility' },
  { value: 'ask_clarity', label: 'Ask & Use of Funds' },
  { value: 'competitive_positioning', label: 'Competitive Positioning' },
  { value: 'traction_evidence', label: 'Traction Evidence' },
  { value: 'storytelling', label: 'Storytelling & Narrative' },
  { value: 'visual_design', label: 'Visual Design' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function SetupWizard() {
  const [step, setStep] = useState<Step>('platform_type');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    platformType: 'impact_investor',
    companyName: '',
    companyWebsite: '',
    companyPhone: '',
    companyEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPhone: '',
    agentName: '',
    voiceGender: 'female',
    voiceLanguage: 'english',
    voiceType: 'professional',
    llmProvider: 'claude',
    extractedThesis: '',
    extractedColors: { primary: '#3B82F6', accent: '#10B981', background: '#0F172A' },

    // Impact Investor
    prioritySdgs: [],
    targetFinancialReturn: 8,
    targetImpactReturn: 4,

    // Commercial Investor
    primaryMetrics: ['arr', 'mrr', 'growth_rate'],
    minimumRevenue: '',
    preferredGrowthRate: '',

    // Family Office
    investmentHorizon: '10-20 years',
    familyMission: '',
    legacyPriorities: [],
    reputationSensitivity: 'moderate',
    decisionMakerType: 'single_principal',
    involvementLevel: 'advisory',
    acceptsBelowMarketReturns: false,
    riskTolerance: 'moderate',

    // Service Provider
    serviceProviderType: 'accelerator',
    targetClientStages: [],
    targetClientSectors: [],
    coachingFocusAreas: ['problem_solution_clarity', 'market_sizing', 'business_model', 'ask_clarity'],
    referralTrackingEnabled: false,
  });

  const [creationStatus, setCreationStatus] = useState<CreationStatus>({
    supabase: 'pending',
    vercel: 'pending',
    elevenlabs: 'pending',
    extraction: 'pending',
    github: 'pending',
    deployment: 'pending',
  });

  const [createdResources, setCreatedResources] = useState({
    supabaseUrl: '',
    supabaseProjectId: '',
    vercelUrl: '',
    vercelProjectId: '',
    elevenlabsAgentId: '',
    githubRepo: '',
  });

  // Get the selected platform config
  const selectedPlatform = PLATFORM_TYPES.find(p => p.type === formData.platformType);
  const isCoachingMode = selectedPlatform?.mode === 'coaching';

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  const updateForm = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayValue = (field: keyof FormData, value: any) => {
    setFormData(prev => {
      const arr = prev[field] as any[];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter(v => v !== value) };
      }
      return { ...prev, [field]: [...arr, value] };
    });
  };

  const validateStep = (currentStep: Step): boolean => {
    switch (currentStep) {
      case 'platform_type':
        return !!formData.platformType;
      case 'company':
        return !!(formData.companyName && formData.companyWebsite);
      case 'admin':
        return !!(formData.adminFirstName && formData.adminLastName && formData.adminEmail);
      case 'voice':
        return !!(formData.agentName && formData.voiceGender && formData.voiceLanguage);
      case 'ai':
        return !!formData.llmProvider;
      case 'type_config':
        // Validation varies by platform type
        if (formData.platformType === 'impact_investor') {
          return formData.prioritySdgs.length > 0;
        }
        if (formData.platformType === 'family_office') {
          return !!(formData.investmentHorizon && formData.decisionMakerType);
        }
        if (formData.platformType === 'founder_service_provider') {
          return !!(formData.serviceProviderType && formData.coachingFocusAreas.length > 0);
        }
        return true;
      default:
        return true;
    }
  };

  const getSteps = (): Step[] => {
    // Base steps
    return ['platform_type', 'company', 'admin', 'voice', 'ai', 'type_config', 'review', 'creating'];
  };

  const nextStep = () => {
    if (!validateStep(step)) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    const steps = getSteps();
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const prevStep = () => {
    const steps = getSteps();
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const extractFromWebsite = async () => {
    if (!formData.companyWebsite) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/setup/extract-from-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: formData.companyWebsite }),
      });
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({
          ...prev,
          extractedThesis: data.thesis?.philosophy || '',
          extractedColors: data.branding || prev.extractedColors,
        }));
      }
    } catch (err) {
      console.error('Failed to extract:', err);
    } finally {
      setIsLoading(false);
    }
  };

// Replace the existing startCreation function (around line 371) with this:

  const startCreation = async () => {
    setStep('creating');
    setError('');
    const projectSlug = formData.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Build platform-specific config to pass to APIs
    const platformConfig = {
      platformType: formData.platformType,
      platformMode: selectedPlatform?.mode || 'screening',
      usesSDGFramework: formData.platformType === 'impact_investor',
      usesImpactScoring: formData.platformType === 'impact_investor',
      usesFitScoring: formData.platformType !== 'founder_service_provider',
      usesPitchCoaching: true,
      usesInvestorMatching: formData.platformType !== 'founder_service_provider',

      // Type-specific configs
      ...(formData.platformType === 'impact_investor' && {
        prioritySdgs: formData.prioritySdgs,
        targetFinancialReturn: formData.targetFinancialReturn,
        targetImpactReturn: formData.targetImpactReturn,
      }),
      ...(formData.platformType === 'family_office' && {
        investmentHorizon: formData.investmentHorizon,
        familyMission: formData.familyMission,
        legacyPriorities: formData.legacyPriorities,
        reputationSensitivity: formData.reputationSensitivity,
        decisionMakerType: formData.decisionMakerType,
        involvementLevel: formData.involvementLevel,
        acceptsBelowMarketReturns: formData.acceptsBelowMarketReturns,
        riskTolerance: formData.riskTolerance,
      }),
      ...(formData.platformType === 'founder_service_provider' && {
        serviceProviderType: formData.serviceProviderType,
        targetClientStages: formData.targetClientStages,
        targetClientSectors: formData.targetClientSectors,
        coachingFocusAreas: formData.coachingFocusAreas,
        referralTrackingEnabled: formData.referralTrackingEnabled,
      }),
      ...(formData.platformType === 'commercial_investor' && {
        targetClientStages: formData.targetClientStages,
        targetClientSectors: formData.targetClientSectors,
        minimumRevenue: formData.minimumRevenue,
        preferredGrowthRate: formData.preferredGrowthRate,
      }),
    };

    // Local variables to store values (React state updates are async)
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
      }));
      console.log('Supabase project created:', supabaseProjectId);

      // Run migration
      console.log('Running migration...');
      try {
        await fetch('/api/setup/run-migration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectRef: supabaseProjectId,
            serviceKey: supabaseServiceKey,
            platformConfig,
          }),
        });
      } catch (migrationErr) {
        console.warn('Migration warning:', migrationErr);
      }

      setCreationStatus(prev => ({ ...prev, supabase: 'done', elevenlabs: 'creating' }));

      // ========== Step 2: Create ElevenLabs Agent ==========
      console.log('Creating ElevenLabs agent...');

      const elevenlabsRes = await fetch('/api/setup/create-elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: formData.agentName,
          voiceGender: formData.voiceGender,
          voiceLanguage: formData.voiceLanguage,
          voiceType: formData.voiceType,
          companyName: formData.companyName,
          platformType: formData.platformType,
        }),
      });

      if (elevenlabsRes.ok) {
        const elevenlabsData = await elevenlabsRes.json();
        elevenlabsAgentId = elevenlabsData.agentId;
        setCreatedResources(prev => ({ ...prev, elevenlabsAgentId }));
        console.log('ElevenLabs agent created:', elevenlabsAgentId);
      } else {
        console.warn('ElevenLabs creation failed, using default agent');
        elevenlabsAgentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || '';
      }

      setCreationStatus(prev => ({ ...prev, elevenlabs: 'done', github: 'creating' }));

      // ========== Step 3: Create GitHub Repository ==========
      console.log('Creating GitHub repository...');

      const githubRes = await fetch('/api/setup/create-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: projectSlug,
          formData: {
            companyName: formData.companyName,
            companyWebsite: formData.companyWebsite,
            companyPhone: formData.companyPhone,
            companyEmail: formData.companyEmail,
            adminFirstName: formData.adminFirstName,
            adminLastName: formData.adminLastName,
            adminEmail: formData.adminEmail,
            adminPhone: formData.adminPhone,
            agentName: formData.agentName,
            voiceGender: formData.voiceGender,
            voiceLanguage: formData.voiceLanguage,
            voiceType: formData.voiceType,
            llmProvider: formData.llmProvider,
            extractedThesis: formData.extractedThesis,
            extractedColors: formData.extractedColors,
          },
          createdResources: {
            supabaseUrl,
            supabaseProjectId,
            elevenlabsAgentId,
          },
          platformConfig,
        }),
      });

      if (!githubRes.ok) {
        const err = await githubRes.json();
        throw new Error(`GitHub: ${err.error || 'Failed to create repository'}`);
      }

      const githubData = await githubRes.json();
      githubRepoUrl = githubData.repoUrl;
      githubRepoName = githubData.repoName || projectSlug;

      setCreatedResources(prev => ({ ...prev, githubRepo: githubRepoUrl }));
      console.log('GitHub repo created:', githubRepoUrl);

      setCreationStatus(prev => ({ ...prev, github: 'done', vercel: 'creating' }));

      // ========== Step 4: Create Vercel Project ==========
      console.log('Creating Vercel project...');

      const vercelRes = await fetch('/api/setup/create-vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projectSlug,
          githubRepo: githubRepoName,
          framework: 'nextjs',
          envVars: {
            NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
            SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
            ELEVENLABS_AGENT_ID: elevenlabsAgentId,
            NEXT_PUBLIC_PLATFORM_TYPE: formData.platformType,
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

      setCreatedResources(prev => ({
        ...prev,
        vercelUrl,
        vercelProjectId,
      }));
      console.log('Vercel project created:', vercelUrl);

      setCreationStatus(prev => ({ ...prev, vercel: 'done', deployment: 'creating' }));

      // ========== Step 5: Configure Auth & Create Admin ==========
      console.log('Configuring Supabase auth...');

      // Configure auth redirect URLs
      try {
        await fetch('/api/setup/configure-supabase-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectRef: supabaseProjectId,
            siteUrl: vercelUrl,
          }),
        });
      } catch (authErr) {
        console.warn('Auth config warning:', authErr);
      }

      // Create admin user
      console.log('Creating admin user...');
      try {
        await fetch('/api/setup/create-admin-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supabaseUrl,
            serviceKey: supabaseServiceKey,
            email: formData.adminEmail,
            firstName: formData.adminFirstName,
            lastName: formData.adminLastName,
            companyName: formData.companyName,
            platformType: formData.platformType,
          }),
        });
      } catch (adminErr) {
        console.warn('Admin creation warning:', adminErr);
      }

      // Send welcome email
      console.log('Sending welcome email...');
      try {
        await fetch('/api/setup/send-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.adminEmail,
            firstName: formData.adminFirstName,
            companyName: formData.companyName,
            platformUrl: vercelUrl,
            platformType: formData.platformType,
          }),
        });
      } catch (emailErr) {
        console.warn('Email warning:', emailErr);
      }

      setCreationStatus(prev => ({ ...prev, deployment: 'done' }));
      console.log('✅ Platform creation complete!');

    } catch (error: any) {
      console.error('Creation failed:', error);
      setError(error.message || 'Failed to create platform. Check console for details.');

      // Mark current step as error
      setCreationStatus(prev => {
        const newStatus = { ...prev };
        const steps: (keyof CreationStatus)[] = ['supabase', 'elevenlabs', 'github', 'vercel', 'deployment'];
        for (const step of steps) {
          if (newStatus[step] === 'creating') {
            newStatus[step] = 'error';
            break;
          }
        }
        return newStatus;
      });
    }
  };

  // --------------------------------------------------------------------------
  // UI HELPERS
  // --------------------------------------------------------------------------

  const getStepClass = (isActive: boolean, isPast: boolean) => {
    if (isActive) return 'border-blue-500 bg-blue-500/20 text-blue-400';
    if (isPast) return 'border-green-500 bg-green-500/20 text-green-400';
    return 'border-gray-600 bg-transparent text-gray-500';
  };

  const getStatusClass = (status: string) => {
    if (status === 'creating') return 'bg-blue-500/10 border-blue-500/30';
    if (status === 'done') return 'bg-green-500/10 border-green-500/30';
    if (status === 'error') return 'bg-red-500/10 border-red-500/30';
    return 'bg-slate-800 border-slate-700';
  };

  const renderStatusIcon = (status: 'pending' | 'creating' | 'done' | 'error') => {
    if (status === 'pending') return <div className="w-5 h-5 rounded-full border-2 border-gray-600" />;
    if (status === 'creating') return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    if (status === 'done') return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">!</div>;
  };

  // Step indicators for progress bar
  const stepsList = [
    { key: 'platform_type', label: 'Type', icon: Target },
    { key: 'company', label: 'Company', icon: Building2 },
    { key: 'admin', label: 'Admin', icon: User },
    { key: 'voice', label: 'Voice', icon: Mic },
    { key: 'ai', label: 'AI', icon: Brain },
    { key: 'type_config', label: 'Config', icon: Briefcase },
    { key: 'review', label: 'Review', icon: CheckCircle },
  ];

  // --------------------------------------------------------------------------
  // RENDER STEPS
  // --------------------------------------------------------------------------

  const renderPlatformTypeStep = () => (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle>What type of platform are you creating?</CardTitle>
        <CardDescription>This determines the core functionality and user experience</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLATFORM_TYPES.map((platform) => {
            const Icon = platform.icon;
            const isSelected = formData.platformType === platform.type;
            return (
              <button
                key={platform.type}
                onClick={() => updateForm('platformType', platform.type)}
                className={`p-6 rounded-xl border-2 text-left transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${isSelected ? 'bg-blue-500/20' : 'bg-slate-700'}`}>
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{platform.label}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        platform.mode === 'screening' 
                          ? 'bg-purple-500/20 text-purple-300' 
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {platform.mode === 'screening' ? 'Screening' : 'Coaching'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{platform.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {platform.features.map((feature, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-slate-700 rounded text-gray-300">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedPlatform && (
          <div className={`mt-6 p-4 rounded-lg border ${
            isCoachingMode 
              ? 'bg-amber-500/10 border-amber-500/30' 
              : 'bg-purple-500/10 border-purple-500/30'
          }`}>
            <p className="text-sm">
              <strong className={isCoachingMode ? 'text-amber-400' : 'text-purple-400'}>
                {isCoachingMode ? 'Coaching Mode:' : 'Screening Mode:'}
              </strong>{' '}
              <span className="text-gray-300">
                {isCoachingMode
                  ? 'Founders will receive pitch improvement recommendations and coaching. No investor matching or fit scoring.'
                  : 'You will evaluate founders against your criteria and receive fit scores. Includes investor matching capabilities.'
                }
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderCompanyStep = () => (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle>
          {isCoachingMode ? 'Service Provider Details' : 'Investment Organization Details'}
        </CardTitle>
        <CardDescription>
          {isCoachingMode
            ? 'Tell us about your firm and we\'ll customize the platform for your clients'
            : 'Tell us about your organization and we\'ll extract your thesis and branding'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Organization Name *</Label>
            <Input
              value={formData.companyName}
              onChange={(e) => updateForm('companyName', e.target.value)}
              placeholder={isCoachingMode ? 'Acme Law Partners' : 'Impact Capital Partners'}
              className="bg-slate-800 border-slate-700"
            />
          </div>

          <div className="col-span-2">
            <Label>Website URL *</Label>
            <div className="flex gap-2">
              <Input
                value={formData.companyWebsite}
                onChange={(e) => updateForm('companyWebsite', e.target.value)}
                onBlur={() => {
                  if (formData.companyWebsite?.startsWith('http') && !formData.extractedThesis) {
                    extractFromWebsite();
                  }
                }}
                placeholder="https://example.com"
                className="bg-slate-800 border-slate-700 flex-1"
              />
              <Button
                variant="outline"
                onClick={extractFromWebsite}
                disabled={isLoading || !formData.companyWebsite}
                className="flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Extract
              </Button>
            </div>
          </div>

          <div>
            <Label>Phone</Label>
            <Input
              value={formData.companyPhone}
              onChange={(e) => updateForm('companyPhone', e.target.value)}
              placeholder="+1 555 123 4567"
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.companyEmail}
              onChange={(e) => updateForm('companyEmail', e.target.value)}
              placeholder="contact@example.com"
              className="bg-slate-800 border-slate-700"
            />
          </div>
        </div>

        {formData.extractedThesis && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <Label className="text-green-400 mb-2 block">Extracted Thesis</Label>
            <p className="text-sm text-gray-300">{formData.extractedThesis}</p>
          </div>
        )}

        {formData.extractedColors.primary !== '#3B82F6' && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Label className="text-blue-400 mb-2 block">Extracted Branding</Label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: formData.extractedColors.primary }} />
                <span className="text-sm text-gray-300">Primary</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: formData.extractedColors.accent }} />
                <span className="text-sm text-gray-300">Accent</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderAdminStep = () => (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle>Admin Account</CardTitle>
        <CardDescription>Primary administrator for the platform</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>First Name *</Label>
            <Input
              value={formData.adminFirstName}
              onChange={(e) => updateForm('adminFirstName', e.target.value)}
              placeholder="John"
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div>
            <Label>Last Name *</Label>
            <Input
              value={formData.adminLastName}
              onChange={(e) => updateForm('adminLastName', e.target.value)}
              placeholder="Smith"
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div className="col-span-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={formData.adminEmail}
              onChange={(e) => updateForm('adminEmail', e.target.value)}
              placeholder="john@example.com"
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div className="col-span-2">
            <Label>Phone (Optional)</Label>
            <Input
              value={formData.adminPhone}
              onChange={(e) => updateForm('adminPhone', e.target.value)}
              placeholder="+1 555 123 4567"
              className="bg-slate-800 border-slate-700"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderVoiceStep = () => (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle>Voice Coach Configuration</CardTitle>
        <CardDescription>
          {isCoachingMode
            ? 'Configure the AI voice coach that will help your clients practice their pitch'
            : 'Configure the AI voice coach for pitch practice and investor simulation'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Coach Name *</Label>
          <Input
            value={formData.agentName}
            onChange={(e) => updateForm('agentName', e.target.value)}
            placeholder="Sarah"
            className="bg-slate-800 border-slate-700"
          />
          <p className="text-xs text-gray-500 mt-1">The name founders will see when interacting with the coach</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Voice Gender *</Label>
            <Select value={formData.voiceGender} onValueChange={(v) => updateForm('voiceGender', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Language *</Label>
            <Select value={formData.voiceLanguage} onValueChange={(v) => updateForm('voiceLanguage', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="hindi">Hindi</SelectItem>
                <SelectItem value="spanish">Spanish</SelectItem>
                <SelectItem value="mandarin">Mandarin</SelectItem>
                <SelectItem value="french">French</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Voice Type</Label>
          <Select value={formData.voiceType} onValueChange={(v) => updateForm('voiceType', v)}>
            <SelectTrigger className="bg-slate-800 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="authoritative">Authoritative</SelectItem>
              <SelectItem value="energetic">Energetic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );

  const renderAiStep = () => (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle>AI Provider</CardTitle>
        <CardDescription>Choose the AI model that powers analysis and coaching</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: 'claude', label: 'Claude (Anthropic)', description: 'Recommended - Best for nuanced analysis', badge: 'Recommended' },
            { value: 'chatgpt', label: 'ChatGPT (OpenAI)', description: 'Popular choice with broad capabilities', badge: null },
            { value: 'gemini', label: 'Gemini (Google)', description: 'Strong multimodal capabilities', badge: null },
            { value: 'grok', label: 'Grok (xAI)', description: 'Real-time information access', badge: null },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateForm('llmProvider', option.value)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all text-left ${
                formData.llmProvider === option.value 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-4 h-4 mt-1 rounded-full border-2 flex items-center justify-center ${
                  formData.llmProvider === option.value 
                    ? 'border-blue-500 bg-blue-500' 
                    : 'border-gray-500'
                }`}>
                  {formData.llmProvider === option.value && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{option.label}</span>
                    {option.badge && (
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full">
                        {option.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderTypeConfigStep = () => {
    switch (formData.platformType) {
      case 'impact_investor':
        return renderImpactInvestorConfig();
      case 'commercial_investor':
        return renderCommercialInvestorConfig();
      case 'family_office':
        return renderFamilyOfficeConfig();
      case 'founder_service_provider':
        return renderServiceProviderConfig();
      default:
        return null;
    }
  };

  const renderImpactInvestorConfig = () => (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle>Impact Investment Criteria</CardTitle>
        <CardDescription>Configure your SDG priorities and return targets</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="mb-3 block">Priority SDGs * (Select up to 5)</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {SDG_OPTIONS.map((sdg) => (
              <label
                key={sdg.value}
                className={`p-3 rounded-lg border cursor-pointer transition-all text-sm ${
                  formData.prioritySdgs.includes(sdg.value)
                    ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                    : 'border-slate-700 bg-slate-800/50 text-gray-400 hover:border-slate-600'
                }`}
              >
                <Checkbox
                  checked={formData.prioritySdgs.includes(sdg.value)}
                  onCheckedChange={() => toggleArrayValue('prioritySdgs', sdg.value)}
                  className="sr-only"
                />
                {sdg.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Target Financial Return (%)</Label>
            <Input
              type="number"
              value={formData.targetFinancialReturn}
              onChange={(e) => updateForm('targetFinancialReturn', parseFloat(e.target.value))}
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div>
            <Label>Target Impact Return (%)</Label>
            <Input
              type="number"
              value={formData.targetImpactReturn}
              onChange={(e) => updateForm('targetImpactReturn', parseFloat(e.target.value))}
              className="bg-slate-800 border-slate-700"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-800 rounded-lg">
          <p className="text-sm text-gray-400">
            <strong className="text-white">Blended Return Target:</strong>{' '}
            {(formData.targetFinancialReturn + formData.targetImpactReturn).toFixed(1)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderCommercialInvestorConfig = () => (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle>Investment Criteria</CardTitle>
        <CardDescription>Configure your growth metrics and thresholds</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Preferred Stages</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {STAGES.map((stage) => (
              <button
                key={stage}
                onClick={() => toggleArrayValue('targetClientStages', stage)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  formData.targetClientStages.includes(stage)
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Preferred Sectors</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {SECTORS.map((sector) => (
              <button
                key={sector}
                onClick={() => toggleArrayValue('targetClientSectors', sector)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  formData.targetClientSectors.includes(sector)
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {sector}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Minimum ARR ($)</Label>
            <Input
              value={formData.minimumRevenue}
              onChange={(e) => updateForm('minimumRevenue', e.target.value)}
              placeholder="100,000"
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div>
            <Label>Preferred Growth Rate (%)</Label>
            <Input
              value={formData.preferredGrowthRate}
              onChange={(e) => updateForm('preferredGrowthRate', e.target.value)}
              placeholder="100"
              className="bg-slate-800 border-slate-700"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderFamilyOfficeConfig = () => (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle>Family Office Criteria</CardTitle>
        <CardDescription>Configure your values, horizon, and decision process</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Investment Horizon *</Label>
          <Select value={formData.investmentHorizon} onValueChange={(v) => updateForm('investmentHorizon', v)}>
            <SelectTrigger className="bg-slate-800 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3-5 years">3-5 Years</SelectItem>
              <SelectItem value="5-10 years">5-10 Years</SelectItem>
              <SelectItem value="10-20 years">10-20 Years</SelectItem>
              <SelectItem value="generational">Generational (20+ Years)</SelectItem>
              <SelectItem value="perpetual">Perpetual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Family Mission</Label>
          <Textarea
            value={formData.familyMission}
            onChange={(e) => updateForm('familyMission', e.target.value)}
            placeholder="e.g., Support education access in underserved communities while preserving generational wealth"
            className="bg-slate-800 border-slate-700"
            rows={3}
          />
        </div>

        <div>
          <Label>Legacy Priorities</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {['Education', 'Environment', 'Healthcare', 'Technology', 'Community', 'Arts & Culture'].map((priority) => (
              <button
                key={priority}
                onClick={() => toggleArrayValue('legacyPriorities', priority)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  formData.legacyPriorities.includes(priority)
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {priority}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Decision Maker Type *</Label>
            <Select value={formData.decisionMakerType} onValueChange={(v) => updateForm('decisionMakerType', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_principal">Single Principal</SelectItem>
                <SelectItem value="family_council">Family Council</SelectItem>
                <SelectItem value="investment_committee">Investment Committee</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Involvement Level</Label>
            <Select value={formData.involvementLevel} onValueChange={(v) => updateForm('involvementLevel', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passive">Passive (Capital Only)</SelectItem>
                <SelectItem value="advisory">Advisory</SelectItem>
                <SelectItem value="active_board">Active Board</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Reputation Sensitivity</Label>
            <Select value={formData.reputationSensitivity} onValueChange={(v) => updateForm('reputationSensitivity', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="paramount">Paramount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Risk Tolerance</Label>
            <Select value={formData.riskTolerance} onValueChange={(v) => updateForm('riskTolerance', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
                <SelectItem value="mission_dependent">Mission Dependent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.acceptsBelowMarketReturns}
            onCheckedChange={(v) => updateForm('acceptsBelowMarketReturns', v)}
          />
          <Label className="cursor-pointer">Accept below-market returns for strong mission alignment</Label>
        </div>
      </CardContent>
    </Card>
  );

  const renderServiceProviderConfig = () => (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle>Service Provider Configuration</CardTitle>
        <CardDescription>Configure how the coaching platform serves your clients</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Service Provider Type *</Label>
          <Select value={formData.serviceProviderType} onValueChange={(v) => updateForm('serviceProviderType', v)}>
            <SelectTrigger className="bg-slate-800 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_PROVIDER_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Target Client Stages</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {STAGES.map((stage) => (
              <button
                key={stage}
                onClick={() => toggleArrayValue('targetClientStages', stage)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  formData.targetClientStages.includes(stage)
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Target Client Sectors</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {SECTORS.map((sector) => (
              <button
                key={sector}
                onClick={() => toggleArrayValue('targetClientSectors', sector)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  formData.targetClientSectors.includes(sector)
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {sector}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Coaching Focus Areas *</Label>
          <p className="text-xs text-gray-500 mb-2">Select which dimensions to emphasize in pitch coaching</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {COACHING_FOCUS_AREAS.map((area) => (
              <label
                key={area.value}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  formData.coachingFocusAreas.includes(area.value)
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.coachingFocusAreas.includes(area.value)}
                    onCheckedChange={() => toggleArrayValue('coachingFocusAreas', area.value)}
                  />
                  <span className="text-sm text-gray-300">{area.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 p-4 bg-slate-800 rounded-lg">
          <Checkbox
            checked={formData.referralTrackingEnabled}
            onCheckedChange={(v) => updateForm('referralTrackingEnabled', v)}
          />
          <div>
            <Label className="cursor-pointer">Enable Investor Referral Tracking</Label>
            <p className="text-xs text-gray-500">Track when you refer coached founders to investors</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderReviewStep = () => (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle>Review & Create</CardTitle>
        <CardDescription>Confirm your configuration before creating the platform</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Platform Type */}
        <div className="p-4 bg-slate-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Platform Type</h4>
          <div className="flex items-center gap-3">
            {selectedPlatform && (
              <>
                <selectedPlatform.icon className="w-5 h-5 text-blue-400" />
                <span className="text-white font-medium">{selectedPlatform.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isCoachingMode ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/20 text-purple-300'
                }`}>
                  {isCoachingMode ? 'Coaching' : 'Screening'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Company */}
        <div className="p-4 bg-slate-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Organization</h4>
          <p className="text-white">{formData.companyName}</p>
          <p className="text-sm text-gray-400">{formData.companyWebsite}</p>
        </div>

        {/* Admin */}
        <div className="p-4 bg-slate-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Admin</h4>
          <p className="text-white">{formData.adminFirstName} {formData.adminLastName}</p>
          <p className="text-sm text-gray-400">{formData.adminEmail}</p>
        </div>

        {/* Voice */}
        <div className="p-4 bg-slate-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Voice Coach</h4>
          <p className="text-white">{formData.agentName}</p>
          <p className="text-sm text-gray-400">{formData.voiceGender} • {formData.voiceLanguage} • {formData.voiceType}</p>
        </div>

        {/* AI */}
        <div className="p-4 bg-slate-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400 mb-2">AI Provider</h4>
          <p className="text-white capitalize">{formData.llmProvider}</p>
        </div>

        {/* Type-specific summary */}
        {formData.platformType === 'impact_investor' && formData.prioritySdgs.length > 0 && (
          <div className="p-4 bg-slate-800 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Impact Criteria</h4>
            <p className="text-white">SDGs: {formData.prioritySdgs.map(s => `#${s}`).join(', ')}</p>
            <p className="text-sm text-gray-400">
              Target: {formData.targetFinancialReturn}% financial + {formData.targetImpactReturn}% impact
            </p>
          </div>
        )}

        {formData.platformType === 'family_office' && (
          <div className="p-4 bg-slate-800 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Family Office Criteria</h4>
            <p className="text-white">Horizon: {formData.investmentHorizon}</p>
            <p className="text-sm text-gray-400">Decision: {formData.decisionMakerType.replace('_', ' ')}</p>
            {formData.familyMission && (
              <p className="text-sm text-gray-400 mt-1">Mission: {formData.familyMission}</p>
            )}
          </div>
        )}

        {formData.platformType === 'founder_service_provider' && (
          <div className="p-4 bg-slate-800 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Service Provider Config</h4>
            <p className="text-white capitalize">{formData.serviceProviderType.replace('_', ' ')}</p>
            <p className="text-sm text-gray-400">
              {formData.coachingFocusAreas.length} coaching focus areas
            </p>
          </div>
        )}

        {/* What will be created */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h4 className="text-sm font-medium text-blue-400 mb-2">Will Be Created</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>✓ Supabase project with configured schema</li>
            <li>✓ ElevenLabs voice agent ({formData.agentName})</li>
            <li>✓ GitHub repository with customized code</li>
            <li>✓ Vercel deployment with your branding</li>
            <li>✓ Platform type: {selectedPlatform?.label}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  const renderCreatingStep = () => (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle>Creating Your Platform</CardTitle>
        <CardDescription>Please wait while we set everything up...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { key: 'supabase', label: 'Creating Supabase project', icon: Building2 },
            { key: 'elevenlabs', label: 'Creating voice agent', icon: Mic },
            { key: 'github', label: 'Setting up repository', icon: Globe },
            { key: 'vercel', label: 'Creating Vercel project', icon: Rocket },
            { key: 'deployment', label: 'Deploying platform', icon: CheckCircle },
          ].map((item) => {
            const status = creationStatus[item.key as keyof CreationStatus];
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${getStatusClass(status)}`}
              >
                {renderStatusIcon(status)}
                <Icon className="w-4 h-4 text-gray-400" />
                <span className={status === 'done' ? 'text-green-400' : 'text-gray-300'}>{item.label}</span>
                {status === 'done' && item.key === 'vercel' && createdResources.vercelUrl && (
                  <a href={createdResources.vercelUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-400 hover:underline text-sm">
                    View Site →
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {creationStatus.deployment === 'done' && (
          <div className="mt-6 p-6 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-green-400 mb-2">Platform Created!</h3>
            <p className="text-gray-300 mb-4">{formData.companyName}'s {selectedPlatform?.label} platform is now live.</p>
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <a href={createdResources.vercelUrl} target="_blank" rel="noopener noreferrer">Visit Platform</a>
              </Button>
              <Button variant="outline" asChild>
                <a href={createdResources.githubRepo} target="_blank" rel="noopener noreferrer">View Code</a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // --------------------------------------------------------------------------
  // MAIN RENDER
  // --------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-950 text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">RaiseReady White Label Setup</h1>
          <p className="text-gray-400">Create a new client platform in minutes</p>
        </div>

        {/* Progress Steps */}
        {step !== 'creating' && (
          <div className="flex justify-center mb-8 overflow-x-auto pb-2">
            <div className="flex items-center gap-2">
              {stepsList.map((s, i) => {
                const Icon = s.icon;
                const isActive = step === s.key;
                const isPast = stepsList.findIndex(x => x.key === step) > i;
                return (
                  <div key={s.key} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${getStepClass(isActive, isPast)}`}>
                      {isPast ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`ml-2 text-sm hidden sm:block ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                    {i < stepsList.length - 1 && (
                      <div className={`w-8 h-0.5 mx-2 ${isPast ? 'bg-green-500' : 'bg-gray-700'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Step Content */}
        {step === 'platform_type' && renderPlatformTypeStep()}
        {step === 'company' && renderCompanyStep()}
        {step === 'admin' && renderAdminStep()}
        {step === 'voice' && renderVoiceStep()}
        {step === 'ai' && renderAiStep()}
        {step === 'type_config' && renderTypeConfigStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'creating' && renderCreatingStep()}

        {/* Navigation */}
        {step !== 'creating' && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={step === 'platform_type'}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />Back
            </Button>
            {step === 'review' ? (
              <Button
                onClick={startCreation}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Rocket className="w-4 h-4" />Create Platform
              </Button>
            ) : (
              <Button onClick={nextStep} className="flex items-center gap-2">
                Next<ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}