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

const toLocalDateTimeInputValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

export default function ElderDetailPage() {
  const params = useParams<{ elderId: string }>();
  const elderId = params.elderId;
  const [data, setData] = useState<any | null>(null);
  const [armor, setArmor] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [voiceSaving, setVoiceSaving] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [voiceName, setVoiceName] = useState('');
  const [cloneAudio, setCloneAudio] = useState<VoiceCloneAudioPayload | null>(null);
  const [reminderForm, setReminderForm] = useState({
    call_type: 'followup' as 'reminder' | 'followup',
    scheduled_for: toLocalDateTimeInputValue(new Date(Date.now() + 60 * 60 * 1000)),
    context_topic: '',
    context_notes: ''
  });
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
    api.getCallReminders(elderId).then(setReminders).catch(() => {
      // Ignore list fetch errors silently during first load.
    });
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

  const updateReminderField = (key: string, value: string) => {
    setReminderForm((prev) => ({ ...prev, [key]: value }));
  };

  const scheduleReminderCall = async () => {
    if (!elderId) return;
    if (!reminderForm.context_topic.trim()) {
      setErrorMessage('Please add a short topic for the reminder/follow-up call.');
      return;
    }

    setReminderSaving(true);
    setSaveMessage('');
    setErrorMessage('');

    try {
      const response = await api.createCallReminder(elderId, {
        call_type: reminderForm.call_type,
        scheduled_for: new Date(reminderForm.scheduled_for).toISOString(),
        context_topic: reminderForm.context_topic.trim(),
        context_notes: reminderForm.context_notes.trim()
      });

      setReminders((prev) => [response.reminder, ...prev]);
      setSaveMessage(response.message || 'Reminder scheduled successfully.');
      setReminderForm((prev) => ({
        ...prev,
        scheduled_for: toLocalDateTimeInputValue(new Date(Date.now() + 60 * 60 * 1000)),
        context_topic: '',
        context_notes: ''
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to schedule reminder call.');
    } finally {
      setReminderSaving(false);
    }
  };

  const cancelReminderCall = async (reminderId: string) => {
    setReminderSaving(true);
    setSaveMessage('');
    setErrorMessage('');
    try {
      const response = await api.cancelCallReminder(reminderId);
      setReminders((prev) => prev.map((item) => (item._id === reminderId ? response.reminder : item)));
      setSaveMessage(response.message || 'Reminder cancelled.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to cancel reminder.');
    } finally {
      setReminderSaving(false);
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
            <p className="text-sm font-semibold text-emerald-200">Manage voice and special reminder calls</p>
            <p className="text-xs text-emerald-100/90">
              Use quick links to jump to Voice Cloning and Reminder/Follow-up scheduling.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="#voice-cloning"
              className="rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100"
            >
              Jump to Voice Cloning
            </Link>
            <Link
              href="#reminder-calls"
              className="rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100"
            >
              Jump to Reminder Calls
            </Link>
          </div>
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

      <section id="reminder-calls" className="soft-card space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Reminder or Follow-up Calls</h2>
          <button
            onClick={scheduleReminderCall}
            disabled={reminderSaving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {reminderSaving ? 'Saving...' : 'Schedule Call'}
          </button>
        </div>

        <p className="text-sm text-gray-400">
          Add a one-time call with context so Saathi opens the conversation around your chosen topic.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <select
            className="rounded-lg border border-border bg-background px-3 py-2"
            value={reminderForm.call_type}
            onChange={(e) => updateReminderField('call_type', e.target.value)}
          >
            <option value="followup">Follow-up call</option>
            <option value="reminder">Reminder call</option>
          </select>

          <input
            className="rounded-lg border border-border bg-background px-3 py-2"
            type="datetime-local"
            value={reminderForm.scheduled_for}
            onChange={(e) => updateReminderField('scheduled_for', e.target.value)}
          />

          <input
            className="rounded-lg border border-border bg-background px-3 py-2 md:col-span-2"
            placeholder="Context topic (e.g. medicine reminder, doctor visit follow-up)"
            value={reminderForm.context_topic}
            onChange={(e) => updateReminderField('context_topic', e.target.value)}
          />

          <textarea
            className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 md:col-span-2"
            placeholder="Extra notes for the call (optional)"
            value={reminderForm.context_notes}
            onChange={(e) => updateReminderField('context_notes', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-200">Scheduled Reminder Calls</h3>
          {!reminders.length ? <p className="text-sm text-gray-400">No reminder calls scheduled yet.</p> : null}

          {reminders.map((item) => {
            const localTime = item?.scheduled_for
              ? new Date(item.scheduled_for).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Unknown';
            const canCancel = item.status === 'pending';

            return (
              <div key={item._id} className="rounded-lg border border-border bg-background/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">{item.context_topic}</p>
                  <span className="rounded-md border border-border px-2 py-1 text-xs uppercase text-gray-300">{item.status}</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {item.call_type === 'reminder' ? 'Reminder' : 'Follow-up'} • {localTime}
                </p>
                {item.context_notes ? <p className="mt-1 text-sm text-gray-300">{item.context_notes}</p> : null}

                {canCancel ? (
                  <button
                    onClick={() => cancelReminderCall(item._id)}
                    disabled={reminderSaving}
                    className="mt-2 rounded-md border border-border px-3 py-1 text-xs text-gray-200 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
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
