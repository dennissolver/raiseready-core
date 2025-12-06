// app/founder/dashboard/_components/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Upload,
  User,
  MessageSquare,
  Mic,
  LogOut,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { clientConfig } from '@/config';

const navItems = [
  { href: '/founder/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/founder/upload', label: 'Upload Deck', icon: Upload },
  { href: '/founder/profile', label: 'My Profile', icon: User },
  { href: '/founder/discovery', label: 'Story Discovery', icon: MessageSquare },
  { href: '/founder/practice', label: 'Practice Pitch', icon: Mic },
];

export function FounderSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { company, theme } = clientConfig;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-full bg-white border-r">
      {/* Logo */}
      <div className="p-6 border-b">
        <Link href="/founder/dashboard" className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(to bottom right, ${theme.colors.primary}, ${theme.colors.accent})` }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span
            className="font-bold text-xl bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.accent})` }}
          >
            {company.name}
          </span>
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Founder Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Promo Box */}
      <div className="p-4">
        <div
          className="rounded-lg p-4"
          style={{ background: `linear-gradient(to bottom right, ${theme.colors.primary}15, ${theme.colors.accent}20)` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5" style={{ color: theme.colors.primary }} />
            <span className="font-semibold text-sm">Storytelling Tips</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Learn the {company.name} method for crafting compelling narratives
          </p>
          <Link href="/founder/discovery">
            <Button size="sm" variant="secondary" className="w-full">
              Start Discovery
            </Button>
          </Link>
        </div>
      </div>

      {/* Sign Out */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
