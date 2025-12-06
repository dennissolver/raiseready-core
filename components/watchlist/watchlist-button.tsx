'use client';
import { clientConfig } from '@/config';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WatchlistButtonProps {
  targetId: string;
  targetType: 'project' | 'founder';
  userRole?: 'founder' | 'portal_admin';
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  onToggle?: (isWatched: boolean) => void;
}

export function WatchlistButton({
  targetId,
  targetType,
  userRole,
  variant = 'outline',
  size = 'default',
  showLabel = true,
  onToggle,
}: WatchlistButtonProps) {
  const [isWatched, setIsWatched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const supabase = createClient();
  const { toast } = useToast();

  // Get context-aware button text
  const getButtonText = () => {
    if (userRole === 'portal_admin') {
      return isWatched ? 'Shortlisted' : 'Add to Shortlist';
    }
    return isWatched ? 'Saved' : 'Save';
  };

  // Check if already watching on mount
  useEffect(() => {
    checkWatchlistStatus();
  }, [targetId, targetType, userRole]);

  const checkWatchlistStatus = async () => {
    try {
      setIsChecking(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsChecking(false);
        return;
      }

      let data = null;
      let error = null;

      if (userRole === 'portal_admin') {
        // Check investor_watchlist (investor shortlist)
        const result = await supabase
          .from('investor_watchlist')
          .select('id')
          .eq('investor_id', user.id)
          .eq('founder_id', targetId)
          .single();

        data = result.data;
        error = result.error;
      }

      // If error is 'PGRST116', it means no row found (not watching)
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking watchlist status:', error);
      }

      setIsWatched(!!data);
    } catch (error) {
      console.error('Error in checkWatchlistStatus:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggle = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to use this feature.',
          variant: 'destructive',
        });
        return;
      }

      if (isWatched) {
        await removeFromWatchlist(user.id);
      } else {
        await addToWatchlist(user.id);
      }

      const newStatus = !isWatched;
      setIsWatched(newStatus);

      if (onToggle) {
        onToggle(newStatus);
      }

      toast({
        title: newStatus ? 'Added to shortlist' : 'Removed from shortlist',
        description: newStatus
          ? `Founder added to your shortlist.`
          : 'Founder removed from shortlist.',
      });

    } catch (error) {
      console.error('Error toggling watchlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to update. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addToWatchlist = async (userId: string) => {
    if (userRole === 'portal_admin') {
      const { error } = await supabase
        .from('investor_watchlist')
        .insert({
          investor_id: userId,
          founder_id: targetId,
          added_at: new Date().toISOString(),
        });

      if (error) throw error;
    }
  };

  const removeFromWatchlist = async (userId: string) => {
    if (userRole === 'portal_admin') {
      const { error } = await supabase
        .from('investor_watchlist')
        .delete()
        .eq('investor_id', userId)
        .eq('founder_id', targetId);

      if (error) throw error;
    }
  };

  if (isChecking) {
    return (
      <Button variant={variant} size={size} disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      variant={isWatched ? 'default' : variant}
      size={size}
      onClick={handleToggle}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isWatched ? (
        <BookmarkCheck className="w-4 h-4" />
      ) : (
        <Bookmark className="w-4 h-4" />
      )}
      {showLabel && !isLoading && getButtonText()}
    </Button>
  );
}