'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import AuthGuard from '@/components/auth/AuthGuard';
import ElderCard from '@/components/ui/ElderCard';
import MoodChart from '@/components/ui/MoodChart';
import DistressAlert from '@/components/ui/DistressAlert';
import LiveIndicator from '@/components/ui/LiveIndicator';
import { api } from '@/lib/api';
import {
  Phone, Clock, Activity, Shield, UserPlus, Mic2,
  TrendingUp, TrendingDown, MessageSquare, Heart, Calendar, Users
} from 'lucide-react';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' }
  })
};

export default function DashboardPage() {
  const [elders, setElders] = useState<any[]>([]);
  const [selectedElderId, setSelectedElderId] = useState<string>('');
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [triggeringCall, setTriggeringCall] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('18:00');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState('');

  useEffect(() => {
    api.getElders().then((data) => {
      setElders(data);
      if (data[0]?._id) setSelectedElderId(data[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!selectedElderId) return;

    let isMounted = true;
    const fetchDashboard = async () => {
      const data = await api.getElderDashboard(selectedElderId);
      if (!isMounted) return;
      setDashboard(data);
      setShowAlert(Boolean(data.memories?.[0]?.distress_detected));
      setPulse((p) => p + 1);
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedElderId]);

  const chartData = useMemo(() => {
    return (dashboard?.mood_trend || []).map((point: any) => ({
      date: new Date(point.date).toLocaleDateString('en-IN', { weekday: 'short' }),
      score: point.mood_score,
      label: point.mood_label,
      summary: dashboard?.memories?.find((m: any) => m.mood_score === point.mood_score)?.summary || ''
    }));
  }, [dashboard]);

  const selectedElder = dashboard?.elder || elders.find((e) => e._id === selectedElderId);
  const latestCall = dashboard?.last_calls?.[0];
  const latestMemory = dashboard?.memories?.[0];

  const toMinutes = (hhmm: string) => {
    const match = String(hhmm || '').match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };

  const minutesToHHMM = (value: number) => {
    const normalized = ((value % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  useEffect(() => {
    setScheduleTime(selectedElder?.schedule_time || '18:00');
  }, [selectedElder?._id, selectedElder?.schedule_time]);

  const moodDelta = useMemo(() => {
    if (!dashboard?.memories || dashboard.memories.length < 2) return null;
    return Number((Number(dashboard.memories[0]?.mood_score || 0) - Number(dashboard.memories[1]?.mood_score || 0)).toFixed(1));
  }, [dashboard]);

  const chartBounds = useMemo(() => {
    if (!chartData.length) {
      return { low: null as null | number, high: null as null | number };
    }
    const scores = chartData.map((item: any) => item.score);
    return {
      low: Math.min(...scores),
      high: Math.max(...scores)
    };
  }, [chartData]);

  const recentCalls = dashboard?.last_calls || [];
  const latestPrimaryNoAnswer = recentCalls.find(
    (call: any) => String(call?.vapi_call_id || '').startsWith('scheduled-primary-') && call?.status === 'no_answer'
  );
  const hasRetryAttempt = recentCalls.some((call: any) =>
    String(call?.vapi_call_id || '').startsWith('scheduled-retry-')
  );

  const retryTime = useMemo(() => {
    if (!latestPrimaryNoAnswer || hasRetryAttempt) return null;
    const baseMinutes = toMinutes(selectedElder?.schedule_time || '');
    if (baseMinutes === null) return null;
    return minutesToHHMM(baseMinutes + 10);
  }, [latestPrimaryNoAnswer, hasRetryAttempt, selectedElder?.schedule_time]);

  const nextCallText = retryTime
    ? `Retry at ${retryTime}`
    : selectedElder?.schedule_time
      ? `Daily at ${selectedElder.schedule_time}`
      : 'Schedule not set';

  const latestCallMetaText = latestCall?.status === 'no_answer'
    ? 'Call not answered'
    : `Duration: ${Math.max(1, Math.round((latestCall?.duration_seconds || 0) / 60))} min · ${latestMemory?.mood_score ? '😊' : '—'}`;

  const triggerCall = async () => {
    if (!selectedElderId) return;
    setTriggeringCall(true);
    try {
      await api.triggerCall(selectedElderId);
      const next = await api.getElderDashboard(selectedElderId);
      setDashboard(next);
      setPulse((p) => p + 1);
    } finally {
      setTriggeringCall(false);
    }
  };

  const saveSchedule = async () => {
    if (!selectedElderId) return;
    setSavingSchedule(true);
    setScheduleMessage('');
    try {
      await api.updateElderSchedule(selectedElderId, { schedule_time: scheduleTime });
      const [nextDashboard, nextElders] = await Promise.all([
        api.getElderDashboard(selectedElderId),
        api.getElders()
      ]);
      setDashboard(nextDashboard);
      setElders(nextElders);
      setPulse((p) => p + 1);
      setScheduleMessage('Schedule updated.');
    } catch (error) {
      setScheduleMessage(error instanceof Error ? error.message : 'Failed to update schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  const statCards = [
    {
      label: 'Last Call',
      value: latestCall?.created_at
        ? new Date(latestCall.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
        : 'No call yet',
      sub: latestCallMetaText,
      icon: Phone,
      color: latestCall?.status === 'no_answer' ? 'text-amber-400' : 'text-emerald-400',
      bgColor: latestCall?.status === 'no_answer' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
    },
    {
      label: 'Mood Score',
      value: `${latestMemory?.mood_score ?? 0} / 10`,
      sub: moodDelta === null ? 'Trend building...' : moodDelta >= 0 ? `↑ ${moodDelta} vs last call` : `↓ ${Math.abs(moodDelta)} vs last call`,
      icon: moodDelta !== null && moodDelta >= 0 ? TrendingUp : TrendingDown,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    {
      label: 'Next Call',
      value: nextCallText,
      sub: retryTime ? 'Auto-retry after missed call' : selectedElder?.is_active ? 'Active schedule' : 'Paused',
      icon: Clock,
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    },
    {
      label: 'Safety & Alerts',
      value: `${dashboard?.armoriq_blocks_count ?? 0}`,
      sub: 'ArmorIQ interventions logged',
      icon: Shield,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10'
    }
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="flex min-h-[calc(100vh-73px)]">
          <Sidebar elder={selectedElder} onTriggerCall={triggerCall} />

          <section className="flex-1 overflow-y-auto p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="font-heading text-2xl font-bold text-white lg:text-3xl">Family Dashboard</h1>
                <p className="mt-1 text-sm text-muted">Track mood, calls, safety and memory across every elder profile.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/onboard" className="btn-ghost flex items-center gap-1.5 text-sm">
                  <UserPlus className="h-4 w-4" />
                  Add Elder
                </Link>
                {selectedElderId && (
                  <Link
                    href={`/dashboard/${selectedElderId}#voice-cloning`}
                    className="btn-ghost flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    <Mic2 className="h-4 w-4" />
                    Voice Clone
                  </Link>
                )}
                {selectedElderId && (
                  <Link
                    href={`/dashboard/${selectedElderId}#reminder-calls`}
                    className="btn-ghost flex items-center gap-1.5 text-sm text-accent hover:text-accent/80"
                  >
                    <Calendar className="h-4 w-4" />
                    Schedule Reminder
                  </Link>
                )}
                <select
                  value={selectedElderId}
                  onChange={(e) => setSelectedElderId(e.target.value)}
                  className="input-glass max-w-[200px] !py-2 text-sm"
                >
                  {elders.map((elder) => (
                    <option key={elder._id} value={elder._id}>
                      {elder.name} · {elder.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <LiveIndicator connected pulseOnUpdate={pulse} />

            <DistressAlert
              show={showAlert}
              onDismiss={() => setShowAlert(false)}
              message={dashboard?.memories?.[0]?.summary || 'Sathi noticed signs of low mood in the latest call.'}
            />

            {/* Stat Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map(({ label, value, sub, icon: Icon, color, bgColor }, i) => (
                <motion.div
                  key={label}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="show"
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  className="glass-card group p-5 transition-all duration-300 hover:border-white/[0.12]"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-muted">{label}</p>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgColor}`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                  </div>
                  <p className="font-heading text-xl font-bold text-white">{value}</p>
                  <p className={`mt-1 text-sm ${latestCall?.status === 'no_answer' && label === 'Last Call' ? 'text-amber-300' : 'text-muted'}`}>
                    {sub}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-2">
                {!!chartData.length && <MoodChart data={chartData} />}

                {/* Today's Conversation */}
                <div className="glass-card p-5 lg:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-heading text-lg font-semibold text-white">Today&apos;s Conversation</h2>
                    <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs text-muted">
                      {latestMemory?.created_at ? formatDistanceToNow(new Date(latestMemory.created_at), { addSuffix: true }) : 'No update'}
                    </span>
                  </div>

                  <p className="text-gray-200 leading-relaxed">{latestMemory?.summary || 'No summary yet. Trigger a call to generate memory insights.'}</p>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                        <MessageSquare className="h-3 w-3" /> Topics discussed
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(latestMemory?.key_topics || []).length ? (
                          (latestMemory?.key_topics || []).map((tag: string) => (
                            <span key={tag} className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-dark">No topics available</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                        <Users className="h-3 w-3" /> People mentioned
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(latestMemory?.people_mentioned || []).length ? (
                          (latestMemory?.people_mentioned || []).map((person: string) => (
                            <span key={person} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-gray-200">
                              {person}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-dark">No people mentioned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/[0.06] pt-5">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                      <Heart className="h-3 w-3" /> Ask next time
                    </p>
                    {(latestMemory?.follow_up_questions || []).length ? (
                      <ul className="space-y-1.5 text-sm text-gray-300">
                        {(latestMemory?.follow_up_questions || []).slice(0, 3).map((question: string) => (
                          <li key={question} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
                            {question}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-dark">No follow-up prompts yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Health Snapshot */}
                <div className="glass-card p-5">
                  <h3 className="font-heading text-base font-semibold text-white">Health Snapshot</h3>
                  <p className="mt-1 text-sm text-muted">Current elder profile highlights</p>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                      <p className="text-xs text-muted">Primary Contact</p>
                      <p className="mt-1 text-sm font-medium text-white">{selectedElder?.family?.[0]?.name || 'Not set'}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                      <p className="text-xs text-muted">Health Mentions</p>
                      <p className="mt-1 text-sm font-medium text-white">{(latestMemory?.health_mentions || []).join(', ') || 'No major concerns'}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                      <p className="text-xs text-muted">Mood Range (7 days)</p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {chartBounds.low === null ? 'No data' : `${chartBounds.low} → ${chartBounds.high}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-card p-5">
                  <h3 className="font-heading text-base font-semibold text-white">Quick Actions</h3>
                  <div className="mt-4 space-y-3">
                    {/* Schedule */}
                    <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                        <Calendar className="h-3 w-3" /> Daily Schedule (IST)
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="input-glass max-w-[140px] !py-2 text-sm"
                        />
                        <button
                          onClick={saveSchedule}
                          disabled={savingSchedule || !selectedElderId}
                          className="btn-secondary !py-2 text-sm disabled:opacity-50"
                        >
                          {savingSchedule ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                      {scheduleMessage && <p className="mt-2 text-xs text-muted">{scheduleMessage}</p>}
                    </div>

                    <motion.button
                      onClick={triggerCall}
                      disabled={triggeringCall || !selectedElderId}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn-primary flex w-full items-center justify-center gap-2 text-sm"
                    >
                      <Phone className="h-4 w-4" />
                      {triggeringCall ? 'Triggering call...' : 'Trigger Call Now'}
                    </motion.button>

                    <Link
                      href={selectedElderId ? `/dashboard/${selectedElderId}` : '/dashboard'}
                      className="btn-secondary flex w-full items-center justify-center gap-2 text-sm"
                    >
                      <Activity className="h-4 w-4" />
                      Open Detailed Profile
                    </Link>

                    <Link
                      href="/onboard"
                      className="btn-ghost flex w-full items-center justify-center gap-2 border border-white/[0.06] text-sm"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add Another Elder
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* All Elders */}
            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-heading text-lg font-semibold text-white">All Elders</h2>
                <p className="text-xs text-muted">{elders.length} profile{elders.length === 1 ? '' : 's'}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {elders.map((elder) => (
                  <ElderCard key={elder._id} elder={elder} />
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </AuthGuard>
  );
}
