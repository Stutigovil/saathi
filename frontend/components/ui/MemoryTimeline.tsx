'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

type Props = {
  memories: any[];
};

const moodStyle = (label: string) => {
  if (label === 'happy') return 'border-emerald-500';
  if (label === 'neutral') return 'border-gray-400';
  if (label === 'low') return 'border-amber-500';
  return 'border-red-500';
};

export default function MemoryTimeline({ memories }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }} initial="hidden" animate="show" className="space-y-4">
      {memories.map((memory, idx) => {
        const isOpen = openId === memory._id;
        return (
          <motion.div key={memory._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative pl-6">
            {idx < memories.length - 1 && <div className="absolute left-[9px] top-8 h-[calc(100%-8px)] border-l border-dashed border-border" />}
            <div className="absolute left-0 top-1 h-4 w-4 rounded-full bg-accent" />
            <div className={`soft-card border-l-4 p-4 ${moodStyle(memory.mood_label)}`}>
              <button onClick={() => setOpenId(isOpen ? null : memory._id)} className="w-full text-left">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-white">{new Date(memory.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                  {idx === 0 && <span className="rounded bg-accent/20 px-2 py-1 text-xs text-accent">TODAY</span>}
                </div>
                <p className="mt-1 text-sm text-gray-300">{memory.mood_label} · {memory.mood_score}/10</p>
                <p className="mt-2 text-sm text-gray-200">{memory.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(memory.key_topics || []).map((topic: string) => (
                    <span key={topic} className="rounded-full bg-accent/20 px-2 py-1 text-xs text-violet-200">{topic}</span>
                  ))}
                  {(memory.people_mentioned || []).map((person: string) => (
                    <span key={person} className="rounded-full bg-white/10 px-2 py-1 text-xs text-gray-200">{person}</span>
                  ))}
                </div>
              </button>

              {isOpen && (memory.follow_up_questions || []).length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">Follow-up questions</p>
                  <ul className="space-y-1 text-sm text-gray-200">
                    {memory.follow_up_questions.map((q: string) => (
                      <li key={q}>• {q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
