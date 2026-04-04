'use client';

import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Phone, Brain, Heart, Users, Shield, Clock, Star, ArrowRight, ChevronRight, Sparkles, MessageCircle } from 'lucide-react';

/* ─── Animated Counter ─── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─── Stagger Container ─── */
const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.1 } } },
  item: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }
};

const stats = [
  { value: 140, suffix: 'M+', label: 'Elderly Indians', icon: Users },
  { value: 66, suffix: '%', label: 'Report Loneliness', icon: Heart },
  { value: 2, suffix: 's', label: 'Call Answer Time', icon: Clock },
  { value: 0, suffix: '', label: 'App Installs Needed', icon: Sparkles }
];

const howItWorks = [
  {
    icon: Phone,
    title: 'Saathi Calls Every Evening',
    description: 'A warm AI voice calls your loved one at their preferred time. No apps, no setup — just a regular phone call.',
    gradient: 'from-amber-500/20 to-orange-500/20'
  },
  {
    icon: Brain,
    title: 'Remembers Their World',
    description: 'Saathi recalls past conversations, health updates, family milestones — every call feels personal and genuine.',
    gradient: 'from-violet-500/20 to-purple-500/20'
  },
  {
    icon: Heart,
    title: 'Family Stays Connected',
    description: 'Get mood reports, health flags, and conversation summaries in your dashboard. Know they\'re okay, every single day.',
    gradient: 'from-emerald-500/20 to-teal-500/20'
  }
];

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Daughter in Bangalore',
    text: 'My mother looks forward to Saathi\'s calls every evening. It\'s like she has a friend who truly listens. I can finally stop worrying.',
    avatar: 'PS'
  },
  {
    name: 'Rajesh Gupta',
    role: 'Son in Mumbai',
    text: 'The mood tracking alerted us when Papa was feeling low for days. We visited that weekend. This product saves relationships.',
    avatar: 'RG'
  },
  {
    name: 'Anita Verma',
    role: 'Granddaughter in Delhi',
    text: 'Naniji doesn\'t understand apps, but she picks up the phone every day. Saathi is the most thoughtful tech I\'ve seen.',
    avatar: 'AV'
  }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* ─── Hero ─── */}
      <section className="relative mx-auto max-w-7xl px-6 pb-16 pt-12 lg:pt-20">
        {/* Mesh gradient bg */}
        <div className="pointer-events-none absolute inset-0 mesh-gradient opacity-60" />

        <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm text-accent"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Elderly Companion
            </motion.div>

            <h1 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
              <span className="gradient-text">
                Your dadi&apos;s phone
                <br />
                never has to go
                <br />
                unanswered again.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Saathi calls her every evening. In Hindi. And remembers everything —
              her health, her stories, her world.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/signup" className="btn-primary group flex items-center gap-2 text-base">
                Start Free Setup
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="#how" className="btn-secondary flex items-center gap-2 text-base">
                How it works
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex items-center gap-4 text-xs text-muted-dark">
              <div className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                ArmorIQ Safety
              </div>
              <div className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-400" />
                Hindi Voice AI
              </div>
              <div className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5 text-violet-400" />
                WhatsApp Ready
              </div>
            </div>
          </motion.div>

          {/* Hero Card — Animated Call Preview */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotateY: -5 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
            className="relative"
          >
            {/* Glow behind card */}
            <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-transparent to-violet-500/10 blur-2xl" />

            <div className="glass-card-strong relative overflow-hidden p-6 lg:p-8">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Phone className="h-4 w-4 text-emerald-400" />
                  <span>WhatsApp Voice · Saathi calling...</span>
                </div>
                <div className="flex h-2.5 w-2.5 items-center justify-center">
                  <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
                <div className="mb-1 font-heading text-lg font-semibold text-white">Kamla Devi</div>
                <div className="mb-4 text-xs text-muted">Jabalpur · Age 72 · Hindi</div>

                {/* Audio waveform */}
                <div className="flex items-end gap-1.5">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ scaleY: [0.3, 1, 0.3] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.2,
                        delay: i * 0.08,
                        ease: 'easeInOut'
                      }}
                      className="h-10 w-1.5 origin-bottom rounded-full"
                      style={{
                        background: `linear-gradient(to top, rgba(245,158,11,0.6), rgba(139,92,246,0.6))`
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Live topics */}
              <div className="flex flex-wrap gap-2">
                {['Health 💊', 'Family 👨‍👩‍👧', 'Mood 😊', 'Memory 🧠'].map((tag, i) => (
                  <motion.span
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-xs text-muted"
                  >
                    {tag}
                  </motion.span>
                ))}
              </div>

              <p className="mt-4 text-sm text-muted-dark">
                Warm Hindi voice · Memory-aware conversation · Family-safe escalation
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <motion.div
          variants={stagger.container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          {stats.map(({ value, suffix, label, icon: Icon }) => (
            <motion.div
              key={label}
              variants={stagger.item}
              className="glass-card group p-5 text-center transition-all duration-300 hover:border-accent/20 hover:shadow-glow-amber"
            >
              <Icon className="mx-auto mb-3 h-6 w-6 text-accent transition-transform duration-300 group-hover:scale-110" />
              <div className="font-heading text-2xl font-bold text-white md:text-3xl">
                {value === 0 ? '0' : <Counter target={value} suffix={suffix} />}
              </div>
              <p className="mt-1 text-sm text-muted">{label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── How it Works ─── */}
      <section id="how" className="mx-auto max-w-7xl px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="font-heading text-3xl font-bold text-white md:text-4xl">
            How <span className="gradient-text">Saathi</span> Works
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Three simple steps to bring warmth, safety, and connection to your loved one&apos;s daily life.
          </p>
        </motion.div>

        <div className="relative grid gap-6 md:grid-cols-3">
          {/* Connecting line (desktop) */}
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 hidden h-px bg-gradient-to-r from-amber-500/20 via-violet-500/20 to-emerald-500/20 md:block" />

          {howItWorks.map(({ icon: Icon, title, description, gradient }, idx) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              whileHover={{ y: -6 }}
              className="glass-card group relative overflow-hidden p-6 transition-all duration-300 hover:shadow-glass-lg"
            >
              {/* Gradient bg on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

              <div className="relative">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent/20">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <span className="font-heading text-2xl font-bold text-white/20">0{idx + 1}</span>
                </div>
                <h3 className="mb-2 font-heading text-lg font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-muted">{description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <h2 className="font-heading text-3xl font-bold text-white md:text-4xl">
            Loved by <span className="gradient-text-warm">Families</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Real stories from families who found peace of mind with Saathi.
          </p>
        </motion.div>

        <motion.div
          variants={stagger.container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
          className="grid gap-6 md:grid-cols-3"
        >
          {testimonials.map(({ name, role, text, avatar }) => (
            <motion.div
              key={name}
              variants={stagger.item}
              whileHover={{ y: -4 }}
              className="glass-card p-6 transition-all duration-300 hover:border-accent/10"
            >
              <div className="mb-4 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mb-5 text-sm leading-relaxed text-gray-300">&ldquo;{text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-violet-500 text-sm font-semibold text-white">
                  {avatar}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{name}</p>
                  <p className="text-xs text-muted">{role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Dashboard Preview ─── */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card-strong overflow-hidden p-6 lg:p-8"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-heading text-lg font-semibold text-white">Live Family Dashboard</h3>
              <p className="text-sm text-muted">Real-time mood tracking, call logs, and safety alerts</p>
            </div>
            <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              LIVE
            </span>
          </div>

          {/* Mock dashboard grid */}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-xs text-muted">Mood Score</p>
              <p className="mt-1 font-heading text-2xl font-bold text-emerald-400">8.2 / 10</p>
              <p className="mt-1 text-xs text-emerald-400">↑ 0.4 from yesterday</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-xs text-muted">Last Call</p>
              <p className="mt-1 font-heading text-2xl font-bold text-white">6:00 PM</p>
              <p className="mt-1 text-xs text-muted">Duration: 8 min</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-xs text-muted">Topics</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {['Health', 'Family', 'Food'].map(t => (
                  <span key={t} className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">{t}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-xs text-muted">Safety</p>
              <p className="mt-1 font-heading text-2xl font-bold text-white">All Clear ✓</p>
              <p className="mt-1 text-xs text-muted">ArmorIQ active</p>
            </div>
          </div>

          {/* Mock chart area */}
          <div className="mt-4 h-28 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex h-full items-end justify-between gap-2 p-4">
              {[60, 75, 55, 80, 90, 70, 85].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.5, ease: 'easeOut' }}
                  className="flex-1 origin-bottom rounded-t-md"
                  style={{
                    height: `${h}%`,
                    background: `linear-gradient(to top, rgba(245,158,11,0.3), rgba(139,92,246,0.3))`
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── CTA ─── */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl"
        >
          {/* Gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-violet-500/20" />
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

          <div className="relative px-8 py-14 text-center md:px-16">
            <h2 className="font-heading text-3xl font-bold text-white md:text-4xl lg:text-5xl">
              Give your loved ones
              <br />
              <span className="gradient-text">the gift of connection</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-muted">
              Set up in 5 minutes. No app install needed for your elders. Just warmth, every evening.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup" className="btn-primary group flex items-center gap-2 px-8 py-4 text-lg">
                Start Free Setup
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="#how" className="btn-secondary px-8 py-4 text-lg">
                Learn More
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-dark">
            <span className="font-heading font-semibold text-white">साथी Saathi</span>
            <span className="text-white/20">·</span>
            <span>Built at HackByte 4.0 · IIITDM Jabalpur</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-dark">
            <span>Privacy-first AI</span>
            <span className="text-white/10">·</span>
            <span>HIPAA-aware</span>
            <span className="text-white/10">·</span>
            <span>Made with ❤️ in India</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
