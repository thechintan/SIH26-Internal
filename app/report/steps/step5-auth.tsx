'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useReportWizard } from '../report-context';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';

export default function Step5Auth() {
  const { nextStep, prevStep } = useReportWizard();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = supabaseBrowser();

      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          // If user already exists, try signing in
          if (signUpError.message.includes('already')) {
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if (signInError) throw signInError;
          } else {
            throw signUpError;
          }
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }

      nextStep(); // Proceed to review & submit
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 flex-1">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>
        <p className="text-sm text-gray-500">
          {isSignUp
            ? 'Quick sign up to submit your report.'
            : 'Welcome back! Sign in to continue.'}
        </p>
      </div>

      <div className="space-y-4 flex-1 mt-4">
        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Mail className="w-4 h-4" /> Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-gray-300 p-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Lock className="w-4 h-4" /> Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            className="w-full rounded-xl border border-gray-300 p-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 p-3 rounded-xl border border-red-200">
            {error}
          </p>
        )}

        {/* Toggle sign up / sign in */}
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-blue-600 hover:underline font-medium w-full text-center"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>

      <div className="mt-auto pt-4 flex gap-3">
        <button
          onClick={prevStep}
          disabled={isLoading}
          className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleAuth}
          disabled={isLoading}
          className="flex-[2] py-3 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-colors disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isSignUp ? 'Creating...' : 'Signing in...'}
            </>
          ) : (
            <>
              {isSignUp ? 'Sign Up & Continue' : 'Sign In & Continue'}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
