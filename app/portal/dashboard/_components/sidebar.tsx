'use client';
// app/portal/dashboard/_components/sidebar.tsx

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Users, Target, Inbox, Star, MessageSquare, Settings, LogOut, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { clientConfig } from '@/config';

export function PortalSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  // Get config-driven labels
  const { company, theme, platformTypeConfig } = clientConfig;
  const ownerLabel = platformTypeConfig?.ownerLabel || 'Investor';
  const thesisLabel = platformTypeConfig?.thesisLabel || 'Investment Thesis';

  const links = [
    { href: '/portal/dashboard', label: 'Dashboard', icon: Home },
    { href: '/portal/thesis', label: thesisLabel, icon: Target },
    { href: '/portal/discovery', label: 'AI Discovery', icon: MessageSquare },
    { href: '/portal/watchlist', label: 'Shortlist', icon: Star },
    { href: '/portal/profile', label: 'Settings', icon: Settings },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="w-64 bg-white border-r min-h-screen p-6 flex flex-col">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(to bottom right, ${theme.colors.primary}, ${theme.colors.accent})` }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span
            className="font-bold text-lg bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.accent})` }}
          >
            {company.name}
          </span>
        </Link>
        <p className="text-xs text-muted-foreground mt-1">{ownerLabel} Portal</p>
      </div>

      <ul className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/')

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Tip Box */}
      <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-start gap-2">
          <Inbox className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900 mb-1">
              Review Pitches
            </h4>
            <p className="text-xs text-amber-700 mb-2">
              New submissions are waiting for your review
            </p>
            <Link href="/portal/dashboard">
              <span className="text-xs text-amber-600 hover:underline">
                View submissions →
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Logout Button - Pushed to Bottom */}
      <div className="mt-auto pt-4 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  )
}
