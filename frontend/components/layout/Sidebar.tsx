'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

type SidebarProps = {
  elder?: any;
  onTriggerCall?: () => void;
};

export default function Sidebar({ elder, onTriggerCall }: SidebarProps) {
  const initials = elder?.name
    ? elder.name
        .split(' ')
        .map((p: string) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'KD';

  return (
    <aside className="sticky top-0 flex h-screen w-[240px] flex-col border-r border-border bg-card/70 p-4">
      <div className="mb-8 text-lg font-semibold text-white">Sathi</div>

      <div className="soft-card p-4">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 font-semibold text-white">
          {initials}
        </div>
        <p className="font-medium text-white">{elder?.name || 'Kamla Devi'}</p>
        <p className="text-sm text-gray-400">{elder?.city || 'Jabalpur'}</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Active
        </div>
      </div>

      <nav className="mt-6 flex flex-col gap-2 text-sm text-gray-300">
        <Link href="/dashboard" className="rounded-lg px-3 py-2 hover:bg-white/5">
          Overview
        </Link>
        {elder?._id && (
          <Link href={`/dashboard/${elder._id}`} className="rounded-lg px-3 py-2 hover:bg-white/5">
            Memory
          </Link>
        )}
        {elder?._id && (
          <Link href={`/dashboard/${elder._id}`} className="rounded-lg px-3 py-2 hover:bg-white/5">
            Call History
          </Link>
        )}
        {elder?._id && (
          <Link href={`/dashboard/${elder._id}`} className="rounded-lg px-3 py-2 hover:bg-white/5">
            Safety Log
          </Link>
        )}
      </nav>

      <motion.button
        whileHover={{ y: -2, boxShadow: '0 0 30px rgba(139,92,246,0.2)' }}
        transition={{ duration: 0.2 }}
        onClick={onTriggerCall}
        className="mt-auto rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white shadow-glow-violet"
      >
        Trigger Call Now
      </motion.button>
    </aside>
  );
}
