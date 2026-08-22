'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CATEGORY_LABEL,
  DEPARTMENT_LABEL,
  canTransition,
  type Department,
} from '../../../lib/contracts/enums';
import { INCIDENTS } from '../../../mocks/fixtures';
import { TIER_COLORS, STATUS_COLORS, CATEGORY_ICONS } from '../../admin/_lib/constants';

/* ── Field Staff Incident Detail ──────────────────────────────────────────── */

export default function FieldIncidentPage() {
  const params = useParams();
  const incidentId = params.id as string;
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [note, setNote] = useState('');

  const incident = useMemo(() =>
    INCIDENTS.find((i) => i.incident_id === incidentId),
    [incidentId]
  );

  if (!incident) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-4xl">🔍</div>
          <div className="text-sm text-slate-400">Incident not found</div>
          <Link href="/field" className="text-xs text-blue-400 hover:underline">← Back to assignments</Link>
        </div>
      </div>
    );
  }

  const tierColor = TIER_COLORS[incident.priority_tier];
  const canStartWork = canTransition(incident.status, 'IN_PROGRESS');
  const canResolve = canTransition(incident.status, 'RESOLVED');

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0d1224]/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/field" className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <span className="text-sm font-semibold">Incident Detail</span>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Incident header */}
        <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${tierColor.bg} ${tierColor.text} ${tierColor.border} border`}>
              <span className={`w-2 h-2 rounded-full ${tierColor.dot}`} />
              {incident.priority_score.toFixed(1)}
            </span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_COLORS[incident.status]}`}>
              {incident.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl">{CATEGORY_ICONS[incident.category]}</span>
            <div>
              <div className="text-base font-semibold text-white">{CATEGORY_LABEL[incident.category]}</div>
              <div className="text-xs text-slate-400">{incident.address}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-white/[0.04]">
            <span>{incident.report_count} reporter{incident.report_count !== 1 ? 's' : ''}</span>
            {incident.department && (
              <span>{DEPARTMENT_LABEL[incident.department as Department]}</span>
            )}
            <span>{incident.age_days.toFixed(0)} days old</span>
          </div>
        </div>

        {/* Location */}
        <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-4">
          <div className="h-40 bg-[#0f1629] rounded-lg flex items-center justify-center">
            <div className="text-center space-y-1">
              <div className="text-2xl">📍</div>
              <div className="text-xs text-slate-500">
                {incident.centroid.lat.toFixed(4)}, {incident.centroid.lng.toFixed(4)}
              </div>
              <a
                href={`https://www.google.com/maps?q=${incident.centroid.lat},${incident.centroid.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-400 hover:underline"
              >
                Open in Google Maps →
              </a>
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-4 space-y-2">
          <div className="text-xs font-medium text-slate-400">Report Photos</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {incident.reports.map((r) => (
              <div key={r.report_id} className="w-20 h-20 bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center text-lg">
                📷
              </div>
            ))}
          </div>
        </div>

        {/* Citizen notes */}
        {incident.reports.some((r) => r.description) && (
          <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-4 space-y-2">
            <div className="text-xs font-medium text-slate-400">Citizen Notes</div>
            {incident.reports.filter((r) => r.description).map((r) => (
              <div key={r.report_id} className="text-xs text-slate-300 bg-white/[0.02] rounded-lg p-2">
                {r.description}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons — the core field staff workflow */}
        <div className="space-y-2 pt-2">
          {/* Mark In Progress */}
          {canStartWork && (
            <button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform">
              🔧 Start Work — Mark In Progress
            </button>
          )}

          {/* Mark Resolved (with mandatory resolution photo) */}
          {canResolve && !showResolveForm && (
            <button
              onClick={() => setShowResolveForm(true)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform"
            >
              ✅ Mark Resolved
            </button>
          )}

          {/* Resolution form — photo is MANDATORY (PRD §10.6) */}
          {showResolveForm && (
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-emerald-400">Resolution Details</h3>

              {/* Resolution photo — MANDATORY */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">
                  Resolution Photo <span className="text-red-400">*</span> (Proof of work)
                </label>
                <div className="h-32 border-2 border-dashed border-emerald-500/20 rounded-lg flex items-center justify-center cursor-pointer hover:border-emerald-500/40 transition-colors">
                  <div className="text-center space-y-1">
                    <div className="text-2xl">📸</div>
                    <div className="text-xs text-slate-400">Tap to take photo</div>
                    <div className="text-[10px] text-emerald-400/60">Required before resolving</div>
                  </div>
                </div>
              </div>

              {/* Closing note */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">
                  Closing Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What was done to fix the issue..."
                  maxLength={500}
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none h-20"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowResolveForm(false)}
                  className="flex-1 py-2.5 rounded-lg bg-white/[0.04] text-slate-400 text-xs font-medium border border-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold opacity-50 cursor-not-allowed"
                  disabled
                  title="Upload a resolution photo first"
                >
                  Submit Resolution
                </button>
              </div>

              <div className="text-[10px] text-slate-500 text-center">
                Citizens will be notified and asked to verify the fix
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
