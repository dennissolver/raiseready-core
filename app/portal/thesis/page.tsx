'use client';
// app/portal/thesis/page.tsx

import { clientConfig } from '@/config';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  Target,
  Globe,
  DollarSign,
  Users,
  Sparkles,
  Save,
  Edit2,
  CheckCircle,
  Building2,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';

type PortalThesis = {
  id: string;
  name: string;
  firm: string;
  organization_name: string;
  focus_areas: string[];
  sectors: string[];
  stages: string[];
  geographies: string[];
  min_ticket_size: number | null;
  max_ticket_size: number | null;
  investment_philosophy: string;
  ideal_founder_profile: string;
  deal_breakers: string;
  preferences: any;
  updated_at: string;
};

export default function PortalThesisPage() {
  const [thesis, setThesis] = useState<PortalThesis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PortalThesis>>({});

  const supabase = createClient();
  const { toast } = useToast();
  const { isLoading: authLoading } = useAuth({
    requireAuth: true,
    requiredRole: 'portal_admin',
  });

  // Get config-driven labels
  const { company, platformTypeConfig } = clientConfig;
  const thesisLabel = platformTypeConfig?.thesisLabel || 'Investment Thesis';
  const founderLabel = platformTypeConfig?.founderLabel || 'Founder';

  useEffect(() => {
    loadThesis();
  }, []);

  const loadThesis = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('investor_profiles')
        .select('*')
        .single();

      if (error) throw error;

      setThesis(data);
      setEditForm(data);
    } catch (error) {
      console.error('Error loading thesis:', error);
      toast({
        title: 'Error',
        description: `Failed to load ${thesisLabel.toLowerCase()}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!thesis) return;

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('investor_profiles')
        .update({
          focus_areas: editForm.focus_areas,
          sectors: editForm.sectors,
          stages: editForm.stages,
          geographies: editForm.geographies,
          investment_philosophy: editForm.investment_philosophy,
          ideal_founder_profile: editForm.ideal_founder_profile,
          deal_breakers: editForm.deal_breakers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', thesis.id);

      if (error) throw error;

      setThesis({ ...thesis, ...editForm });
      setIsEditing(false);

      toast({
        title: 'Saved',
        description: `${thesisLabel} updated successfully`,
      });
    } catch (error) {
      console.error('Error saving thesis:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateArrayField = (field: keyof PortalThesis, value: string) => {
    const items = value.split(',').map(s => s.trim()).filter(Boolean);
    setEditForm({ ...editForm, [field]: items });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!thesis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No {thesisLabel} Found</h2>
            <p className="text-muted-foreground mb-4">
              Complete the AI Discovery session to define your criteria.
            </p>
            <Link href="/portal/discovery">
              <Button>
                <Sparkles className="w-4 h-4 mr-2" />
                Start Discovery
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-700 bg-clip-text text-transparent">
              {thesisLabel}
            </h1>
            <p className="text-muted-foreground mt-1">
              Your criteria for evaluating {founderLabel.toLowerCase()} submissions
            </p>
          </div>

          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit {thesisLabel}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                setEditForm(thesis);
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>

        {/* Thesis Complete Badge */}
        {thesis.investment_philosophy && (
          <div className="mb-6 flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            {thesisLabel} configured via AI Discovery
            <Link href="/portal/discovery" className="text-primary hover:underline ml-2">
              Refine with AI →
            </Link>
          </div>
        )}

        <div className="space-y-6">
          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-lg font-semibold">{thesis.organization_name || thesis.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Firm</label>
                  <p className="text-lg">{thesis.firm || company.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Focus Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Focus Areas
              </CardTitle>
              <CardDescription>What you specialize in helping {founderLabel.toLowerCase()}s with</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Input
                  placeholder="Storytelling, Fundraising Strategy, Investor Relations"
                  value={editForm.focus_areas?.join(', ') || ''}
                  onChange={(e) => updateArrayField('focus_areas', e.target.value)}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {thesis.focus_areas?.map((area) => (
                    <Badge key={area} variant="secondary" className="text-sm">
                      {area}
                    </Badge>
                  )) || <span className="text-muted-foreground">Not specified</span>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sectors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Target Sectors
              </CardTitle>
              <CardDescription>Industries you focus on</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Input
                  placeholder="Technology, Consumer, Healthcare, Fintech, EdTech"
                  value={editForm.sectors?.join(', ') || ''}
                  onChange={(e) => updateArrayField('sectors', e.target.value)}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {thesis.sectors?.map((sector) => (
                    <Badge key={sector} variant="outline" className="text-sm">
                      {sector}
                    </Badge>
                  )) || <span className="text-muted-foreground">All sectors</span>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Funding Stages
              </CardTitle>
              <CardDescription>Stages you work with</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Input
                  placeholder="Pre-Seed, Seed, Series A, Series B"
                  value={editForm.stages?.join(', ') || ''}
                  onChange={(e) => updateArrayField('stages', e.target.value)}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {thesis.stages?.map((stage) => (
                    <Badge key={stage} className="text-sm bg-primary/10 text-primary border-0">
                      {stage}
                    </Badge>
                  )) || <span className="text-muted-foreground">All stages</span>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Geographies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Geographic Focus
              </CardTitle>
              <CardDescription>Regions you focus on</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Input
                  placeholder="India, Southeast Asia, Global"
                  value={editForm.geographies?.join(', ') || ''}
                  onChange={(e) => updateArrayField('geographies', e.target.value)}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {thesis.geographies?.map((geo) => (
                    <Badge key={geo} variant="outline" className="text-sm">
                      {geo}
                    </Badge>
                  )) || <span className="text-muted-foreground">Global</span>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Philosophy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Philosophy
              </CardTitle>
              <CardDescription>Your approach and what you believe in</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  placeholder="Describe your philosophy..."
                  value={editForm.investment_philosophy || ''}
                  onChange={(e) => setEditForm({ ...editForm, investment_philosophy: e.target.value })}
                  rows={4}
                />
              ) : (
                <p className="text-sm leading-relaxed">
                  {thesis.investment_philosophy || 'Not specified'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Ideal Founder Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Ideal {founderLabel} Profile
              </CardTitle>
              <CardDescription>What you look for in {founderLabel.toLowerCase()}s</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  placeholder={`Describe the ideal ${founderLabel.toLowerCase()} you want to work with...`}
                  value={editForm.ideal_founder_profile || ''}
                  onChange={(e) => setEditForm({ ...editForm, ideal_founder_profile: e.target.value })}
                  rows={4}
                />
              ) : (
                <p className="text-sm leading-relaxed">
                  {thesis.ideal_founder_profile || 'Not specified'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Deal Breakers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                Deal Breakers
              </CardTitle>
              <CardDescription>What makes you pass on a {founderLabel.toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  placeholder="What are your deal breakers..."
                  value={editForm.deal_breakers || ''}
                  onChange={(e) => setEditForm({ ...editForm, deal_breakers: e.target.value })}
                  rows={3}
                />
              ) : (
                <p className="text-sm leading-relaxed">
                  {thesis.deal_breakers || 'Not specified'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Refinement CTA */}
        <Card className="mt-8 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Refine with AI Discovery</h3>
                <p className="text-sm text-muted-foreground">
                  Have a conversation with AI to better define your criteria
                </p>
              </div>
              <Link href="/portal/discovery">
                <Button>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Discovery Session
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
