'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError('Please enter your full name.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.signUp({ name: cleanName, email: cleanEmail, password });
      auth.setSession(result);
      router.push('/onboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-background px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-glow-violet">
        <h1 className="text-2xl font-semibold">Create your Sathi account</h1>
        <p className="mt-1 text-sm text-gray-400">Set up your family profile and start onboarding elders.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {error ? <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Full name</span>
            <input
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              placeholder="Ananya Sharma"
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
              placeholder="family@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Password</span>
            <input
              required
              type="password"
              minLength={6}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/signin" className="text-violet-300 hover:text-violet-200">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
