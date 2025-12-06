'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WatchlistButton } from '@/components/watchlist/watchlist-button';
import {
  Target,
  TrendingUp,
  MapPin,
  Calendar,
  ExternalLink,
  Eye
} from 'lucide-react';
import Link from 'next/link';

import { Database } from '@/types/supabase';

type Project = Database['public']['Tables']['pitch_decks']['Row'];

interface ProjectCardProps {
  project: Project;
  isPublicView?: boolean;
  showWatchlist?: boolean;
  userRole?: 'founder' | 'portal_admin';
  variant?: 'default' | 'compact';
}

export function ProjectCard({
  project,
  isPublicView = false,
  showWatchlist = false,
  userRole,
  variant = 'default'
}: ProjectCardProps) {

  // Format funding goal
  const formatFunding = (amount?: number) => {
    if (!amount) return 'Not specified';
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  // Get score color
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-600 bg-gray-50';
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Determine what to show based on visibility
  const showFullDetails = !isPublicView || project.visibility === 'public';
  const showScore = showFullDetails && project.readiness_score !== null;
  const showFunding = showFullDetails;

  if (variant === 'compact') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">
                {project.title}
              </h3>
              {project.one_liner && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {project.one_liner}
                </p>
              )}
            </div>

            {showScore && (
              <div className={`px-3 py-1 rounded-lg font-semibold ${getScoreColor(project.readiness_score)}`}>
                {project.readiness_score}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-2">
            {project.sectors?.slice(0, 2).map((sector) => (
              <Badge key={sector} variant="secondary" className="text-xs">
                {sector}
              </Badge>
            ))}
            {(project.sectors?.length || 0) > 2 && (
              <Badge variant="outline" className="text-xs">
                +{(project.sectors?.length || 0) - 2} more
              </Badge>
            )}
          </div>
        </CardContent>

        {showWatchlist && userRole && project.founder_id && (
          <CardFooter className="pt-3">
            <WatchlistButton
              targetId={project.founder_id}
              targetType="project"
              userRole={userRole}
              variant="outline"
              size="sm"
              showLabel={false}
            />
          </CardFooter>
        )}
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-xl truncate">
              {project.title}
            </h3>
            {project.one_liner && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                {project.one_liner}
              </p>
            )}
          </div>

          {showScore && (
            <div className="flex flex-col items-center gap-1">
              <div className={`px-4 py-2 rounded-lg font-bold text-lg ${getScoreColor(project.readiness_score)}`}>
                {project.readiness_score}
              </div>
              <span className="text-xs text-muted-foreground">Readiness</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Sectors */}
        <div className="flex flex-wrap gap-2">
          {project.sectors?.map((sector) => (
            <Badge key={sector} variant="secondary">
              {sector}
            </Badge>
          ))}
        </div>

        {/* Key Details */}
        <div className="space-y-2 text-sm">
          {project.funding_stage && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>{project.funding_stage}</span>
            </div>
          )}

          {showFunding && project.funding_goal && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="w-4 h-4" />
              <span>Target: {formatFunding(project.funding_goal)}</span>
            </div>
          )}

          {project.target_market && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{project.target_market}</span>
            </div>
          )}

          {showFullDetails && project.updated_at && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Public View Teaser */}
        {isPublicView && project.visibility !== 'public' && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground italic flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Sign in to view full details
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {showWatchlist && userRole && showFullDetails && project.founder_id && (
          <WatchlistButton
            targetId={project.founder_id}
            targetType="project"
            userRole={userRole}
            variant="outline"
            size="default"
            showLabel={true}
          />
        )}
      </CardFooter>
    </Card>
  );
}