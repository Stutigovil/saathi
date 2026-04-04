'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';

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
      <main className="grid min-h-screen place-items-center bg-background text-white">
        <p className="text-sm text-gray-300">Checking session...</p>
      </main>
    );
  }

  return <>{children}</>;
}
