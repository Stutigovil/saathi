'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Sun, ArrowRight, Eye, EyeOff, User, Mail, Lock, Sparkles } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = (() => {
    if (password.length === 0) return { level: 0, label: '', color: '' };
    if (password.length < 4) return { level: 1, label: 'Weak', color: 'bg-red-500' };
    if (password.length < 6) return { level: 2, label: 'Fair', color: 'bg-amber-500' };
    if (password.length < 8) return { level: 3, label: 'Good', color: 'bg-emerald-400' };
    return { level: 4, label: 'Strong', color: 'bg-emerald-500' };
  })();

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
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Left — Branding Panel */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center">
        {/* Gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-background to-violet-500/10" />
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
            Welcome to <span className="gradient-text">Saathi</span>
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-muted">
            Join thousands of families giving their elders the warmth of daily companionship.
          </p>

          {/* Feature pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {['Hindi AI Voice', 'Daily Calls', 'Family Dashboard', 'Safety Alerts'].map((f, i) => (
              <motion.span
                key={f}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-xs text-muted"
              >
                {f}
              </motion.span>
            ))}
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

          <h1 className="font-heading text-2xl font-bold text-white md:text-3xl">Create your account</h1>
          <p className="mt-2 text-sm text-muted">Set up your family profile and start onboarding elders.</p>

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
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Full name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-dark" />
                <input
                  required
                  className="input-glass pl-10"
                  placeholder="Ananya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-dark" />
                <input
                  required
                  type="email"
                  className="input-glass pl-10"
                  placeholder="family@example.com"
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
                  minLength={6}
                  className="input-glass pl-10 pr-10"
                  placeholder="At least 6 characters"
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

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(level => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          level <= passwordStrength.level ? passwordStrength.color : 'bg-white/[0.06]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-dark">{passwordStrength.label}</p>
                </div>
              )}
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
                  Creating account…
                </div>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link href="/signin" className="font-medium text-accent transition-colors hover:text-accent-hover">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
