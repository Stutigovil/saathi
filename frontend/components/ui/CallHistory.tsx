'use client';

import { useState } from 'react';

type Props = {
  calls: any[];
};

const badge = (status: string) => {
  if (status === 'completed') return 'bg-emerald-500/20 text-emerald-300';
  if (status === 'no_answer') return 'bg-amber-500/20 text-amber-300';
  if (status === 'error') return 'bg-red-500/20 text-red-300';
  return 'bg-gray-500/20 text-gray-200';
};

export default function CallHistory({ calls }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {calls.map((call) => (
        <div key={call._id} className="soft-card p-4">
          <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(open === call._id ? null : call._id)}>
            <div>
              <p className="font-medium text-white">{new Date(call.created_at).toLocaleString('en-IN')}</p>
              <p className="text-sm text-gray-400">Duration: {Math.round((call.duration_seconds || 0) / 60)} min · Mood: {call.final_mood_score ?? '-'}</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs ${badge(call.status)}`}>{call.status}</span>
          </button>
          {open === call._id && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-300">{call.transcript || 'Transcript not available'}</p>}
        </div>
      ))}
    </div>
  );
}
