import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth.api';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  Sparkles,
  UserCheck,
  KeyRound,
  Building,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await authApi.login(email.trim(), password);
      setAuth(response);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-background-card border border-background-border rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 mx-auto flex items-center justify-center text-white shadow-glow-brand">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            CivicPulse <span className="text-brand-400">Admin</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Municipal Command &amp; Citizen Grievance Response Portal
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Staff / Admin Email"
            type="email"
            placeholder="admin@civicpulse.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isLoading}
            rightIcon={<KeyRound className="w-4 h-4" />}
          >
            Authenticate &amp; Enter Portal
          </Button>
        </form>

        {/* Demo Quick-Fill Buttons for Judges & Evaluators */}
        <div className="pt-4 border-t border-background-border/80 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Judge / Evaluator Demo Accounts (1-Click Fill)</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@civicpulse.in', 'Admin@123')}
              className="flex items-center justify-between p-2.5 rounded-xl bg-background-secondary hover:bg-background-hover border border-background-border hover:border-purple-500/40 text-left transition-all text-xs group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 shadow-glow-brand" />
                <span className="font-semibold text-slate-200 group-hover:text-purple-300">
                  Super Admin
                </span>
                <span className="text-[11px] text-slate-400">(All privileges &amp; config)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">admin@civicpulse.in</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('priya@civicpulse.in', 'Admin@123')}
              className="flex items-center justify-between p-2.5 rounded-xl bg-background-secondary hover:bg-background-hover border border-background-border hover:border-brand-500/40 text-left transition-all text-xs group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-400" />
                <span className="font-semibold text-slate-200 group-hover:text-brand-300">
                  Sanitation Head
                </span>
                <span className="text-[11px] text-slate-400">(Dept-scoped)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">priya@civicpulse.in</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('ravi@civicpulse.in', 'Admin@123')}
              className="flex items-center justify-between p-2.5 rounded-xl bg-background-secondary hover:bg-background-hover border border-background-border hover:border-emerald-500/40 text-left transition-all text-xs group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-slate-200 group-hover:text-emerald-300">
                  Field Staff
                </span>
                <span className="text-[11px] text-slate-400">(Assigned reports only)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">ravi@civicpulse.in</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
