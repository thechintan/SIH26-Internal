// app/signup/page.tsx
"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; global?: string }>({});

  const validate = () => {
    const newErr: typeof errors = {};
    if (!email) newErr.email = 'Email is required.';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) newErr.email = 'Enter a valid email.';
    if (!password) newErr.password = 'Password is required.';
    else if (password.length < 6) newErr.password = 'Password must be at least 6 characters.';
    if (password !== confirmPassword) newErr.confirmPassword = "Passwords don't match.";
    setErrors(newErr);
    return Object.keys(newErr).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    const supabase = supabaseBrowser();
    try {
      const { error: signUpErr } = await supabase.auth.signUp({ email, password });
      if (signUpErr) throw signUpErr;
      setSuccessMessage(`Account created! Please check ${email} to confirm your address, then log in.`);
    } catch (e) {
      const errMsg = typeof e === 'object' && e !== null && 'message' in e ? (e as { message: string }).message : String(e);
      setErrors({ global: errMsg ?? 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  const accentClass = role === 'admin' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700';
  const heading = role === 'admin' ? 'Admin Sign‑up' : 'Create Account';
  const subText = role === 'admin' ? 'Register as an authorized administrator.' : 'Sign up to report civic issues.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-white p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <svg
            className="h-12 w-12 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <h1 className="text-2xl font-bold text-primary">Civic Report</h1>
        </div>

        {/* Role toggle */}
        <div className="flex justify-center gap-4 mb-4" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={role === 'user'}
            className={`px-4 py-2 rounded ${role === 'user' ? 'bg-primary-100 text-primary-900' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setRole('user')}
          >
            User Sign‑up
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === 'admin'}
            className={`px-4 py-2 rounded ${role === 'admin' ? 'bg-primary-100 text-primary-900' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setRole('admin')}
          >
            Admin Sign‑up
          </button>
        </div>

        <h2 className="text-center text-xl font-semibold mb-1">{heading}</h2>
        <p className="text-center text-sm text-gray-500 mb-4">{subText}</p>

        {successMessage && (
          <div className="rounded bg-green-50 p-4 text-sm text-green-700 mb-4 flex flex-col items-center gap-3" role="alert">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <p className="text-center">{successMessage}</p>
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-white text-sm font-semibold hover:bg-green-700"
            >
              Go to Login <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}

        {errors.global && (
          <div className="rounded bg-red-50 p-2 text-sm text-red-600 mb-4" role="alert">
            {errors.global}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Mail className="h-4 w-4" /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="relative">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Lock className="h-4 w-4" /> Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded border border-gray-300 p-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Min. 6 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Lock className="h-4 w-4" /> Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full rounded border border-gray-300 p-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Repeat password"
            />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded py-2 text-white font-semibold ${accentClass} disabled:opacity-70`}
            aria-busy={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing up...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {role === 'admin' ? 'Register Admin' : 'Create Account'}
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-primary-600 hover:underline">Log in</a>
        </p>
      </div>
    </div>
  );
}
