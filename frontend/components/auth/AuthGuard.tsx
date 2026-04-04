'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { Sun } from 'lucide-react';

type AuthGuardProps = {
  children: React.ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!auth.isAuthenticated()) {
        const next = encodeURIComponent(pathname || '/dashboard');
        router.replace(`/signin?next=${next}`);
        return;
      }

      try {
        await api.me();
        setAllowed(true);
      } catch {
        auth.signOut();
        const next = encodeURIComponent(pathname || '/dashboard');
        router.replace(`/signin?next=${next}`);
      }
    };

    run();
  }, [pathname, router]);

  if (!allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-glow-amber"
          >
            <Sun className="h-7 w-7 text-black" />
          </motion.div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: '0ms' }} />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: '150ms' }} />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-sm text-muted">Verifying your session…</p>
        </motion.div>
      </main>
    );
  }

  return <>{children}</>;
}
