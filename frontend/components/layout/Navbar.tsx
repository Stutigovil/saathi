'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { auth, type AuthSession } from '@/lib/auth';

export default function Navbar() {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    setSession(auth.getSession());
  }, []);

  const onSignOut = () => {
    auth.signOut();
    setSession(null);
    window.location.href = '/signin';
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-semibold tracking-tight text-white">
          साथी <span className="text-accent">Sathi</span>
        </Link>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <span className="hidden text-sm text-gray-300 md:inline">{session.name}</span>
              <Link href="/dashboard" className="rounded-lg border border-border px-4 py-2 text-sm text-gray-200 transition hover:border-accent">
                Dashboard
              </Link>
              <Link href="/onboard" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-glow-violet transition hover:opacity-90">
                Add Elder
              </Link>
              <button onClick={onSignOut} className="rounded-lg border border-border px-4 py-2 text-sm text-gray-200 transition hover:border-red-400">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/signin" className="rounded-lg border border-border px-4 py-2 text-sm text-gray-200 transition hover:border-accent">
                Sign in
              </Link>
              <Link href="/signup" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-glow-violet transition hover:opacity-90">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
