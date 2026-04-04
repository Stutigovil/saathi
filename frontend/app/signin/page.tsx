'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Sun, ArrowRight, Eye, EyeOff, Mail, Lock, Heart } from 'lucide-react';

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-background text-white"><p className="text-sm text-muted">Loading…</p></main>}>
      <SignInContent />
    </Suspense>
  );
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get('next') || '/dashboard', [searchParams]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Left — Branding Panel */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-background to-amber-500/10" />
        <div className="absolute inset-0 mesh-gradient" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 px-12 text-center"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-glow-amber"
          >
            <Sun className="h-10 w-10 text-black" />
          </motion.div>

          <h2 className="font-heading text-3xl font-bold text-white">
            Welcome back to <span className="gradient-text">Saathi</span>
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-muted">
            Your elders are waiting. Check their mood, trigger a call, or explore conversation memories.
          </p>

          <div className="mt-8 flex justify-center">
            <div className="glass-card flex items-center gap-3 px-5 py-3">
              <Heart className="h-5 w-5 text-red-400" />
              <div className="text-left">
                <p className="text-sm font-medium text-white">Daily connection matters</p>
                <p className="text-xs text-muted">Every call reduces loneliness by 35%</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right — Form */}
      <div className="flex items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
              <Sun className="h-5 w-5 text-black" />
            </div>
            <span className="font-heading text-xl font-bold">Saathi</span>
          </div>

          <h1 className="font-heading text-2xl font-bold text-white md:text-3xl">Sign in to Saathi</h1>
          <p className="mt-2 text-sm text-muted">Access dashboard, onboarding, and live call controls.</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Name</label>
              <input
                className="input-glass"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-dark" />
                <input
                  required
                  type="email"
                  className="input-glass pl-10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-dark" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  className="input-glass pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-dark transition-colors hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="btn-primary group flex w-full items-center justify-center gap-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  Signing in…
                </div>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            New here?{' '}
            <Link href="/signup" className="font-medium text-accent transition-colors hover:text-accent-hover">
              Create account
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
