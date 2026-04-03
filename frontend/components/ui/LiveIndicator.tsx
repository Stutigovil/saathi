'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type Props = {
  connected?: boolean;
  pulseOnUpdate?: number;
};

export default function LiveIndicator({ connected = true, pulseOnUpdate = 0 }: Props) {
  const [updatedText, setUpdatedText] = useState('Last updated: just now');

  useEffect(() => {
    if (!pulseOnUpdate) return;
    setUpdatedText('Updated just now');
    const t = setTimeout(() => setUpdatedText('Last updated: just now'), 1800);
    return () => clearTimeout(t);
  }, [pulseOnUpdate]);

  return (
    <motion.div
      key={pulseOnUpdate}
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-2 text-sm ${
        connected ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-red-500/40 bg-red-500/10 text-red-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'animate-pulse bg-emerald-400' : 'bg-red-400'}`} />
        {connected ? '● LIVE · Dashboard connected' : '● Reconnecting...'}
      </div>
      <span className="text-xs text-gray-300">{updatedText}</span>
    </motion.div>
  );
}
