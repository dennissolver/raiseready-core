// app/founder/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, User, Building2, Target, DollarSign, CheckCircle } from 'lucide-react';

const SECTOR_OPTIONS = [
  { value: 'technology', label: 'Technology' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'healthtech', label: 'Healthcare / HealthTech' },
  { value: 'edtech', label: 'EdTech' },
  { value: 'ecommerce', label: 'E-Commerce / D2C' },
  { value: 'saas', label: 'SaaS / B2B' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'cleantech', label: 'CleanTech / Climate' },
  { value: 'agritech', label: 'AgriTech' },
  { value: 'logistics', label: 'Logistics / Supply Chain' },
  { value: 'media', label: 'Media / Entertainment' },
  { value: 'ai', label: 'AI / ML' },
  { value: 'other', label: 'Other' },
];

const FUNDING_STAGES = [
  { value: 'pre-seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b', label: 'Series B' },
  { value: 'series-c', label: 'Series C+' },
];

const FOUNDER_TYPES = [
  { value: 'first-time', label: 'First-time Founder' },
  { value: 'serial', label: 'Serial Entrepreneur' },
  { value: 'technical', label: 'Technical Founder' },
  { value: 'domain-expert', label: 'Domain Expert' },
  { value: 'corporate', label: 'Corporate Background' },
];

