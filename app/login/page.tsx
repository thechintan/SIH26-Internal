'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Loader2, Eye, EyeOff, MapPin, AlertTriangle, Zap, Droplets } from 'lucide-react';

const RECENT_ISSUES = [
  { icon: AlertTriangle, label: 'Pothole on MG Road', time: '2 min ago', color: 'text-amber-400' },
  { icon: Zap, label: 'Streetlight out, Sector 12', time: '11 min ago', color: 'text-yellow-300' },
  { icon: Droplets, label: 'Water leak, Gandhi Nagar', time: '34 min ago', color: 'text-blue-400' },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'citizen' | 'admin'>('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; global?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = 'Required';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Required';
    else if (password.length < 6) e.password = 'Min. 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace(mode === 'admin' ? '/admin' : '/');
    } catch (err) {
      let msg = 'Something went wrong. Try again.';
      if (err && typeof err === 'object' && 'message' in err) {
        const m = (err as { message: string }).message;
        if (/Invalid login credentials/i.test(m)) msg = 'Wrong email or password.';
        else if (/User not confirmed/i.test(m)) msg = 'Check your inbox and confirm your email first.';
        else if (/Network/i.test(m)) msg = 'Network error — check your connection.';
        else msg = m;
      }
      setErrors({ global: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Left brand panel ───────────────────────────────────────────── */}
      <div className="relative hidden md:flex md:w-[44%] flex-col justify-between bg-[#0f172a] px-10 py-12 overflow-hidden">
        {/* Background texture dots */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Glow blobs */}
        <div aria-hidden className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
        <div aria-hidden className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">CivicReport</span>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-5">
          <p className="text-xs font-medium uppercase tracking-widest text-blue-400">
            Real-time civic tracking
          </p>
          <h2 className="text-3xl font-bold leading-snug text-white">
            Report it.<br />
            Track it.<br />
            See it fixed.
          </h2>
          <p className="text-sm leading-relaxed text-slate-400">
            Snap a photo, drop a pin, pick a category. Your report reaches the right
            department in seconds — not days.
          </p>

          {/* Live feed */}
          <div className="mt-6 rounded-xl border border-white/8 bg-white/5 p-4 backdrop-blur-sm">
            <p className="mb-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Recent reports</p>
            <ul className="space-y-3">
              {RECENT_ISSUES.map((item) => (
                <li key={item.label} className="flex items-center gap-3">
                  <item.icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                  <span className="flex-1 text-sm text-slate-300 truncate">{item.label}</span>
                  <span className="text-xs text-slate-600 shrink-0">{item.time}</span>
                </li>
              ))}
            </ul>
          </div>
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
              {mode === 'admin' ? 'Admin sign in' : 'Welcome back'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'admin'
                ? 'Restricted to authorized municipal staff.'
                : 'Sign in to report issues and track progress.'}
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
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <a href="#" className="text-xs text-blue-600 hover:text-blue-700">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
                  Signing in…
                </span>
              ) : mode === 'admin' ? (
                'Sign in as Admin'
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            No account yet?{' '}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-700">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
