'use client';
import { clientConfig } from '@/config';

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  User,
  DollarSign,
  Target,
  Globe,
  Briefcase,
  TrendingUp,
  Calculator,
  MessageSquare,
  CheckCircle2,
  Save
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth';


export default function InvestorProfilePage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [isSaving, setIsSaving] = useState(false)

  const { isLoading: authLoading, user } = useAuth({
    requireAuth: true,
    requiredRole: 'portal_admin',
  });

  // Profile state
  const [profile, setProfile] = useState({
    // Basic Info
    organizationName: '',
    investorType: '',
    websiteUrl: '',
    linkedinUrl: '',

    // Investment Parameters
    minTicketSize: '',
    maxTicketSize: '',
    stages: [] as string[],
    sectors: [] as string[],
    geographies: [] as string[],

    // Thesis & Philosophy
    investmentPhilosophy: '',
    dealBreakers: '',
    idealFounderProfile: '',

    // From Calculator (would be auto-populated)
    targetFinancialReturn: 8,
    targetImpactReturn: 4,
    prioritySDGs: [1, 4, 6, 11],

    // From AI Coach (would be auto-populated)
    coachInsights: [] as string[]
  })

  const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth', 'Late Stage']
  const SECTORS = [
    'Agriculture & Food',
    'Clean Energy',
    'Climate Tech',
    'Education',
    'Healthcare',
    'Financial Inclusion',
    'Water & Sanitation',
    'Sustainable Cities',
    'Circular Economy'
  ]
  const GEOGRAPHIES = [
    'Sub-Saharan Africa',
    'South Asia',
    'Southeast Asia',
    'Latin America',
    'Middle East & North Africa',
    'Australia & New Zealand',
    'Europe',
    'North America'
  ]

  const SDG_NAMES = {
    1: 'No Poverty',
    2: 'Zero Hunger',
    3: 'Good Health',
    4: 'Quality Education',
    5: 'Gender Equality',
    6: 'Clean Water',
    7: 'Clean Energy',
    8: 'Economic Growth',
    9: 'Infrastructure',
    10: 'Reduced Inequality',
    11: 'Sustainable Cities',
    13: 'Climate Action',
    15: 'Life on Land'
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item]
  }

  const handleSave = async () => {
    setIsSaving(true)
    // TODO: Save to database via API
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    alert('Profile saved successfully!')
  }

  const completionPercentage = () => {
    let completed = 0
    let total = 0

    // Basic info (4 fields)
    total += 4
    if (profile.organizationName) completed++
    if (profile.investorType) completed++
    if (profile.websiteUrl) completed++
    if (profile.linkedinUrl) completed++

    // Investment params (5 fields)
    total += 5
    if (profile.minTicketSize) completed++
    if (profile.maxTicketSize) completed++
    if (profile.stages.length > 0) completed++
    if (profile.sectors.length > 0) completed++
    if (profile.geographies.length > 0) completed++

    // Thesis (3 fields)
    total += 3
    if (profile.investmentPhilosophy) completed++
    if (profile.dealBreakers) completed++
    if (profile.idealFounderProfile) completed++

    return Math.round((completed / total) * 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold">Investment Thesis Profile</h1>
                <p className="text-sm text-muted-foreground">
                  {completionPercentage()}% complete
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/app/investor/dashboard">
                <Button variant="outline" size="sm">
                  Back to Dashboard
                </Button>
              </Link>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Progress Overview */}
        <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-2">Build Your Complete Investment Thesis</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Your profile combines structured data, calculator inputs, and AI coach insights
                  to create a holistic view of your investment criteria.
                </p>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Profile Form</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-purple-600" />
                    <Link href="/learn/impact-calculator" className="text-purple-600 hover:underline">
                      Calculator Data
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span>AI Coach Insights</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-blue-600">{completionPercentage()}%</div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="parameters">Investment Parameters</TabsTrigger>
            <TabsTrigger value="thesis">Thesis & Philosophy</TabsTrigger>
            <TabsTrigger value="calculator">Calculator Data</TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Tell us about your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="org-name">Organization Name *</Label>
                    <Input
                      id="org-name"
                      placeholder="Acme Impact Ventures"
                      value={profile.organizationName}
                      onChange={(e) => setProfile({...profile, organizationName: e.target.value})}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="investor-type">Investor Type *</Label>
                    <Input
                      id="investor-type"
                      placeholder="VC Fund, Angel, Family Office, etc."
                      value={profile.investorType}
                      onChange={(e) => setProfile({...profile, investorType: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://acmeimpact.com"
                      value={profile.websiteUrl}
                      onChange={(e) => setProfile({...profile, websiteUrl: e.target.value})}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="linkedin">LinkedIn Profile</Label>
                    <Input
                      id="linkedin"
                      type="url"
                      placeholder="https://linkedin.com/company/..."
                      value={profile.linkedinUrl}
                      onChange={(e) => setProfile({...profile, linkedinUrl: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Investment Parameters */}
          <TabsContent value="parameters" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Ticket Size & Stage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min-ticket">Minimum Ticket Size (USD)</Label>
                    <Input
                      id="min-ticket"
                      type="number"
                      placeholder="500000"
                      value={profile.minTicketSize}
                      onChange={(e) => setProfile({...profile, minTicketSize: e.target.value})}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="max-ticket">Maximum Ticket Size (USD)</Label>
                    <Input
                      id="max-ticket"
                      type="number"
                      placeholder="5000000"
                      value={profile.maxTicketSize}
                      onChange={(e) => setProfile({...profile, maxTicketSize: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block">Investment Stages *</Label>
                  <div className="flex flex-wrap gap-2">
                    {STAGES.map(stage => (
                      <Badge
                        key={stage}
                        variant={profile.stages.includes(stage) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setProfile({
                          ...profile,
                          stages: toggleArrayItem(profile.stages, stage)
                        })}
                      >
                        {stage}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Sectors & Industries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label className="mb-3 block">Select Your Focus Sectors *</Label>
                <div className="flex flex-wrap gap-2">
                  {SECTORS.map(sector => (
                    <Badge
                      key={sector}
                      variant={profile.sectors.includes(sector) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setProfile({
                        ...profile,
                        sectors: toggleArrayItem(profile.sectors, sector)
                      })}
                    >
                      {sector}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Geographic Focus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label className="mb-3 block">Where Do You Invest? *</Label>
                <div className="flex flex-wrap gap-2">
                  {GEOGRAPHIES.map(geo => (
                    <Badge
                      key={geo}
                      variant={profile.geographies.includes(geo) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setProfile({
                        ...profile,
                        geographies: toggleArrayItem(profile.geographies, geo)
                      })}
                    >
                      {geo}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Thesis & Philosophy */}
          <TabsContent value="thesis" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Investment Philosophy
                </CardTitle>
                <CardDescription>
                  Help founders understand your approach and values
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="philosophy">Investment Philosophy *</Label>
                  <Textarea
                    id="philosophy"
                    placeholder="Describe your investment approach, what drives your decisions, and what impact means to you..."
                    value={profile.investmentPhilosophy}
                    onChange={(e) => setProfile({...profile, investmentPhilosophy: e.target.value})}
                    className="mt-1 min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be visible to founders in your profile
                  </p>
                </div>

                <div>
                  <Label htmlFor="deal-breakers">Deal Breakers</Label>
                  <Textarea
                    id="deal-breakers"
                    placeholder="What are absolute no-gos? (e.g., certain business models, lack of traction, geographic restrictions...)"
                    value={profile.dealBreakers}
                    onChange={(e) => setProfile({...profile, dealBreakers: e.target.value})}
                    className="mt-1 min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Helps us filter out unsuitable matches
                  </p>
                </div>

                <div>
                  <Label htmlFor="ideal-founder">Ideal Founder Profile</Label>
                  <Textarea
                    id="ideal-founder"
                    placeholder="What characteristics do you look for in founders? (e.g., domain expertise, lived experience, technical background...)"
                    value={profile.idealFounderProfile}
                    onChange={(e) => setProfile({...profile, idealFounderProfile: e.target.value})}
                    className="mt-1 min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* AI Coach Insights (auto-populated) */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  AI Coach Insights
                </CardTitle>
                <CardDescription>
                  These insights are automatically extracted from your coaching conversations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile.coachInsights.length > 0 ? (
                  <ul className="space-y-2">
                    {profile.coachInsights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm mb-3">No AI coach insights yet</p>
                    <Link href="/app/investor/coaching">
                      <Button variant="outline" size="sm">
                        Start a Coaching Session
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Calculator Data */}
          <TabsContent value="calculator" className="space-y-6">
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-purple-600" />
                  Impact Calculator Results
                </CardTitle>
                <CardDescription>
                  Your quantitative investment thesis from the calculator
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Target Financial Return</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {profile.targetFinancialReturn}%
                    </div>
                    <div className="text-xs text-muted-foreground">Minimum cash IRR</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Target Impact Return</div>
                    <div className="text-3xl font-bold text-green-600">
                      {profile.targetImpactReturn}%
                    </div>
                    <div className="text-xs text-muted-foreground">Equivalent annual</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border-2 border-purple-300">
                    <div className="text-sm text-muted-foreground mb-1">Total Target</div>
                    <div className="text-3xl font-bold text-purple-600">
                      {profile.targetFinancialReturn + profile.targetImpactReturn}%
                    </div>
                    <div className="text-xs text-muted-foreground">Blended return</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <div className="font-semibold mb-3">Priority SDGs:</div>
                  <div className="flex flex-wrap gap-2">
                    {profile.prioritySDGs.map(sdgNum => (
                      <Badge key={sdgNum} variant="secondary" className="bg-purple-100">
                        SDG {sdgNum}: {SDG_NAMES[sdgNum as keyof typeof SDG_NAMES]}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-sm text-yellow-900">
                    <strong>💡 Update your calculator inputs:</strong> Visit the{' '}
                    <Link href="/learn/impact-calculator" className="text-purple-600 hover:underline font-semibold">
                      Impact Calculator
                    </Link>{' '}
                    to adjust your target returns and priority SDGs. Changes will automatically update your profile.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button (sticky bottom) */}
        <div className="sticky bottom-0 bg-white border-t mt-8 -mx-4 px-4 py-4 flex justify-end gap-3">
          <Link href="/app/investor/dashboard">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Investment Thesis'}
          </Button>
        </div>
      </div>
    </div>
  )
}

