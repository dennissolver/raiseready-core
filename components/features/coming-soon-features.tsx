import { clientConfig } from '@/config';
import { Sparkles, Video, History, Wand2, Users, Target, TrendingUp, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function ComingSoonFeatures() {
  const upcomingFeatures = [
    {
      icon: Video,
      title: "Live Video Pitch Sessions",
      description: "Practice your pitch with AI investors in real-time. Get instant feedback on delivery, pace, and body language.",
      badge: "Coming Q1 2026",
      priority: "high"
    },
    {
      icon: History,
      title: "Deck Version History",
      description: "Track improvements over time. Compare scores between versions and see exactly what changed.",
      badge: "Coming Soon",
      priority: "high"
    },
    {
      icon: Wand2,
      title: "AI Deck Regeneration",
      description: "Let AI rebuild weak slides based on your coaching insights. One-click improvements powered by your pitch conversations.",
      badge: "Q1 2026",
      priority: "high"
    },
    {
      icon: Target,
      title: "Investor Matching",
      description: "Get matched with investors who fund companies like yours. Based on stage, sector, geography, and impact alignment.",
      badge: "Q2 2026",
      priority: "medium"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Invite co-founders to practice together. Share coaching sessions and track who's improving fastest.",
      badge: "Q1 2026",
      priority: "medium"
    },
    {
      icon: TrendingUp,
      title: "Fundraising Progress Tracker",
      description: "Track your pipeline from first pitch to closed deal. See conversion rates and where you're losing momentum.",
      badge: "Q2 2026",
      priority: "medium"
    },
    {
      icon: Zap,
      title: "Real-Time Pitch Telepromter",
      description: "Practice mode that shows you what to say next, adapts to " + clientConfig.company.name + " questions, and keeps you on track.",
      badge: "Q3 2026",
      priority: "low"
    },
    {
      icon: Sparkles,
      title: "AI-Powered Slide Generator",
      description: "Describe your business in plain English. AI generates a complete investor deck in your brand style.",
      badge: "Q2 2026",
      priority: "low"
    }
  ]

  const priorityColors = {
    high: "bg-orange-100 text-orange-800 border-orange-300",
    medium: "bg-blue-100 text-blue-800 border-blue-300",
    low: "bg-gray-100 text-gray-800 border-gray-300"
  }

  return (
    <div className="mt-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-full border border-purple-200">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-900">Coming Soon</span>
        </div>
        <h2 className="text-3xl font-bold">What's Next for RaiseReady</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          We're building the most comprehensive fundraising platform for founders. Here's what's coming next.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {upcomingFeatures.map((feature, index) => {
          const Icon = feature.icon
          return (
            <Card key={index} className={`relative overflow-hidden transition-all hover:shadow-lg ${
              feature.priority === 'high' ? 'border-orange-200' : ''
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      feature.priority === 'high' ? 'bg-orange-100' : 'bg-blue-100'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        feature.priority === 'high' ? 'text-orange-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <Badge variant="outline" className={`mt-1 text-xs ${priorityColors[feature.priority as keyof typeof priorityColors]}`}>
                        {feature.badge}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
              {feature.priority === 'high' && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-400/10 to-transparent rounded-bl-full" />
              )}
            </Card>
          )
        })}
      </div>

      <div className="text-center pt-6">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Have a feature request?</strong> We're building for founders like you.{' '}
          <a href="mailto:feedback@raiseready.ai" className="text-primary hover:underline">
            Let us know what you need
          </a>
        </p>
      </div>
    </div>
  )
}