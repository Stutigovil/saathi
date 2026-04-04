'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

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

  const averageMood = Number(elder?.stats?.average_mood || 0);
  const totalCalls = Number(elder?.stats?.total_calls || 0);
  const lastCall = elder?.stats?.last_successful_call
    ? new Date(elder.stats.last_successful_call).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short'
      })
    : 'No calls yet';
  const scheduleTime = elder?.schedule_time || 'Not set';

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

        <div className="mb-4 grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-lg bg-white/5 p-2">
            <p className="text-gray-400">Schedule</p>
            <p className="mt-1 text-white">{scheduleTime}</p>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <p className="text-gray-400">Last Call</p>
            <p className="mt-1 text-white">{lastCall}</p>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <p className="text-gray-400">Mood</p>
            <p className="mt-1 text-white">{averageMood > 0 ? averageMood.toFixed(1) : '—'}</p>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <p className="text-gray-400">Calls</p>
            <p className="mt-1 text-white">{totalCalls}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
