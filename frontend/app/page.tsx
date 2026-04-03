'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';

const stats = ['140M+ elderly Indians', '66% report loneliness', 'Calls answered in 2 seconds', '0 app installs needed'];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-14 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
            <span className="bg-gradient-to-r from-violet-300 via-violet-500 to-fuchsia-400 bg-clip-text text-transparent">
              Your dadi&apos;s phone
              <br />
              never has to go
              <br />
              unanswered again.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-gray-300">Sathi calls her every evening. In Hindi. And remembers everything.</p>
          <div className="mt-7 flex gap-3">
            <Link href="/dashboard" className="rounded-xl bg-accent px-5 py-3 font-medium text-white shadow-glow-violet">
              Open Live Dashboard
            </Link>
            <Link href="#how" className="rounded-xl border border-border px-5 py-3 text-gray-200 hover:border-accent">
              How it works
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
          className="soft-card animate-glow p-6"
        >
          <div className="mb-4 text-sm text-gray-300">WhatsApp Voice · Sathi calling...</div>
          <div className="mb-3 rounded-xl border border-border bg-black/20 p-4">
            <div className="mb-2 text-lg font-medium">Kamla Devi</div>
            <div className="flex items-end gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                  className="h-10 w-2 origin-bottom rounded bg-violet-400"
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-400">Warm Hindi voice, memory-aware conversation, family-safe escalation.</p>
        </motion.div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-6 pb-12 md:grid-cols-4">
        {stats.map((stat, idx) => (
          <motion.div key={stat} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.08 }} className="soft-card p-4 text-center text-sm text-gray-200">
            {stat}
          </motion.div>
        ))}
      </section>

      <section id="how" className="mx-auto max-w-7xl px-6 pb-12">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['📞', 'Sathi calls every evening'],
            ['🧠', 'Remembers their world'],
            ['💙', 'Family stays connected']
          ].map(([emoji, text], idx) => (
            <motion.div key={text} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.08 }} className="soft-card p-5">
              <div className="mb-2 text-2xl">{emoji}</div>
              <p className="font-medium">{text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="soft-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-300">Live family dashboard</p>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">LIVE</span>
          </div>
          <div className="h-40 rounded-xl border border-border bg-black/20" />
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-gray-400">Built at HackByte 4.0 · IIITDM Jabalpur</footer>
    </main>
  );
}
