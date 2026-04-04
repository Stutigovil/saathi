'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get('next') || '/dashboard', [searchParams]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.signIn({ email: cleanEmail, password });
      auth.setSession(result);
      router.push(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-background px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-glow-violet">
        <h1 className="text-2xl font-semibold">Sign in to Sathi</h1>
        <p className="mt-1 text-sm text-gray-400">Access dashboard, onboarding, and live call controls.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {error ? <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Name</span>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Email</span>
            <input
              required
              type="email"
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Password</span>
            <input
              required
              type="password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-400">
          New here?{' '}
          <Link href="/signup" className="text-violet-300 hover:text-violet-200">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
