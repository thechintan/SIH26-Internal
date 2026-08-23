'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Loader2, Eye, EyeOff, MapPin, CheckCircle, ArrowRight, ShieldCheck, Bell, Users } from 'lucide-react';

const PERKS = [
  {
    icon: Bell,
    title: 'Stay in the loop',
    body: "Get notified when your report's status changes — from filed to fixed.",
  },
  {
    icon: Users,
    title: 'Strength in numbers',
    body: 'More reports on the same problem push it up the priority queue automatically.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified resolutions',
    body: 'Field workers upload proof photos. You confirm whether the fix actually happened.',
  },
];

export default function SignUpPage() {
  const [mode, setMode] = useState<'citizen' | 'admin'>('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    global?: string;
  }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = 'Required';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Required';
    else if (password.length < 6) e.password = 'Min. 6 characters';
    if (password !== confirmPassword) e.confirmPassword = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const { error } = await supabaseBrowser().auth.signUp({ email, password });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Registration failed. Please try again.';
      setErrors({ global: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Left brand panel ───────────────────────────────────────────── */}
      <div className="relative hidden md:flex md:w-[44%] flex-col justify-between bg-[#0f172a] px-10 py-12 overflow-hidden">
        {/* Dot grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Glow blobs */}
        <div aria-hidden className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
        <div aria-hidden className="absolute bottom-10 -left-16 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">CivicReport</span>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-blue-400 mb-3">
              Join the community
            </p>
            <h2 className="text-3xl font-bold leading-snug text-white">
              Your city needs<br />
              your eyes.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Every report you file adds signal. Incidents with more reports get
              prioritised faster — your 30 seconds can fix a problem for thousands.
            </p>
          </div>

          {/* Perks list */}
          <ul className="space-y-4">
            {PERKS.map((perk) => (
              <li key={perk.title} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-600/20">
                  <perk.icon className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{perk.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{perk.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer note */}
        <p className="relative z-10 text-xs text-slate-600">
          Built for Smart India Hackathon 2026
        </p>
      </div>

      {/* ── Right form panel ───────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 md:px-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 md:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-semibold text-slate-900">CivicReport</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Success state */}
          {done ? (
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Check your inbox</h1>
                <p className="mt-2 text-sm text-slate-500">
                  We sent a confirmation link to <span className="font-medium text-slate-700">{email}</span>.
                  Click it, then come back to sign in.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Go to sign in <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="mb-8 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setMode('citizen')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                    mode === 'citizen'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Citizen
                </button>
                <button
                  type="button"
                  onClick={() => setMode('admin')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                    mode === 'admin'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Admin
                </button>
              </div>

              {/* Heading */}
              <div className="mb-7">
                <h1 className="text-2xl font-bold text-slate-900">
                  {mode === 'admin' ? 'Admin registration' : 'Create an account'}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {mode === 'admin'
                    ? 'For authorized municipal staff only.'
                    : 'Free. Takes about 30 seconds.'}
                </p>
              </div>

              {/* Global error */}
              {errors.global && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {errors.global}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                      errors.email ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
                    }`}
                  />
                  {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                        errors.password ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
                </div>

                {/* Confirm password */}
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                      errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
                    }`}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                    mode === 'admin'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account…
                    </span>
                  ) : mode === 'admin' ? (
                    'Register as Admin'
                  ) : (
                    'Create account'
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
