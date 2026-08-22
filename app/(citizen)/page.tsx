'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Camera,
  Route,
  BellRing,
  ArrowRight,
  MapPin,
  ShieldCheck,
  ListChecks,
} from 'lucide-react';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/lib/contracts/enums';
import type { PublicStats } from '@/lib/contracts/incident';

const CATEGORY_EMOJI: Record<Category, string> = {
  STRUCTURAL: '🏗️',
  ELECTRICAL: '⚡',
  DRAIN_MANHOLE: '🕳️',
  WATER_LEAK: '💧',
  POTHOLE: '🛣️',
  FOOTPATH: '🚶',
  GARBAGE: '🗑️',
  STREETLIGHT: '💡',
  OTHER: '📍',
};

const HOW_IT_WORKS = [
  {
    icon: Camera,
    title: 'Snap & submit',
    body: 'Photo, category, location. The whole report takes about 45 seconds — no account needed to start.',
  },
  {
    icon: Route,
    title: 'We route it',
    body: 'Duplicate reports are grouped into one incident, ranked by priority, and sent to the right department automatically.',
  },
  {
    icon: BellRing,
    title: 'Track to resolution',
    body: 'Follow every status change, see the proof-of-work photo, and confirm whether it was actually fixed.',
  },
];

function useStats() {
  return useQuery<PublicStats>({
    queryKey: ['public-stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      return res.json();
    },
  });
}

function StatValue({ value, isLoading }: { value: number | undefined; isLoading: boolean }) {
  if (isLoading || value === undefined) {
    return <span className="inline-block h-8 w-16 animate-pulse rounded bg-white/20 align-middle" />;
  }
  return <>{value.toLocaleString('en-IN')}</>;
}

export default function LandingPage() {
  const { data: stats, isLoading } = useStats();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <MapPin className="h-5 w-5" />
            </span>
            <span className="text-lg">CivicReport</span>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/my-reports"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              My Reports
            </Link>
            <Link
              href="/admin"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-block"
            >
              Admin
            </Link>
            <Link
              href="/report"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Report
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-600 to-blue-700 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.35) 0, transparent 35%)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/25">
              <ShieldCheck className="h-3.5 w-3.5" />
              Civic issue reporting, done right
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Report a civic issue in 45 seconds.
            </h1>
            <p className="mt-4 text-lg text-blue-50/90">
              A pothole, a broken streetlight, an overflowing drain — snap a photo and we route it
              to the right department, rank it by priority, and keep you posted until it&apos;s fixed.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/report"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-blue-700 shadow-lg shadow-blue-900/20 transition-transform hover:scale-[1.02] active:scale-100"
              >
                <Camera className="h-5 w-5" />
                Report an Issue
              </Link>
              <Link
                href="/my-reports"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500/30 px-7 py-3.5 text-base font-semibold text-white ring-1 ring-inset ring-white/30 transition-colors hover:bg-blue-500/50"
              >
                <ListChecks className="h-5 w-5" />
                Track my reports
              </Link>
            </div>

            {/* Live stats */}
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-blue-100/80">
                  Reports filed
                </dt>
                <dd className="mt-1 text-3xl font-bold">
                  <StatValue value={stats?.reports_total} isLoading={isLoading} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-blue-100/80">
                  Incidents
                </dt>
                <dd className="mt-1 text-3xl font-bold">
                  <StatValue value={stats?.incidents_total} isLoading={isLoading} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-blue-100/80">
                  Resolved
                </dt>
                <dd className="mt-1 text-3xl font-bold">
                  <StatValue value={stats?.resolved_total} isLoading={isLoading} />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-slate-500">
          Three steps from spotting a problem to seeing it resolved.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="absolute right-5 top-5 text-5xl font-black text-slate-100">
                {i + 1}
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ──────────────────────────────────────────────────── */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            What you can report
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-slate-500">
            Nine categories, each routed to the department that owns it.
          </p>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-3 sm:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href="/report"
                className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center transition-all hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="text-3xl transition-transform group-hover:scale-110">
                  {CATEGORY_EMOJI[cat]}
                </span>
                <span className="text-xs font-medium text-slate-700">{CATEGORY_LABEL[cat]}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ────────────────────────────────────────────────────── */}
      <section className="bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            See something? Report it.
          </h2>
          <p className="max-w-xl text-slate-300">
            Every report adds weight to a problem. The more people report it, the higher it ranks —
            and the faster your city acts.
          </p>
          <Link
            href="/report"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-blue-700"
          >
            Report an Issue
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6">
          <span className="font-semibold text-slate-700">CivicReport</span>
          <div className="flex items-center gap-4">
            <Link href="/report" className="hover:text-slate-900">
              Report
            </Link>
            <Link href="/my-reports" className="hover:text-slate-900">
              My Reports
            </Link>
            <Link href="/admin" className="hover:text-slate-900">
              Admin console
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
