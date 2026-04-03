'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function OnboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    age: 70,
    phone: '',
    city: 'Jabalpur',
    language: 'Hindi',
    schedule_time: '18:00',
    family_name: '',
    family_phone: '',
    family_whatsapp: ''
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      await api.createElder({
        name: form.name.trim(),
        age: Number(form.age),
        phone: form.phone.trim(),
        city: form.city.trim(),
        language: form.language.trim(),
        schedule_time: form.schedule_time,
        schedule_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        is_active: true,
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
      router.push('/dashboard');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save elder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Add New Elder</h1>
      <p className="mb-6 text-sm text-gray-400">Create a new daily-call profile and connect family contacts.</p>

      <form onSubmit={submit} className="soft-card space-y-4 p-6">
        {errorMessage ? <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{errorMessage}</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <input required placeholder="Name" className="rounded-lg border border-border bg-background px-3 py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input required type="number" placeholder="Age" className="rounded-lg border border-border bg-background px-3 py-2" value={form.age} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} />
          <input required placeholder="Phone" className="rounded-lg border border-border bg-background px-3 py-2" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input required placeholder="City" className="rounded-lg border border-border bg-background px-3 py-2" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input required placeholder="Language" className="rounded-lg border border-border bg-background px-3 py-2" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
          <input required placeholder="Schedule Time (HH:MM)" className="rounded-lg border border-border bg-background px-3 py-2" value={form.schedule_time} onChange={(e) => setForm({ ...form, schedule_time: e.target.value })} />
        </div>

        <h2 className="pt-2 text-sm font-semibold text-gray-200">Primary Family Contact</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <input required placeholder="Family Name" className="rounded-lg border border-border bg-background px-3 py-2" value={form.family_name} onChange={(e) => setForm({ ...form, family_name: e.target.value })} />
          <input required placeholder="Phone" className="rounded-lg border border-border bg-background px-3 py-2" value={form.family_phone} onChange={(e) => setForm({ ...form, family_phone: e.target.value })} />
          <input required placeholder="WhatsApp" className="rounded-lg border border-border bg-background px-3 py-2 md:col-span-2" value={form.family_whatsapp} onChange={(e) => setForm({ ...form, family_whatsapp: e.target.value })} />
        </div>

        <button disabled={loading} className="w-full rounded-xl bg-accent px-4 py-3 font-medium text-white shadow-glow-violet disabled:opacity-60">
          {loading ? 'Saving...' : 'Save Elder'}
        </button>
      </form>
    </main>
  );
}
