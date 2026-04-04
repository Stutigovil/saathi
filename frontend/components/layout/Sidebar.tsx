'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Brain, PhoneCall, Shield, Phone } from 'lucide-react';

type SidebarProps = {
  elder?: any;
  onTriggerCall?: () => void;
};

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard', exactMatch: true },
  { label: 'Memory', icon: Brain, href: null },
  { label: 'Call History', icon: PhoneCall, href: null },
  { label: 'Safety Log', icon: Shield, href: null }
];

export default function Sidebar({ elder, onTriggerCall }: SidebarProps) {
  const pathname = usePathname();

  const initials = elder?.name
    ? elder.name
        .split(' ')
        .map((p: string) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'KD';

  return (
    <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-[260px] flex-col border-r border-white/[0.06] bg-card/40 pt-5 backdrop-blur-sm lg:flex">
      {/* Elder Profile Card */}
      <div className="mx-4 mb-6 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-violet-500 font-heading text-sm font-bold text-white">
              {initials}
            </div>
            {/* Active dot */}
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-400">
              <div className="h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            </div>
          </div>
          <div>
            <p className="font-medium text-white">{elder?.name || 'Kamla Devi'}</p>
            <p className="text-xs text-muted">{elder?.city || 'Jabalpur'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Active · {elder?.schedule_time || '18:00'} IST
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ label, icon: Icon, href, exactMatch }) => {
          const resolvedHref = href || (elder?._id ? `/dashboard/${elder._id}` : '/dashboard');
          const isActive = exactMatch
            ? pathname === resolvedHref
            : pathname?.startsWith(resolvedHref) && !exactMatch;

          return (
            <Link
              key={label}
              href={resolvedHref}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-accent' : 'text-muted-dark group-hover:text-white'}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Quick Call Button */}
      <div className="px-4 pb-5">
        <motion.button
          whileHover={{ y: -2, boxShadow: '0 0 30px rgba(245,158,11,0.3)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.2 }}
          onClick={onTriggerCall}
          className="btn-primary flex w-full items-center justify-center gap-2 text-sm"
        >
          <Phone className="h-4 w-4" />
          Trigger Call Now
        </motion.button>
      </div>
    </aside>
  );
}
