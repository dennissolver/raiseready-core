import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface ScoreBreakdownProps {
  scores: {
    problemClarity: number
    solutionFit: number
    marketOpportunity: number
    teamCredibility: number
    narrativeStrength: number
    financialViability: number
  }
}

const scoreLabels = {
  problemClarity: 'Problem Clarity',
  solutionFit: 'Solution Fit',
  marketOpportunity: 'Market Opportunity',
  teamCredibility: 'Team Credibility',
  narrativeStrength: 'Narrative Strength',
  financialViability: 'Financial Viability',
}

export function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pitch Readiness Scores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(scores).map(([key, value]) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {scoreLabels[key as keyof typeof scoreLabels]}
              </span>
              <span className="text-muted-foreground">{value}/100</span>
            </div>
            <Progress value={value} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}