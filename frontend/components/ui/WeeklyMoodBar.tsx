'use client';

import { motion } from 'framer-motion';

type Props = {
  scores: number[];
};

const colorFromScore = (score: number) => {
  if (score > 7) return 'bg-emerald-400';
  if (score >= 4) return 'bg-amber-400';
  return 'bg-red-400';
};

export default function WeeklyMoodBar({ scores }: Props) {
  return (
    <div className="flex h-20 items-end gap-1">
      {scores.map((score, idx) => (
        <motion.div
          key={`${score}-${idx}`}
          initial={{ height: 0 }}
          animate={{ height: `${score * 10}px` }}
          transition={{ duration: 0.5, delay: idx * 0.08 }}
          title={`Day ${idx + 1}: ${score}`}
          className={`w-3 rounded-sm ${colorFromScore(score)}`}
        />
      ))}
    </div>
  );
}