export default function FounderProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  const supabase = createClient();
  const { toast } = useToast();
  const { isLoading: authLoading, user } = useAuth({
    requireAuth: true,
    requiredRole: 'founder',
  });

  const [formData, setFormData] = useState({
    // Personal
    name: '',
    email: '',
    country: '',
    founder_type: '',

    // Company
    company_name: '',
    tagline: '',
    target_market: '',
    team_size: '',
    sectors: [] as string[],

    // Story (replaces SDG focus)
    problem_statement: '',
    solution_statement: '',
    traction_details: '',
    team_background: '',

    // Funding
    funding_ask_stage: '',
    funding_ask_amount: '',
    use_of_funds: '',

    // Flags
    has_revenue: false,
    has_customers: false,
    has_prototype: false,
    has_domain_expertise: false,
    has_startup_experience: false,
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);

      const { data: founderData, error } = await supabase
        .from('founders')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (founderData) {
        setFormData({
          name: founderData.name || '',
          email: founderData.email || user?.email || '',
          country: founderData.country || '',
          founder_type: founderData.founder_type || '',
          company_name: founderData.company_name || '',
          tagline: founderData.tagline || '',
          target_market: founderData.target_market || '',
          team_size: founderData.team_size?.toString() || '',
          sectors: [], // Will be loaded from pitch_decks if needed
          problem_statement: founderData.problem_statement || '',
          solution_statement: founderData.solution_statement || '',
          traction_details: founderData.traction_details || '',
          team_background: founderData.team_background || '',
          funding_ask_stage: founderData.funding_ask_stage || '',
          funding_ask_amount: founderData.funding_ask_amount || '',
          use_of_funds: founderData.use_of_funds || '',
          has_revenue: founderData.has_revenue || false,
          has_customers: founderData.has_customers || false,
          has_prototype: founderData.has_prototype || false,
          has_domain_expertise: founderData.has_domain_expertise || false,
          has_startup_experience: founderData.has_startup_experience || false,
        });
      } else {
        // New user - prefill email
        setFormData(prev => ({
          ...prev,
          email: user?.email || '',
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const profileData = {
        id: user?.id,
        email: formData.email,
        name: formData.name,
        country: formData.country,
        founder_type: formData.founder_type,
        company_name: formData.company_name,
        tagline: formData.tagline,
        target_market: formData.target_market,
        team_size: formData.team_size ? parseInt(formData.team_size) : null,
        problem_statement: formData.problem_statement,
        solution_statement: formData.solution_statement,
        traction_details: formData.traction_details,
        team_background: formData.team_background,
        funding_ask_stage: formData.funding_ask_stage,
        funding_ask_amount: formData.funding_ask_amount,
        use_of_funds: formData.use_of_funds,
        has_revenue: formData.has_revenue,
        has_customers: formData.has_customers,
        has_prototype: formData.has_prototype,
        has_domain_expertise: formData.has_domain_expertise,
        has_startup_experience: formData.has_startup_experience,
        profile_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('founders')
        .upsert(profileData);

      if (error) throw error;

      toast({
        title: 'Profile Saved',
        description: 'Your profile has been updated successfully',
      });

      // Move to next section if not on last
      if (activeSection < sections.length - 1) {
        setActiveSection(activeSection + 1);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    {
      title: 'About You',
      icon: User,
      fields: ['name', 'email', 'country', 'founder_type'],
    },
    {
      title: 'Your Company',
      icon: Building2,
      fields: ['company_name', 'tagline', 'target_market', 'team_size'],
    },
    {
      title: 'Your Story',
      icon: Target,
      fields: ['problem_statement', 'solution_statement', 'traction_details', 'team_background'],
    },
    {
      title: 'Funding Goals',
      icon: DollarSign,
      fields: ['funding_ask_stage', 'funding_ask_amount', 'use_of_funds'],
    },
  ];

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Complete Your Profile</h1>
          <p className="text-muted-foreground mt-1">
            Help us understand your startup story better
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {sections.map((section, index) => (
            <button
              key={section.title}
              onClick={() => setActiveSection(index)}
              className="flex flex-col items-center gap-2 flex-1"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  index <= activeSection
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index < activeSection ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <section.icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  index <= activeSection ? 'text-primary' : 'text-gray-500'
                }`}
              >
                {section.title}
              </span>
            </button>
          ))}
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const Icon = sections[activeSection].icon;
                return <Icon className="w-5 h-5 text-primary" />;
              })()}
              {sections[activeSection].title}
            </CardTitle>
            <CardDescription>
              {activeSection === 0 && 'Tell us about yourself'}
              {activeSection === 1 && 'Describe your company'}
              {activeSection === 2 && 'Share your startup story - this is what investors remember'}
              {activeSection === 3 && 'What are you raising and how will you use it?'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Section 0: About You */}
            {activeSection === 0 && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="India"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="founder_type">Founder Type</Label>
                    <Select
                      value={formData.founder_type}
                      onValueChange={(value) => setFormData({ ...formData, founder_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {FOUNDER_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Experience Flags</Label>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has_startup_experience"
                        checked={formData.has_startup_experience}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, has_startup_experience: !!checked })
                        }
                      />
                      <label htmlFor="has_startup_experience" className="text-sm">
                        Previous startup experience
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has_domain_expertise"
                        checked={formData.has_domain_expertise}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, has_domain_expertise: !!checked })
                        }
                      />
                      <label htmlFor="has_domain_expertise" className="text-sm">
                        Domain expertise in this sector
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Section 1: Your Company */}
            {activeSection === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Your startup name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline / One-liner *</Label>
                  <Input
                    id="tagline"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="Uber for X, Airbnb for Y..."
                  />
                  <p className="text-xs text-muted-foreground">
                    A memorable one-liner that explains what you do
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_market">Target Market</Label>
                    <Input
                      id="target_market"
                      value={formData.target_market}
                      onChange={(e) => setFormData({ ...formData, target_market: e.target.value })}
                      placeholder="India, Southeast Asia, Global..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team_size">Team Size</Label>
                    <Input
                      id="team_size"
                      type="number"
                      value={formData.team_size}
                      onChange={(e) => setFormData({ ...formData, team_size: e.target.value })}
                      placeholder="5"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Traction Indicators</Label>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has_prototype"
                        checked={formData.has_prototype}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, has_prototype: !!checked })
                        }
                      />
                      <label htmlFor="has_prototype" className="text-sm">
                        Working prototype/MVP
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has_customers"
                        checked={formData.has_customers}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, has_customers: !!checked })
                        }
                      />
                      <label htmlFor="has_customers" className="text-sm">
                        Active customers/users
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has_revenue"
                        checked={formData.has_revenue}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, has_revenue: !!checked })
                        }
                      />
                      <label htmlFor="has_revenue" className="text-sm">
                        Generating revenue
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Section 2: Your Story */}
            {activeSection === 2 && (
              <>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-primary font-medium">
                    💡 Your story is what investors remember. Be specific, be authentic, be memorable.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="problem_statement">The Problem *</Label>
                  <Textarea
                    id="problem_statement"
                    value={formData.problem_statement}
                    onChange={(e) => setFormData({ ...formData, problem_statement: e.target.value })}
                    placeholder="What's the pain point you're solving? Who experiences it? How big is it?"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="solution_statement">Your Solution *</Label>
                  <Textarea
                    id="solution_statement"
                    value={formData.solution_statement}
                    onChange={(e) => setFormData({ ...formData, solution_statement: e.target.value })}
                    placeholder="How does your product solve this problem? What's your unique approach?"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="traction_details">Traction & Milestones</Label>
                  <Textarea
                    id="traction_details"
                    value={formData.traction_details}
                    onChange={(e) => setFormData({ ...formData, traction_details: e.target.value })}
                    placeholder="Key metrics, growth numbers, notable customers, partnerships..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team_background">Team Story</Label>
                  <Textarea
                    id="team_background"
                    value={formData.team_background}
                    onChange={(e) => setFormData({ ...formData, team_background: e.target.value })}
                    placeholder="Why is YOUR team the right one to solve this problem?"
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Section 3: Funding Goals */}
            {activeSection === 3 && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="funding_ask_stage">Funding Stage *</Label>
                    <Select
                      value={formData.funding_ask_stage}
                      onValueChange={(value) => setFormData({ ...formData, funding_ask_stage: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {FUNDING_STAGES.map((stage) => (
                          <SelectItem key={stage.value} value={stage.value}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="funding_ask_amount">Raise Amount *</Label>
                    <Input
                      id="funding_ask_amount"
                      value={formData.funding_ask_amount}
                      onChange={(e) => setFormData({ ...formData, funding_ask_amount: e.target.value })}
                      placeholder="$500K, ₹5 Cr..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="use_of_funds">Use of Funds *</Label>
                  <Textarea
                    id="use_of_funds"
                    value={formData.use_of_funds}
                    onChange={(e) => setFormData({ ...formData, use_of_funds: e.target.value })}
                    placeholder="How will you allocate this funding? Product development, hiring, marketing..."
                    rows={4}
                  />
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
                disabled={activeSection === 0}
              >
                Previous
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {activeSection === sections.length - 1 ? 'Save Profile' : 'Save & Continue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
