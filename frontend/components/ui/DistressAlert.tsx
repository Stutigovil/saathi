'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Props = {
  show: boolean;
  message: string;
  onDismiss: () => void;
};

export default function DistressAlert({ show, message, onDismiss }: Props) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onDismiss, 30000);
    return () => clearTimeout(timer);
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="mb-4 rounded-xl border border-red-500 bg-red-500/10 p-4 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
        >
          <div className="mb-2 flex items-center gap-2 text-red-300">
            <span className="animate-pulse">⚠️</span>
            <span className="font-medium">Sathi noticed Dadi seems a bit low today</span>
          </div>
          <p className="mb-3 text-sm text-red-100">{message}</p>
          <button className="w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white">Call Dadi Now</button>
          <button onClick={onDismiss} className="mt-2 text-xs text-gray-300 underline">
            Dismiss
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
