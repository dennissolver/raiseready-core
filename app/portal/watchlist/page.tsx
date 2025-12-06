// app/portal/watchlist/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { safeDate } from '@/lib/utils/date';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookmarkCheck,
  Search,
  StickyNote,
  Tag,
  Trash2,
  Calendar,
  FileText,
  ExternalLink
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

type ShortlistItem = {
  id: string;
  founder_id: string;
  added_at: string;
  notes: string | null;
  tags: string[] | null;
  pitch_deck: {
    id: string;
    title: string;
    readiness_score: number | null;
    one_liner: string | null;
    sectors: string[] | null;
    created_at: string;
  } | null;
  founder: {
    id: string;
    email: string;
    name: string | null;
    funding_stage: string | null;
    target_market: string | null;
  } | null;
};

export default function PortalShortlistPage() {
  const [shortlist, setShortlist] = useState<ShortlistItem[]>([]);
  const [filteredShortlist, setFilteredShortlist] = useState<ShortlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'score' | 'name'>('recent');
  const [notesText, setNotesText] = useState('');

  const supabase = createClient();
  const { toast } = useToast();
  const { isLoading: authLoading, user } = useAuth({
    requireAuth: true,
    requiredRole: 'portal_admin',
  });

  useEffect(() => {
    if (user) {
      loadShortlist();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [shortlist, searchQuery, selectedTag, sortBy]);

  const loadShortlist = async () => {
    try {
      setIsLoading(true);

      if (!user) return;

      // Load shortlisted founders with their pitch decks
      const { data, error } = await supabase
        .from('investor_watchlist')
        .select(`
          id,
          founder_id,
          added_at,
          notes,
          tags,
          founders!investor_watchlist_founder_id_fkey (
            id,
            email,
            name,
            funding_stage,
            target_market
          ),
          pitch_decks!investor_watchlist_founder_id_fkey (
            id,
            title,
            readiness_score,
            one_liner,
            sectors,
            created_at,
            is_latest
          )
        `)
        .eq('investor_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;

      // Map to proper structure
      const items = (data || []).map(item => ({
        id: item.id,
        founder_id: item.founder_id,
        added_at: item.added_at,
        notes: item.notes,
        tags: item.tags,
        founder: Array.isArray(item.founders) ? item.founders[0] : item.founders,
        pitch_deck: Array.isArray(item.pitch_decks)
          ? item.pitch_decks.find((pd: any) => pd.is_latest) || item.pitch_decks[0]
          : item.pitch_decks
      })) as ShortlistItem[];

      setShortlist(items.filter(i => i.pitch_deck || i.founder));
    } catch (error) {
      console.error('Error loading shortlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shortlist',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...shortlist];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const searchableText = [
          item.pitch_deck?.title,
          item.pitch_deck?.one_liner,
          item.founder?.name,
          item.founder?.email,
          ...(item.pitch_deck?.sectors || []),
        ].filter(Boolean).join(' ').toLowerCase();

        return searchableText.includes(query);
      });
    }

    // Apply tag filter
    if (selectedTag !== 'all') {
      filtered = filtered.filter(item =>
        item.tags?.includes(selectedTag)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.pitch_deck?.title || '').localeCompare(b.pitch_deck?.title || '');
        case 'score':
          return (b.pitch_deck?.readiness_score || 0) - (a.pitch_deck?.readiness_score || 0);
        case 'recent':
        default:
          return safeDate(b.added_at).getTime() - safeDate(a.added_at).getTime();
      }
    });

    setFilteredShortlist(filtered);
  };

  const removeFromShortlist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('investor_watchlist')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setShortlist(prev => prev.filter(item => item.id !== id));
      toast({
        title: 'Removed',
        description: 'Founder removed from shortlist',
      });
    } catch (error) {
      console.error('Error removing from shortlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove from shortlist',
        variant: 'destructive',
      });
    }
  };

  const updateNotes = async (id: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('investor_watchlist')
        .update({ notes })
        .eq('id', id);

      if (error) throw error;

      setShortlist(prev =>
        prev.map(item =>
          item.id === id ? { ...item, notes } : item
        )
      );

      toast({
        title: 'Saved',
        description: 'Notes updated successfully',
      });
    } catch (error) {
      console.error('Error updating notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notes',
        variant: 'destructive',
      });
    }
  };

  // Get all unique tags
  const allTags = [...new Set(shortlist.flatMap(item => item.tags || []))];

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Shortlisted Founders</h1>
          <p className="text-muted-foreground">
            Founders you've marked for follow-up ({filteredShortlist.length} total)
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search founders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {allTags.length > 0 && (
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger className="w-40">
                    <Tag className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {allTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently Added</SelectItem>
                  <SelectItem value="score">Highest Score</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Shortlist Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : filteredShortlist.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookmarkCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No founders shortlisted</h3>
              <p className="text-muted-foreground mb-4">
                Review incoming submissions and add founders to your shortlist
              </p>
              <Link href="/portal/dashboard">
                <Button>View Submissions</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredShortlist.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Founder Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {item.pitch_deck?.title || 'Untitled Pitch'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {item.founder?.name || item.founder?.email}
                          </p>
                        </div>
                        <Badge variant={
                          (item.pitch_deck?.readiness_score || 0) >= 70 ? 'default' : 'secondary'
                        }>
                          Score: {item.pitch_deck?.readiness_score || '—'}/100
                        </Badge>
                      </div>

                      {item.pitch_deck?.one_liner && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {item.pitch_deck.one_liner}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3">
                        {item.founder?.funding_stage && (
                          <Badge variant="outline">{item.founder.funding_stage}</Badge>
                        )}
                        {item.founder?.target_market && (
                          <Badge variant="outline">{item.founder.target_market}</Badge>
                        )}
                        {item.pitch_deck?.sectors?.slice(0, 2).map((sector) => (
                          <Badge key={sector} variant="secondary">{sector}</Badge>
                        ))}
                      </div>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {item.tags.map((tag: string) => (
                            <Badge key={tag} variant="outline" className="bg-primary/5">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Notes Preview */}
                      {item.notes && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs font-medium mb-1 text-muted-foreground">Your Notes:</p>
                          <p className="text-sm whitespace-pre-wrap line-clamp-2">{item.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="lg:w-48 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Calendar className="w-3 h-3" />
                        Added {safeDate(item.added_at).toLocaleDateString()}
                      </div>

                      <Link href={`/portal/review/${item.pitch_deck?.id}`}>
                        <Button size="sm" className="w-full gap-2">
                          <FileText className="w-4 h-4" />
                          Review Pitch
                        </Button>
                      </Link>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full gap-2">
                            <StickyNote className="w-4 h-4" />
                            {item.notes ? 'Edit Notes' : 'Add Notes'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Notes for {item.pitch_deck?.title}</DialogTitle>
                            <DialogDescription>
                              Add private notes about this founder
                            </DialogDescription>
                          </DialogHeader>
                          <Textarea
                            placeholder="Your private notes..."
                            defaultValue={item.notes || ''}
                            onChange={(e) => setNotesText(e.target.value)}
                            rows={6}
                          />
                          <DialogFooter>
                            <Button onClick={() => {
                              updateNotes(item.id, notesText);
                              setNotesText('');
                            }}>
                              Save Notes
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                        onClick={() => removeFromShortlist(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
