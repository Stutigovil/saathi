'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import WeeklyMoodBar from './WeeklyMoodBar';

type Props = {
  elder: any;
};

export default function ElderCard({ elder }: Props) {
  const initials = elder.name
    .split(' ')
    .map((s: string) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -4, boxShadow: '0 0 20px rgba(139,92,246,0.15)' }}
      className="rounded-2xl border border-[#1e1e2e] bg-[#111118] p-4"
    >
      <Link href={`/dashboard/${elder._id}`}>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-semibold">
            {initials}
          </div>
          <div>
            <p className="font-medium text-white">{elder.name}</p>
            <p className="text-sm text-gray-400">{elder.city}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Active
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-white/5 p-2">
            <p className="text-gray-400">Last Call</p>
            <p className="mt-1 text-white">6:02 PM</p>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <p className="text-gray-400">Mood</p>
            <p className="mt-1 text-white">{elder.stats?.average_mood?.toFixed?.(1) || '8.4'}</p>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <p className="text-gray-400">Next</p>
            <p className="mt-1 text-white">{elder.schedule_time || '18:00'}</p>
          </div>
        </div>

        <WeeklyMoodBar scores={[8.5, 9, 9.5, 5.5, 7.5, 8, 8.5]} />
      </Link>
    </motion.div>
  );
}
