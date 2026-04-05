'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  Sun,
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Users,
  Phone,
  MessageCircle,
  HeartHandshake,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Account' },
  { id: 2, title: 'Family Profile' }
];

export default function SignUpPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [familyName, setFamilyName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [familyPhone, setFamilyPhone] = useState('');
  const [familyWhatsapp, setFamilyWhatsapp] = useState('');
  const [platformReason, setPlatformReason] = useState('');

  const validateStep1 = () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) return 'Please enter your full name.';
    if (!cleanEmail || !cleanEmail.includes('@')) return 'Please enter a valid email.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  };

  const validateStep2 = () => {
    if (!familyName.trim()) return 'Please enter family member name.';
    if (!relationship.trim()) return 'Please enter relationship with elder.';
    if (!familyPhone.trim()) return 'Please enter family phone number.';
    if (!familyWhatsapp.trim()) return 'Please enter family WhatsApp number.';
    if (!platformReason.trim()) return 'Please add why you need Saathi.';
    return '';
  };

  const onContinue = () => {
    setError('');
    const validationError = validateStep1();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep(2);
  };

  const onBack = () => {
    setError('');
    setStep(1);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const step2Error = validateStep2();
    if (step2Error) {
      setError(step2Error);
      return;
    }

    setLoading(true);
    try {
      const result = await api.signUp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        family_profile: {
          member_name: familyName.trim(),
          relationship_with_elder: relationship.trim(),
          phone: familyPhone.trim(),
          whatsapp: familyWhatsapp.trim(),
          platform_reason: platformReason.trim()
        }
      });

      auth.setSession(result);
      router.push('/onboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-background to-violet-500/10" />
        <div className="absolute inset-0 mesh-gradient" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 px-12 text-center"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-glow-amber"
          >
            <Sun className="h-10 w-10 text-black" />
          </motion.div>

          <h2 className="font-heading text-3xl font-bold text-white">
            Welcome to <span className="gradient-text">Saathi</span>
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-muted">
            First-time setup has two stages: account and family profile.
          </p>
        </motion.div>
      </div>

      <div className="flex items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
              <Sun className="h-5 w-5 text-black" />
            </div>
            <span className="font-heading text-xl font-bold">Saathi</span>
          </div>

          <h1 className="font-heading text-2xl font-bold text-white md:text-3xl">Create your account</h1>
          <p className="mt-2 text-sm text-muted">Stage {step} of 2</p>

          <div className="mt-5 flex items-center justify-between">
            {STEPS.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <div className={`flex h-6 w-6 items-center justify-center rounded-md ${item.id <= step ? 'bg-accent/20 text-accent' : 'bg-white/[0.05] text-muted-dark'}`}>
                  {item.id < step ? <Check className="h-3.5 w-3.5" /> : item.id}
                </div>
                <span className={item.id <= step ? 'text-gray-200' : 'text-muted-dark'}>{item.title}</span>
              </div>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            {error ? (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </motion.div>
            ) : null}

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="stage-account"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-300">Full name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-dark" />
                      <input required className="input-glass pl-10" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-dark" />
                      <input required type="email" className="input-glass pl-10" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-300">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-dark" />
                      <input
                        required
                        type={showPassword ? 'text' : 'password'}
                        minLength={6}
                        className="input-glass pl-10 pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-dark transition-colors hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="stage-family"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-300">
                      <Users className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                      Family member name
                    </label>
                    <input required className="input-glass" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-300">
                      <HeartHandshake className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                      Relationship with elder
                    </label>
                    <input required className="input-glass" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-300">
                      <Phone className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                      Phone number
                    </label>
                    <input required className="input-glass" value={familyPhone} onChange={(e) => setFamilyPhone(e.target.value)} />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-300">
                      <MessageCircle className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                      WhatsApp number
                    </label>
                    <input required className="input-glass" value={familyWhatsapp} onChange={(e) => setFamilyWhatsapp(e.target.value)} />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-300">
                      <FileText className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-muted-dark" />
                      Why do you need Saathi?
                    </label>
                    <textarea required className="input-glass min-h-24" value={platformReason} onChange={(e) => setPlatformReason(e.target.value)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between pt-2">
              {step === 2 ? (
                <button type="button" onClick={onBack} className="btn-ghost flex items-center gap-2 text-sm">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {step === 1 ? (
                <button type="button" onClick={onContinue} className="btn-primary flex items-center gap-2 text-sm">
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="btn-primary group flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                      Creating account...
                    </div>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link href="/signin" className="font-medium text-accent transition-colors hover:text-accent-hover">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
