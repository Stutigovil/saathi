'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import MemoryTimeline from '@/components/ui/MemoryTimeline';
import ArmorIQLog from '@/components/ui/ArmorIQLog';
import CallHistory from '@/components/ui/CallHistory';
import VoiceCloneInput, { VoiceCloneAudioPayload } from '@/components/ui/VoiceCloneInput';
import { api } from '@/lib/api';

export default function ElderDetailPage() {
  const params = useParams<{ elderId: string }>();
  const elderId = params.elderId;
  const [data, setData] = useState<any | null>(null);
  const [armor, setArmor] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [voiceSaving, setVoiceSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [voiceName, setVoiceName] = useState('');
  const [cloneAudio, setCloneAudio] = useState<VoiceCloneAudioPayload | null>(null);
  const [form, setForm] = useState({
    name: '',
    age: 70,
    phone: '',
    city: '',
    language: 'Hindi',
    schedule_time: '18:00',
    family_name: '',
    family_phone: '',
    family_whatsapp: ''
  });

  useEffect(() => {
    if (!elderId) return;
    api.getElderDashboard(elderId).then((response) => {
      setData(response);
      const elder = response?.elder;
      const primaryFamily = elder?.family?.[0] || {};
      if (elder) {
        setVoiceName(elder.voice_name || `${elder.name || 'Elder'} Voice`);
        setForm({
          name: elder.name || '',
          age: Number(elder.age || 70),
          phone: elder.phone || '',
          city: elder.city || '',
          language: elder.language || 'Hindi',
          schedule_time: elder.schedule_time || '18:00',
          family_name: primaryFamily.name || '',
          family_phone: primaryFamily.phone || '',
          family_whatsapp: primaryFamily.whatsapp || ''
        });
      }
    });
    api.getArmorLog(elderId).then(setArmor);
  }, [elderId]);

  const updateField = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveProfile = async () => {
    if (!elderId) return;

    setSaving(true);
    setSaveMessage('');
    setErrorMessage('');

    try {
      const updated = await api.updateElder(elderId, {
        name: form.name.trim(),
        age: Number(form.age),
        phone: form.phone.trim(),
        city: form.city.trim(),
        language: form.language.trim(),
        schedule_time: form.schedule_time,
        family: [
          {
            name: form.family_name.trim(),
            relationship: 'Family',
            phone: form.family_phone.trim(),
            whatsapp: form.family_whatsapp.trim(),
            is_primary: true
          }
        ]
      });

      setData((prev: any) => ({ ...prev, elder: updated }));
      setSaveMessage('Elder details updated successfully.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update elder details.');
    } finally {
      setSaving(false);
    }
  };

  const saveVoiceClone = async () => {
    if (!elderId || !cloneAudio?.audioBase64) {
      setErrorMessage('Please upload or record audio before cloning voice.');
      return;
    }

    setVoiceSaving(true);
    setSaveMessage('');
    setErrorMessage('');

    try {
      const response = await api.cloneElderVoice(elderId, {
        audio_base64: cloneAudio.audioBase64,
        file_name: cloneAudio.fileName,
        mime_type: cloneAudio.mimeType,
        voice_name: voiceName.trim() || `${form.name.trim()} Voice`
      });

      setData((prev: any) => ({ ...prev, elder: response.elder }));
      setSaveMessage('Voice cloned successfully. New voice will be used in upcoming calls.');
      setCloneAudio(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to clone voice.');
    } finally {
      setVoiceSaving(false);
    }
  };

  const resetVoiceClone = async () => {
    if (!elderId) return;

    setVoiceSaving(true);
    setSaveMessage('');
    setErrorMessage('');

    try {
      const response = await api.resetElderVoice(elderId);
      setData((prev: any) => ({ ...prev, elder: response.elder }));
      setSaveMessage('Voice reset to default env voice (Monika).');
      setCloneAudio(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to reset voice.');
    } finally {
      setVoiceSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold">{data?.elder?.name || 'Elder'} — Detail View</h1>
        <p className="text-sm text-gray-400">Memory timeline, safety interventions, and full call history</p>
      </header>

      <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-200">Looking for voice upload?</p>
            <p className="text-xs text-emerald-100/90">
              Use the Voice Cloning section below to record/upload audio and clone voice.
            </p>
          </div>
          <Link
            href="#voice-cloning"
            className="rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100"
          >
            Jump to Voice Cloning
          </Link>
        </div>
      </section>

      <section className="soft-card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Elder Profile</h2>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {saveMessage ? <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{saveMessage}</p> : null}
        {errorMessage ? <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{errorMessage}</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder="Name" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" type="number" placeholder="Age" value={form.age} onChange={(e) => updateField('age', Number(e.target.value))} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder="Phone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder="City" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder="Language" value={form.language} onChange={(e) => updateField('language', e.target.value)} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" type="time" placeholder="Schedule Time (HH:MM)" value={form.schedule_time} onChange={(e) => updateField('schedule_time', e.target.value)} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder="Family Name" value={form.family_name} onChange={(e) => updateField('family_name', e.target.value)} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder="Family Phone" value={form.family_phone} onChange={(e) => updateField('family_phone', e.target.value)} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 md:col-span-2" placeholder="Family WhatsApp" value={form.family_whatsapp} onChange={(e) => updateField('family_whatsapp', e.target.value)} />
        </div>
      </section>

      <section id="voice-cloning" className="soft-card space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Voice Cloning</h2>
          <div className="flex gap-2">
            <button
              onClick={saveVoiceClone}
              disabled={voiceSaving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {voiceSaving ? 'Saving...' : 'Clone Voice'}
            </button>
            <button
              onClick={resetVoiceClone}
              disabled={voiceSaving}
              className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60"
            >
              Use Default Voice
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-400">
          Current voice: {data?.elder?.voice_name ? `${data.elder.voice_name} (${data.elder.voice_id})` : 'Default env voice (Monika)'}
        </p>

        <input
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
          placeholder="Voice name"
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
        />

        <VoiceCloneInput onAudioChange={setCloneAudio} disabled={voiceSaving} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Memory Timeline</h2>
        <MemoryTimeline memories={data?.memories || []} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">ArmorIQ Safety Log</h2>
        <ArmorIQLog rows={armor} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Call History</h2>
        <CallHistory calls={data?.last_calls || []} />
      </section>
      </main>
      </div>
    </AuthGuard>
  );
}
