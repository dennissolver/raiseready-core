'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Building2, User, Globe, Mic, Brain, CheckCircle, Loader2,
  ArrowRight, ArrowLeft, Sparkles, Database, Rocket
} from 'lucide-react';

type Step = 'company' | 'admin' | 'voice' | 'ai' | 'review' | 'creating';

interface FormData {
  companyName: string;
  companyWebsite: string;
  companyPhone: string;
  companyEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  agentName: string;
  voiceGender: 'female' | 'male';
  voiceLanguage: string;
  voiceType: string;
  llmProvider: 'claude' | 'chatgpt' | 'gemini' | 'grok';
  extractedThesis: string;
  extractedColors: { primary: string; accent: string; background: string };
}

interface CreationStatus {
  supabase: 'pending' | 'creating' | 'done' | 'error';
  vercel: 'pending' | 'creating' | 'done' | 'error';
  elevenlabs: 'pending' | 'creating' | 'done' | 'error';
  extraction: 'pending' | 'creating' | 'done' | 'error';
  github: 'pending' | 'creating' | 'done' | 'error';
  deployment: 'pending' | 'creating' | 'done' | 'error';
}

export default function SetupWizard() {
  const [step, setStep] = useState<Step>('company');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    companyName: '', companyWebsite: '', companyPhone: '', companyEmail: '',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPhone: '',
    agentName: '', voiceGender: 'female', voiceLanguage: 'english', voiceType: 'professional',
    llmProvider: 'claude', extractedThesis: '',
    extractedColors: { primary: '#3B82F6', accent: '#10B981', background: '#0F172A' },
  });

  const [creationStatus, setCreationStatus] = useState<CreationStatus>({
    supabase: 'pending', vercel: 'pending', elevenlabs: 'pending',
    extraction: 'pending', github: 'pending', deployment: 'pending',
  });

  // FIX 1: Added supabaseAnonKey and supabaseServiceKey to track credentials
  const [createdResources, setCreatedResources] = useState({
    supabaseUrl: '',
    supabaseProjectId: '',
    supabaseAnonKey: '',      // ← ADDED
    supabaseServiceKey: '',   // ← ADDED
    vercelUrl: '',
    vercelProjectId: '',
    elevenlabsAgentId: '',
    githubRepo: '',
    githubUrl: '',
  });

  const updateForm = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (currentStep: Step): boolean => {
    switch (currentStep) {
      case 'company': return !!(formData.companyName && formData.companyWebsite && formData.companyPhone);
      case 'admin': return !!(formData.adminFirstName && formData.adminLastName && formData.adminEmail);
      case 'voice': return !!(formData.agentName && formData.voiceGender && formData.voiceLanguage);
      case 'ai': return !!formData.llmProvider;
      default: return true;
    }
  };

  const nextStep = () => {
    if (!validateStep(step)) { setError('Please fill in all required fields'); return; }
    setError('');
    const steps: Step[] = ['company', 'admin', 'voice', 'ai', 'review', 'creating'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const prevStep = () => {
    const steps: Step[] = ['company', 'admin', 'voice', 'ai', 'review', 'creating'];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const extractFromWebsite = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/setup/extract-from-website', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    } catch (err) { console.error('Failed to extract:', err); }
    finally { setIsLoading(false); }
  };

  const startCreation = async () => {
    setStep('creating');
    const projectSlug = formData.companyName.toLowerCase().replace(/\s+/g, '-') + '-pitch';

    // FIX 2: Use local variables to track Supabase credentials through the async flow
    let supabaseUrl = '';
    let supabaseAnonKey = '';
    let supabaseServiceKey = '';
    let supabaseProjectId = '';

    // Step 1: Supabase
    setCreationStatus(prev => ({ ...prev, supabase: 'creating' }));
    try {
      const res = await fetch('/api/setup/create-supabase', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: projectSlug }),
      });
      if (res.ok) {
        const data = await res.json();
        // FIX 3: Capture ALL credentials from Supabase response
        supabaseUrl = data.url;
        supabaseAnonKey = data.anonKey;
        supabaseServiceKey = data.serviceKey;
        supabaseProjectId = data.projectId;

        setCreatedResources(prev => ({
          ...prev,
          supabaseUrl: data.url,
          supabaseProjectId: data.projectId,
          supabaseAnonKey: data.anonKey,        // ← ADDED
          supabaseServiceKey: data.serviceKey,  // ← ADDED
        }));
        setCreationStatus(prev => ({ ...prev, supabase: 'done' }));
      } else {
        setCreationStatus(prev => ({ ...prev, supabase: 'error' }));
        return; // Stop if Supabase fails - we need these credentials
      }
    } catch {
      setCreationStatus(prev => ({ ...prev, supabase: 'error' }));
      return; // Stop if Supabase fails
    }

    // Step 2: Extract
    setCreationStatus(prev => ({ ...prev, extraction: 'creating' }));
    try {
      const res = await fetch('/api/setup/extract-styles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: formData.companyWebsite }),
      });
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, extractedColors: data.theme?.colors || prev.extractedColors }));
      }
      setCreationStatus(prev => ({ ...prev, extraction: 'done' }));
    } catch { setCreationStatus(prev => ({ ...prev, extraction: 'done' })); }

    // Step 3: ElevenLabs
    let elevenlabsAgentId = '';
    setCreationStatus(prev => ({ ...prev, elevenlabs: 'creating' }));
    try {
      const res = await fetch('/api/setup/create-elevenlabs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: formData.agentName, voiceGender: formData.voiceGender,
          voiceLanguage: formData.voiceLanguage, voiceType: formData.voiceType, companyName: formData.companyName }),
      });
      if (res.ok) {
        const data = await res.json();
        elevenlabsAgentId = data.agentId;
        setCreatedResources(prev => ({ ...prev, elevenlabsAgentId: data.agentId }));
        setCreationStatus(prev => ({ ...prev, elevenlabs: 'done' }));
      } else { setCreationStatus(prev => ({ ...prev, elevenlabs: 'error' })); }
    } catch { setCreationStatus(prev => ({ ...prev, elevenlabs: 'error' })); }

    // Step 4: GitHub
    setCreationStatus(prev => ({ ...prev, github: 'creating' }));
    let githubRepoFullName = '';
    let githubRepoUrl = '';
    try {
      const res = await fetch('/api/setup/create-github', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // FIX: Pass local variables instead of stale state
        body: JSON.stringify({
          repoName: projectSlug,
          formData,
          createdResources: {
            supabaseUrl,
            supabaseProjectId,
            supabaseAnonKey,
            supabaseServiceKey,
            elevenlabsAgentId,
          }
        }),
      });
      if (res.ok) {
        const data = await res.json();
        githubRepoFullName = data.repoFullName || `dennissolver/${projectSlug}`;
        githubRepoUrl = data.repoUrl || `https://github.com/dennissolver/${projectSlug}`;
        setCreatedResources(prev => ({ ...prev, githubRepo: githubRepoFullName, githubUrl: githubRepoUrl }));
        setCreationStatus(prev => ({ ...prev, github: 'done' }));
      } else { setCreationStatus(prev => ({ ...prev, github: 'error' })); }
    } catch { setCreationStatus(prev => ({ ...prev, github: 'error' })); }

    // Step 5: Vercel
    setCreationStatus(prev => ({ ...prev, vercel: 'creating' }));
    try {
      const res = await fetch('/api/setup/create-vercel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projectSlug,
          githubRepo: githubRepoFullName,
          // FIX 4: Pass ALL Supabase credentials to Vercel
          envVars: {
            NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,      // ← ADDED
            SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,       // ← ADDED
            NEXT_PUBLIC_ELEVENLABS_AGENT_ID: elevenlabsAgentId,  // ← ADDED (bonus)
          }
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedResources(prev => ({ ...prev, vercelUrl: data.url, vercelProjectId: data.projectId }));
        setCreationStatus(prev => ({ ...prev, vercel: 'done' }));
      } else { setCreationStatus(prev => ({ ...prev, vercel: 'error' })); }
    } catch { setCreationStatus(prev => ({ ...prev, vercel: 'error' })); }

    setCreationStatus(prev => ({ ...prev, deployment: 'done' }));
  };

  const getStepClass = (isActive: boolean, isPast: boolean) => {
    if (isActive) return 'border-blue-500 bg-blue-500 text-white';
    if (isPast) return 'border-green-500 bg-green-500 text-white';
    return 'border-gray-600 text-gray-400';
  };

  const getStatusClass = (status: string) => {
    if (status === 'done') return 'bg-green-500/10 border-green-500/30';
    if (status === 'creating') return 'bg-blue-500/10 border-blue-500/30';
    if (status === 'error') return 'bg-red-500/10 border-red-500/30';
    return 'bg-slate-800 border-slate-700';
  };

  const renderStatusIcon = (status: 'pending' | 'creating' | 'done' | 'error') => {
    if (status === 'pending') return <div className="w-5 h-5 rounded-full border-2 border-gray-600" />;
    if (status === 'creating') return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    if (status === 'done') return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">!</div>;
  };

  const stepsList = [
    { key: 'company', label: 'Company', icon: Building2 },
    { key: 'admin', label: 'Admin', icon: User },
    { key: 'voice', label: 'Voice', icon: Mic },
    { key: 'ai', label: 'AI', icon: Brain },
    { key: 'review', label: 'Review', icon: CheckCircle },
  ];

  const currentStepIdx = stepsList.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">RaiseReady White-Label Setup</h1>
          <p className="text-gray-400">Create a new client pitch coaching platform</p>
        </div>

        {step !== 'creating' && (
          <div className="flex justify-center mb-8">
            {stepsList.map((s, idx) => {
              const Icon = s.icon;
              const isActive = s.key === step;
              const isPast = idx < currentStepIdx;
              return (
                <div key={s.key} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${getStepClass(isActive, isPast)}`}>
                    {isPast ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`ml-2 text-sm hidden md:inline ${isActive ? 'text-white' : 'text-gray-500'}`}>{s.label}</span>
                  {idx < stepsList.length - 1 && <div className={`w-12 h-0.5 mx-2 ${isPast ? 'bg-green-500' : 'bg-gray-700'}`} />}
                </div>
              );
            })}
          </div>
        )}

        {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">{error}</div>}

        {step === 'company' && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-500" />Company Information</CardTitle>
              <CardDescription>Enter the client company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input value={formData.companyName} onChange={(e) => updateForm('companyName', e.target.value)}
                    placeholder="Acme Ventures" className="bg-slate-800 border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label>Website URL *</Label>
                  <div className="flex gap-2">
                    <Input value={formData.companyWebsite} onChange={(e) => updateForm('companyWebsite', e.target.value)}
                      placeholder="https://acme.vc" className="bg-slate-800 border-slate-600" />
                    <Button variant="outline" onClick={extractFromWebsite} disabled={isLoading || !formData.companyWebsite}>
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input value={formData.companyPhone} onChange={(e) => updateForm('companyPhone', e.target.value)}
                    placeholder="+1 (555) 000-0000" className="bg-slate-800 border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input value={formData.companyEmail} onChange={(e) => updateForm('companyEmail', e.target.value)}
                    placeholder="contact@acme.vc" className="bg-slate-800 border-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'admin' && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-blue-500" />Admin Account</CardTitle>
              <CardDescription>Set up the primary administrator</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input value={formData.adminFirstName} onChange={(e) => updateForm('adminFirstName', e.target.value)}
                    placeholder="John" className="bg-slate-800 border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input value={formData.adminLastName} onChange={(e) => updateForm('adminLastName', e.target.value)}
                    placeholder="Smith" className="bg-slate-800 border-slate-600" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input value={formData.adminEmail} onChange={(e) => updateForm('adminEmail', e.target.value)}
                    placeholder="john@acme.vc" className="bg-slate-800 border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input value={formData.adminPhone} onChange={(e) => updateForm('adminPhone', e.target.value)}
                    placeholder="+1 (555) 000-0000" className="bg-slate-800 border-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'voice' && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Mic className="w-5 h-5 text-blue-500" />Voice Agent Setup</CardTitle>
              <CardDescription>Configure the AI voice coaching agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Agent Name *</Label>
                <Input value={formData.agentName} onChange={(e) => updateForm('agentName', e.target.value)}
                  placeholder="Sophie" className="bg-slate-800 border-slate-600" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Voice Gender *</Label>
                  <Select value={formData.voiceGender} onValueChange={(v: 'female' | 'male') => updateForm('voiceGender', v)}>
                    <SelectTrigger className="bg-slate-800 border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="female">Female</SelectItem><SelectItem value="male">Male</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language *</Label>
                  <Select value={formData.voiceLanguage} onValueChange={(v) => updateForm('voiceLanguage', v)}>
                    <SelectTrigger className="bg-slate-800 border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem><SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="french">French</SelectItem><SelectItem value="german">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Voice Type *</Label>
                  <Select value={formData.voiceType} onValueChange={(v) => updateForm('voiceType', v)}>
                    <SelectTrigger className="bg-slate-800 border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem><SelectItem value="friendly">Friendly & Warm</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem><SelectItem value="energetic">Energetic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg border border-slate-600">
                <p className="text-sm text-gray-300"><strong>Preview:</strong> "Hi, I'm {formData.agentName || '[Name]'}, your AI pitch coach at {formData.companyName || '[Company]'}!"</p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'ai' && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-blue-500" />AI Configuration</CardTitle>
              <CardDescription>Select the LLM provider for AI coaching</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{ id: 'claude', name: 'Claude', company: 'Anthropic', rec: true }, { id: 'chatgpt', name: 'ChatGPT', company: 'OpenAI', rec: false },
                  { id: 'gemini', name: 'Gemini', company: 'Google', rec: false }, { id: 'grok', name: 'Grok', company: 'xAI', rec: false }].map((llm) => (
                  <div key={llm.id} onClick={() => updateForm('llmProvider', llm.id)}
                    className={"p-4 rounded-lg border-2 cursor-pointer transition-all " + (formData.llmProvider === llm.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 bg-slate-800 hover:border-slate-500')}>
                    <div className="flex flex-col items-center text-center">
                      <Brain className={"w-8 h-8 mb-2 " + (formData.llmProvider === llm.id ? 'text-blue-500' : 'text-gray-400')} />
                      <span className="font-medium">{llm.name}</span>
                      <span className="text-xs text-gray-400">{llm.company}</span>
                      {llm.rec && <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/50">Recommended</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'review' && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-500" />Review & Create</CardTitle>
              <CardDescription>Confirm all details before creating the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div><h4 className="text-sm font-medium text-gray-400 mb-2">Company</h4>
                    <div className="bg-slate-800 p-4 rounded-lg space-y-1">
                      <p><strong>Name:</strong> {formData.companyName}</p>
                      <p><strong>Website:</strong> {formData.companyWebsite}</p>
                      <p><strong>Phone:</strong> {formData.companyPhone}</p>
                    </div>
                  </div>
                  <div><h4 className="text-sm font-medium text-gray-400 mb-2">Admin</h4>
                    <div className="bg-slate-800 p-4 rounded-lg space-y-1">
                      <p><strong>Name:</strong> {formData.adminFirstName} {formData.adminLastName}</p>
                      <p><strong>Email:</strong> {formData.adminEmail}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div><h4 className="text-sm font-medium text-gray-400 mb-2">Voice Agent</h4>
                    <div className="bg-slate-800 p-4 rounded-lg"><p><strong>Name:</strong> {formData.agentName} ({formData.voiceGender}, {formData.voiceLanguage})</p></div>
                  </div>
                  <div><h4 className="text-sm font-medium text-gray-400 mb-2">AI Provider</h4>
                    <div className="bg-slate-800 p-4 rounded-lg"><p><strong>LLM:</strong> {formData.llmProvider}</p></div>
                  </div>
                  <div><h4 className="text-sm font-medium text-gray-400 mb-2">Branding</h4>
                    <div className="bg-slate-800 p-4 rounded-lg flex gap-4">
                      <div className="flex items-center gap-2"><div className="w-8 h-8 rounded" style={{ backgroundColor: formData.extractedColors.primary }} /><span className="text-sm">Primary</span></div>
                      <div className="flex items-center gap-2"><div className="w-8 h-8 rounded" style={{ backgroundColor: formData.extractedColors.accent }} /><span className="text-sm">Accent</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h4 className="font-medium text-blue-400 mb-2">What will be created:</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Supabase project with database schema</li>
                  <li>• Vercel deployment with environment variables</li>
                  <li>• ElevenLabs voice agent ({formData.agentName})</li>
                  <li>• GitHub repository with customized code</li>
                  <li>• Platform URL: {formData.companyName.toLowerCase().replace(/\s+/g, '-')}-pitch.vercel.app</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'creating' && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Rocket className="w-5 h-5 text-blue-500" />Creating Platform</CardTitle>
              <CardDescription>Please wait while we set everything up...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[{ key: 'supabase', label: 'Creating Supabase project', icon: Database },
                  { key: 'extraction', label: 'Extracting branding & thesis', icon: Sparkles },
                  { key: 'elevenlabs', label: 'Creating ElevenLabs agent', icon: Mic },
                  { key: 'github', label: 'Creating GitHub repository', icon: Globe },
                  { key: 'vercel', label: 'Deploying to Vercel', icon: Rocket }].map((item) => {
                  const Icon = item.icon;
                  const status = creationStatus[item.key as keyof CreationStatus];
                  return (
                    <div key={item.key} className={"flex items-center gap-4 p-4 rounded-lg border " + getStatusClass(status)}>
                      {renderStatusIcon(status)}
                      <Icon className="w-5 h-5 text-gray-400" />
                      <span className={status === 'done' ? 'text-green-400' : 'text-gray-300'}>{item.label}</span>
                      {status === 'done' && item.key === 'vercel' && createdResources.vercelUrl && (
                        <a href={createdResources.vercelUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-400 hover:underline text-sm">View Site →</a>
                      )}
                    </div>
                  );
                })}
              </div>
              {creationStatus.deployment === 'done' && (
                <div className="mt-6 p-6 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-400 mb-2">Platform Created!</h3>
                  <p className="text-gray-300 mb-4">{formData.companyName}'s pitch platform is now live.</p>
                  <div className="flex gap-4 justify-center">
                    <Button asChild><a href={createdResources.vercelUrl} target="_blank" rel="noopener noreferrer">Visit Platform</a></Button>
                    <Button variant="outline" asChild><a href={createdResources.githubUrl || createdResources.githubRepo} target="_blank" rel="noopener noreferrer">View Code</a></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step !== 'creating' && (
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={prevStep} disabled={step === 'company'} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />Back
            </Button>
            {step === 'review' ? (
              <Button onClick={startCreation} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                <Rocket className="w-4 h-4" />Create Platform
              </Button>
            ) : (
              <Button onClick={nextStep} className="flex items-center gap-2">Next<ArrowRight className="w-4 h-4" /></Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}