import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ReadinessScoreProps {
  score: number
  level: 'not-ready' | 'needs-work' | 'ready' | 'investor-ready'
}

export function ReadinessScore({ score, level }: ReadinessScoreProps) {
  const getLevelColor = () => {
    switch (level) {
      case 'investor-ready':
        return 'bg-green-500'
      case 'ready':
        return 'bg-blue-500'
      case 'needs-work':
        return 'bg-yellow-500'
      default:
        return 'bg-red-500'
    }
  }

  const getLevelText = () => {
    switch (level) {
      case 'investor-ready':
        return 'Investor Ready'
      case 'ready':
        return 'Ready'
      case 'needs-work':
        return 'Needs Work'
      default:
        return 'Not Ready'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Readiness Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-4xl font-bold">{score}</div>
            <div className="text-sm text-muted-foreground">out of 100</div>
          </div>
          <Badge className={getLevelColor()}>
            {getLevelText()}
          </Badge>
        </div>
        <Progress value={score} className="h-3" />
      </CardContent>
    </Card>
  )
}
