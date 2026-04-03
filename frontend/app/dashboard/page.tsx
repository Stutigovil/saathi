'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import Sidebar from '@/components/layout/Sidebar';
import ElderCard from '@/components/ui/ElderCard';
import MoodChart from '@/components/ui/MoodChart';
import DistressAlert from '@/components/ui/DistressAlert';
import LiveIndicator from '@/components/ui/LiveIndicator';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const [elders, setElders] = useState<any[]>([]);
  const [selectedElderId, setSelectedElderId] = useState<string>('');
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [triggeringCall, setTriggeringCall] = useState(false);

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

  const moodDelta = useMemo(() => {
    if (!dashboard?.memories || dashboard.memories.length < 2) return null;
    return Number((Number(dashboard.memories[0]?.mood_score || 0) - Number(dashboard.memories[1]?.mood_score || 0)).toFixed(1));
  }, [dashboard]);

  const chartBounds = useMemo(() => {
    if (!chartData.length) {
      return { low: null as null | number, high: null as null | number };
    }
    const scores = chartData.map((item) => item.score);
    return {
      low: Math.min(...scores),
      high: Math.max(...scores)
    };
  }, [chartData]);

  const nextCallText = selectedElder?.schedule_time ? `Daily at ${selectedElder.schedule_time}` : 'Schedule not set';

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

  return (
    <main className="flex min-h-screen bg-background">
      <Sidebar elder={selectedElder} onTriggerCall={triggerCall} />

      <section className="flex-1 p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold lg:text-3xl">Family Dashboard</h1>
            <p className="text-sm text-gray-400">Track mood, calls, safety and memory across every elder profile.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/onboard" className="rounded-xl border border-border px-4 py-2 text-sm hover:border-accent">
              + Add Elder
            </Link>
            <select
              value={selectedElderId}
              onChange={(e) => setSelectedElderId(e.target.value)}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
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

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="soft-card bg-gradient-to-br from-card to-card/80 p-4">
            <p className="text-sm text-gray-400">Last Call</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {latestCall?.created_at
                ? new Date(latestCall.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
                : 'No call yet'}
            </p>
            <p className="mt-1 text-sm text-gray-300">
              Duration: {Math.max(1, Math.round((latestCall?.duration_seconds || 0) / 60))} min · {latestMemory?.mood_score ? '😊' : '—'}
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="soft-card bg-gradient-to-br from-card to-card/80 p-4">
            <p className="text-sm text-gray-400">Mood Score</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-400">{latestMemory?.mood_score ?? 0} / 10</p>
            <p className="mt-1 text-sm text-gray-300">
              {moodDelta === null ? 'Trend building...' : moodDelta >= 0 ? `↑ ${moodDelta} vs last call` : `↓ ${Math.abs(moodDelta)} vs last call`}
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="soft-card bg-gradient-to-br from-card to-card/80 p-4">
            <p className="text-sm text-gray-400">Next Call</p>
            <p className="mt-1 text-xl font-semibold text-white">{nextCallText}</p>
            <p className="mt-1 text-sm text-gray-300">{selectedElder?.is_active ? 'Active schedule' : 'Paused'}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="soft-card bg-gradient-to-br from-card to-card/80 p-4">
            <p className="text-sm text-gray-400">Safety & Alerts</p>
            <p className="mt-1 text-2xl font-semibold text-white">{dashboard?.armoriq_blocks_count ?? 0}</p>
            <p className="mt-1 text-sm text-gray-300">ArmorIQ interventions logged</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            {!!chartData.length && <MoodChart data={chartData} />}

            <div className="soft-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Today&apos;s Conversation</h2>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs text-gray-300">
                  {latestMemory?.created_at ? formatDistanceToNow(new Date(latestMemory.created_at), { addSuffix: true }) : 'No update'}
                </span>
              </div>

              <p className="text-gray-200">{latestMemory?.summary || 'No summary yet. Trigger a call to generate memory insights.'}</p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">Topics discussed</p>
                  <div className="flex flex-wrap gap-2">
                    {(latestMemory?.key_topics || []).length ? (
                      (latestMemory?.key_topics || []).map((tag: string) => (
                        <span key={tag} className="rounded-full bg-accent/20 px-3 py-1 text-xs text-violet-200">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No topics available</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">People mentioned</p>
                  <div className="flex flex-wrap gap-2">
                    {(latestMemory?.people_mentioned || []).length ? (
                      (latestMemory?.people_mentioned || []).map((person: string) => (
                        <span key={person} className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-200">
                          {person}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No people mentioned</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">Ask next time</p>
                {(latestMemory?.follow_up_questions || []).length ? (
                  <ul className="space-y-1 text-sm text-gray-300">
                    {(latestMemory?.follow_up_questions || []).slice(0, 3).map((question: string) => (
                      <li key={question}>• {question}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No follow-up prompts yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="soft-card p-5">
              <h3 className="text-base font-semibold">Health Snapshot</h3>
              <p className="mt-1 text-sm text-gray-400">Current elder profile highlights</p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-lg bg-white/5 p-3">
                  <p className="text-gray-400">Primary Contact</p>
                  <p className="mt-1 text-white">{selectedElder?.family?.[0]?.name || 'Not set'}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <p className="text-gray-400">Health Mentions</p>
                  <p className="mt-1 text-white">{(latestMemory?.health_mentions || []).join(', ') || 'No major concerns'}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <p className="text-gray-400">Mood Range (7 days)</p>
                  <p className="mt-1 text-white">
                    {chartBounds.low === null ? 'No data' : `${chartBounds.low} → ${chartBounds.high}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="soft-card p-5">
              <h3 className="text-base font-semibold">Quick Actions</h3>
              <div className="mt-4 space-y-2">
                <button
                  onClick={triggerCall}
                  disabled={triggeringCall || !selectedElderId}
                  className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-glow-violet disabled:opacity-60"
                >
                  {triggeringCall ? 'Triggering call...' : 'Trigger Call'}
                </button>
                <Link href={selectedElderId ? `/dashboard/${selectedElderId}` : '/dashboard'} className="block w-full rounded-lg border border-border px-4 py-2 text-center text-sm text-gray-200 hover:border-accent">
                  Open Detailed Profile
                </Link>
                <Link href="/onboard" className="block w-full rounded-lg border border-border px-4 py-2 text-center text-sm text-gray-200 hover:border-accent">
                  Add Another Elder
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">All Elders</h2>
            <p className="text-xs text-gray-400">{elders.length} profile{elders.length === 1 ? '' : 's'}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {elders.map((elder) => (
              <ElderCard key={elder._id} elder={elder} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
