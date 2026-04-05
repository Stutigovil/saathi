'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AuthGuard from '@/components/auth/AuthGuard';
import { api } from '@/lib/api';
import { User, Phone, MapPin, Globe, Calendar, ArrowRight, Sparkles, Sun, HeartHandshake } from 'lucide-react';

export default function OnboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [form, setForm] = useState({
    name: '',
    relationship: '',
    age: 70,
    phone: '',
    city: 'Jabalpur',
    language: 'Hindi',
    schedule_time: '18:00'
  });

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!form.name.trim()) {
      setErrorMessage('Please enter elder name.');
      return;
    }

    if (!form.phone.trim()) {
      setErrorMessage('Please enter elder phone number.');
      return;
    }

    if (!form.relationship.trim()) {
      setErrorMessage('Please enter your relation with the elder.');
      return;
    }

    if (Number(form.age) < 40 || Number(form.age) > 120) {
      setErrorMessage('Please enter a valid elder age.');
      return;
    }

    setLoading(true);
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
        family: [],
        known_info: {
          notes_from_family: `Primary family relation: ${form.relationship.trim()}`
        }
      });

      router.push('/dashboard');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to add elder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-background">
        <div className="pointer-events-none fixed inset-0 mesh-gradient opacity-40" />

        <div className="relative mx-auto max-w-3xl px-6 py-8 lg:py-12">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-glow-amber">
              <Sun className="h-7 w-7 text-black" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-white">
              Add <span className="gradient-text">Elder</span>
            </h1>
            <p className="mt-2 text-sm text-muted">Single page setup with elder details and call number.</p>
          </motion.div>

          <form onSubmit={submit}>
            <div className="glass-card-strong overflow-hidden p-6 lg:p-8">
              {errorMessage ? (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                >
                  {errorMessage}
                </motion.div>
              ) : null}

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    <User className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                    Elder Name
                  </label>
                  <input
                    required
                    className="input-glass"
                    placeholder="Kamla Devi"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    <HeartHandshake className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                    Your Relation with Elder
                  </label>
                  <input
                    required
                    className="input-glass"
                    placeholder="Daughter / Son / Brother"
                    value={form.relationship}
                    onChange={(e) => updateField('relationship', e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Age</label>
                  <input
                    required
                    type="number"
                    min={40}
                    max={120}
                    className="input-glass"
                    value={form.age}
                    onChange={(e) => updateField('age', Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    <Phone className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                    Elder Phone Number
                  </label>
                  <input
                    required
                    className="input-glass"
                    placeholder="+91 91234 56789"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    <MapPin className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                    City
                  </label>
                  <input
                    required
                    className="input-glass"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    <Globe className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                    Preferred Language
                  </label>
                  <input
                    required
                    className="input-glass"
                    value={form.language}
                    onChange={(e) => updateField('language', e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    <Calendar className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                    Daily Call Time (IST)
                  </label>
                  <input
                    required
                    type="time"
                    className="input-glass"
                    value={form.schedule_time}
                    onChange={(e) => updateField('schedule_time', e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
                <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                <p className="text-sm text-muted">You can update family profile and all settings later from Settings.</p>
              </div>

              <div className="mt-8 flex justify-end border-t border-white/[0.06] pt-6">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary group flex items-center gap-2 text-sm"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                      Saving...
                    </div>
                  ) : (
                    <>
                      Save Elder
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </AuthGuard>
  );
}
