'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import AuthGuard from '@/components/auth/AuthGuard';
import VoiceCloneInput, { VoiceCloneAudioPayload } from '@/components/ui/VoiceCloneInput';
import {
  User, Phone, MapPin, Globe, Calendar, Clock,
  Users, MessageCircle, Mic, ChevronLeft, ChevronRight,
  ArrowRight, Check, Sparkles, Sun
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Elder Details', description: 'Tell us about your loved one', icon: User },
  { id: 2, title: 'Call Schedule', description: 'When should Saathi call?', icon: Calendar },
  { id: 3, title: 'Family Contact', description: 'Who should we keep updated?', icon: Users },
  { id: 4, title: 'Voice Clone', description: 'Optional — personalize the voice', icon: Mic }
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0
  })
};

export default function OnboardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [voiceName, setVoiceName] = useState('');
  const [cloneAudio, setCloneAudio] = useState<VoiceCloneAudioPayload | null>(null);
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

  const updateField = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (): string | null => {
    switch (currentStep) {
      case 1:
        if (!form.name.trim()) return 'Please enter the elder\'s name.';
        if (!form.phone.trim()) return 'Please enter a phone number.';
        if (form.age < 40 || form.age > 120) return 'Please enter a valid age.';
        return null;
      case 2:
        if (!form.schedule_time) return 'Please select a call time.';
        return null;
      case 3:
        if (!form.family_name.trim()) return 'Please enter family contact name.';
        if (!form.family_phone.trim()) return 'Please enter family phone number.';
        if (!form.family_whatsapp.trim()) return 'Please enter WhatsApp number.';
        return null;
      case 4:
        return null; // Voice clone is optional
      default:
        return null;
    }
  };

  const goNext = () => {
    setErrorMessage('');
    const validationError = validateStep();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const goBack = () => {
    setErrorMessage('');
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const elder = await api.createElder({
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

      if (cloneAudio?.audioBase64 && elder?._id) {
        await api.cloneElderVoice(elder._id, {
          audio_base64: cloneAudio.audioBase64,
          file_name: cloneAudio.fileName,
          mime_type: cloneAudio.mimeType,
          voice_name: voiceName.trim() || `${form.name.trim()} Voice`
        });
      }

      router.push('/dashboard');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save elder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <AuthGuard>
      <main className="min-h-screen bg-background">
        {/* Background */}
        <div className="pointer-events-none fixed inset-0 mesh-gradient opacity-40" />

        <div className="relative mx-auto max-w-3xl px-6 py-8 lg:py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-glow-amber">
              <Sun className="h-7 w-7 text-black" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-white">
              Onboarding <span className="gradient-text">Setup</span>
            </h1>
            <p className="mt-2 text-sm text-muted">
              Create an elder profile, set call schedule, and connect family.
            </p>
          </motion.div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="relative mb-4">
              {/* Background track */}
              <div className="h-1.5 w-full rounded-full bg-white/[0.06]" />
              {/* Filled track */}
              <motion.div
                className="absolute left-0 top-0 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-accent"
                initial={{ width: '25%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            {/* Step indicators */}
            <div className="flex justify-between">
              {STEPS.map(({ id, title, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    if (id < currentStep) {
                      setDirection(-1);
                      setCurrentStep(id);
                    }
                  }}
                  className={`group flex items-center gap-2 text-xs transition-all ${
                    id === currentStep
                      ? 'text-accent'
                      : id < currentStep
                        ? 'cursor-pointer text-emerald-400'
                        : 'text-muted-dark'
                  }`}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                    id === currentStep
                      ? 'bg-accent/20 text-accent'
                      : id < currentStep
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/[0.04] text-muted-dark'
                  }`}>
                    {id < currentStep ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span className="hidden md:inline">{title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <form onSubmit={submit}>
            <div className="glass-card-strong overflow-hidden p-6 lg:p-8">
              {/* Error */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  >
                    {errorMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step Content */}
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  {/* Step 1: Elder Details */}
                  {currentStep === 1 && (
                    <div className="space-y-5">
                      <div className="mb-6">
                        <h2 className="font-heading text-xl font-semibold text-white">Elder Details</h2>
                        <p className="mt-1 text-sm text-muted">Basic information about your loved one.</p>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-300">
                            <User className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                            Name
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
                          <label className="mb-1.5 block text-sm font-medium text-gray-300">Age</label>
                          <input
                            required
                            type="number"
                            min={40}
                            max={120}
                            className="input-glass"
                            placeholder="70"
                            value={form.age}
                            onChange={(e) => updateField('age', Number(e.target.value))}
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-300">
                            <Phone className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                            Phone
                          </label>
                          <input
                            required
                            className="input-glass"
                            placeholder="+91 98765 43210"
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
                            placeholder="Jabalpur"
                            value={form.city}
                            onChange={(e) => updateField('city', e.target.value)}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-1.5 block text-sm font-medium text-gray-300">
                            <Globe className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                            Language
                          </label>
                          <input
                            required
                            className="input-glass"
                            placeholder="Hindi"
                            value={form.language}
                            onChange={(e) => updateField('language', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Schedule */}
                  {currentStep === 2 && (
                    <div className="space-y-5">
                      <div className="mb-6">
                        <h2 className="font-heading text-xl font-semibold text-white">Call Schedule</h2>
                        <p className="mt-1 text-sm text-muted">Set when Saathi should call every day.</p>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-300">
                          <Clock className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                          Daily Call Time (IST)
                        </label>
                        <input
                          required
                          type="time"
                          className="input-glass max-w-xs"
                          value={form.schedule_time}
                          onChange={(e) => updateField('schedule_time', e.target.value)}
                        />
                      </div>

                      {/* Schedule Info Card */}
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
                        <h3 className="mb-3 text-sm font-medium text-gray-300">Schedule Preview</h3>

                        <div className="grid grid-cols-7 gap-2">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                            <div
                              key={day}
                              className="flex flex-col items-center gap-1.5 rounded-xl bg-accent/5 p-3 transition-colors"
                            >
                              <span className="text-xs font-medium text-muted">{day}</span>
                              <div className="h-2 w-2 rounded-full bg-accent" />
                              <span className="text-xs text-accent">{form.schedule_time}</span>
                            </div>
                          ))}
                        </div>

                        <p className="mt-4 text-xs text-muted-dark">
                          Saathi will call every day at {form.schedule_time} IST. If no answer, an automatic retry happens 10 minutes later.
                        </p>
                      </div>

                      {/* Tip */}
                      <div className="flex items-start gap-3 rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
                        <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                        <p className="text-sm text-muted">
                          <span className="font-medium text-amber-300">Tip:</span> Evening calls between 5–7 PM tend to have the highest answer rates and longest conversations.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Family Contact */}
                  {currentStep === 3 && (
                    <div className="space-y-5">
                      <div className="mb-6">
                        <h2 className="font-heading text-xl font-semibold text-white">Family Contact</h2>
                        <p className="mt-1 text-sm text-muted">Who should receive updates and alerts?</p>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-300">
                            <User className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                            Contact Name
                          </label>
                          <input
                            required
                            className="input-glass"
                            placeholder="Priya Sharma"
                            value={form.family_name}
                            onChange={(e) => updateField('family_name', e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-300">
                            <Phone className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                            Phone Number
                          </label>
                          <input
                            required
                            className="input-glass"
                            placeholder="+91 98765 43210"
                            value={form.family_phone}
                            onChange={(e) => updateField('family_phone', e.target.value)}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-1.5 block text-sm font-medium text-gray-300">
                            <MessageCircle className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                            WhatsApp Number
                          </label>
                          <input
                            required
                            className="input-glass"
                            placeholder="+91 98765 43210"
                            value={form.family_whatsapp}
                            onChange={(e) => updateField('family_whatsapp', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* What family gets */}
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
                        <h3 className="mb-3 text-sm font-medium text-gray-300">What you&apos;ll receive</h3>
                        <div className="space-y-3">
                          {[
                            { icon: '📊', text: 'Daily mood scores after each call' },
                            { icon: '🚨', text: 'Instant distress and safety alerts' },
                            { icon: '💬', text: 'Conversation summaries via WhatsApp' },
                            { icon: '📈', text: 'Weekly health and mood trend reports' }
                          ].map(({ icon, text }) => (
                            <div key={text} className="flex items-center gap-3">
                              <span className="text-lg">{icon}</span>
                              <span className="text-sm text-muted">{text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Voice Clone */}
                  {currentStep === 4 && (
                    <div className="space-y-5">
                      <div className="mb-6">
                        <h2 className="font-heading text-xl font-semibold text-white">Voice Clone</h2>
                        <p className="mt-1 text-sm text-muted">Optional — make Saathi sound like a familiar voice.</p>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-300">
                          Custom Voice Name
                        </label>
                        <input
                          className="input-glass"
                          placeholder="e.g. Nani Voice"
                          value={voiceName}
                          onChange={(e) => setVoiceName(e.target.value)}
                        />
                      </div>

                      <VoiceCloneInput onAudioChange={setCloneAudio} disabled={loading} />

                      <div className="flex items-start gap-3 rounded-xl border border-violet-500/10 bg-violet-500/5 p-4">
                        <Mic className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-400" />
                        <p className="text-sm text-muted">
                          <span className="font-medium text-violet-300">Note:</span> If no sample is provided, Saathi uses the default warm Hindi voice (Monika). You can always add or change this later from the dashboard.
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-6">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={goBack}
                    className="btn-ghost flex items-center gap-2 text-sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="btn-primary flex items-center gap-2 text-sm"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
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
                        Saving…
                      </div>
                    ) : (
                      <>
                        Save & Start
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </form>
        </div>
      </main>
    </AuthGuard>
  );
}
