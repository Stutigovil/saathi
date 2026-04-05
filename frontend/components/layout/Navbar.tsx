'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { auth, type AuthSession } from '@/lib/auth';
import { Menu, X, Sun, Phone, LayoutDashboard, UserPlus, LogOut, Settings } from 'lucide-react';

export default function Navbar() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setSession(auth.getSession());
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const onSignOut = () => {
    auth.signOut();
    setSession(null);
    window.location.href = '/signin';
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'border-b border-white/[0.06] bg-background/80 shadow-glass backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-glow-amber transition-transform duration-300 group-hover:scale-110">
              <Sun className="h-5 w-5 text-black" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight">
              <span className="text-white">साथी</span>{' '}
              <span className="gradient-text">Saathi</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-2 md:flex">
            {session ? (
              <>
                <span className="mr-2 text-sm text-muted">{session.name}</span>
                <Link href="/dashboard" className="btn-ghost flex items-center gap-2 text-sm">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link href="/settings" className="btn-ghost flex items-center gap-2 text-sm">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <Link href="/onboard" className="btn-primary flex items-center gap-2 !py-2 text-sm">
                  <UserPlus className="h-4 w-4" />
                  Add Elder
                </Link>
                <button onClick={onSignOut} className="btn-ghost flex items-center gap-2 text-sm text-red-400 hover:text-red-300">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/signin" className="btn-ghost text-sm">
                  Sign in
                </Link>
                <Link href="/signup" className="btn-primary !py-2 text-sm">
                  Get Started
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-xl p-2 text-muted transition-colors hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </motion.header>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-[73px] z-40 border-b border-white/[0.06] bg-background/95 px-6 pb-6 pt-4 backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-col gap-2">
              {session ? (
                <>
                  <p className="mb-2 text-sm text-muted">Hi, {session.name}</p>
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="btn-ghost flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                  <Link href="/settings" onClick={() => setMobileOpen(false)} className="btn-ghost flex items-center gap-2">
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <Link href="/onboard" onClick={() => setMobileOpen(false)} className="btn-primary flex items-center justify-center gap-2">
                    <UserPlus className="h-4 w-4" /> Add Elder
                  </Link>
                  <button onClick={onSignOut} className="btn-ghost flex items-center gap-2 text-red-400">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/signin" onClick={() => setMobileOpen(false)} className="btn-ghost text-center">Sign in</Link>
                  <Link href="/signup" onClick={() => setMobileOpen(false)} className="btn-primary text-center">Get Started</Link>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
