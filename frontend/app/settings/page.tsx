'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const firstTime = searchParams.get('firstTime') === '1';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [name, setName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const data = await api.me();
        setName(data.user?.name || '');
        setFamilyName(data.user?.family_profile?.member_name || '');
        setRelationship(data.user?.family_profile?.relationship_with_elder || '');
        setPhone(data.user?.family_profile?.phone || '');
        setWhatsapp(data.user?.family_profile?.whatsapp || '');
        setReason(data.user?.family_profile?.platform_reason || '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!name.trim()) {
      setError('Please enter account name.');
      return;
    }

    if (!familyName.trim() || !relationship.trim() || !phone.trim() || !whatsapp.trim() || !reason.trim()) {
      setError('Please complete all family profile fields.');
      return;
    }

    setSaving(true);
    try {
      await api.updateProfile({
        name: name.trim(),
        family_profile: {
          member_name: familyName.trim(),
          relationship_with_elder: relationship.trim(),
          phone: phone.trim(),
          whatsapp: whatsapp.trim(),
          platform_reason: reason.trim()
        }
      });

      setMessage(firstTime ? 'Profile setup completed. You can now add elders.' : 'Settings updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
          <header>
            <h1 className="text-2xl font-semibold text-white">Settings</h1>
            <p className="text-sm text-gray-400">
              {firstTime
                ? 'Complete first-time setup. You can change these details anytime.'
                : 'Update family profile and preferences anytime.'}
            </p>
          </header>

          <section className="soft-card p-5">
            {loading ? (
              <p className="text-sm text-gray-400">Loading settings...</p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                {error ? <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
                {message ? <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    className="rounded-lg border border-border bg-background px-3 py-2"
                    placeholder="Account name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />

                  <input
                    className="rounded-lg border border-border bg-background px-3 py-2"
                    placeholder="Family member name"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                  />

                  <input
                    className="rounded-lg border border-border bg-background px-3 py-2"
                    placeholder="Relationship with elder"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                  />

                  <input
                    className="rounded-lg border border-border bg-background px-3 py-2"
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />

                  <input
                    className="rounded-lg border border-border bg-background px-3 py-2 md:col-span-2"
                    placeholder="WhatsApp number"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />

                  <textarea
                    className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 md:col-span-2"
                    placeholder="Why you need Saathi"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </main>
      </div>
    </AuthGuard>
  );
}
