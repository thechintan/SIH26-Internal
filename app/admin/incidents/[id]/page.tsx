'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CATEGORY_LABEL,
  DEPARTMENT_LABEL,
  STATUS_TRANSITIONS,
  canTransition,
  type Department,
  type Status,
} from '../../../../lib/contracts/enums';
import type { IncidentDetail, PriorityBreakdown } from '../../../../lib/contracts/incident';
import { INCIDENTS } from '../../../../mocks/fixtures';
import { TIER_COLORS, STATUS_COLORS, CATEGORY_ICONS } from '../../_lib/constants';
import Map from '../../_components/Map';

/* ── Priority Breakdown Panel (PRD §10.4 — non-negotiable) ────────────────── */

function BreakdownPanel({ breakdown }: { breakdown: PriorityBreakdown }) {
  const terms = [
    {
      label: 'Severity',
      sublabel: 'Category base score',
      input: breakdown.factors.severity.baseSeverity.toString(),
      weighted: breakdown.factors.severity.weighted,
      color: 'bg-red-500',
    },
    {
      label: 'Reports',
      sublabel: `${breakdown.factors.reportCount.uniqueUsers} unique reporter${breakdown.factors.reportCount.uniqueUsers !== 1 ? 's' : ''}`,
      input: `ln(1+${breakdown.factors.reportCount.uniqueUsers})`,
      weighted: breakdown.factors.reportCount.weighted,
      color: 'bg-blue-500',
    },
    {
      label: 'Age',
      sublabel: `${breakdown.factors.age.daysOpen} day${breakdown.factors.age.daysOpen !== 1 ? 's' : ''} open`,
      input: `${breakdown.factors.age.daysOpen}d`,
      weighted: breakdown.factors.age.weighted,
      color: 'bg-amber-500',
    },
    {
      label: 'Recurrence',
      sublabel: breakdown.factors.recurrence.isRecurring ? 'Location failed before' : 'First occurrence',
      input: breakdown.factors.recurrence.isRecurring ? 'Yes' : 'No',
      weighted: breakdown.factors.recurrence.weighted,
      color: 'bg-violet-500',
    },
  ];

  const maxWeighted = Math.max(...terms.map((t) => t.weighted), 1);

  return (
    <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Priority Breakdown</h3>
        <span className="text-xs text-slate-500">
          Computed {new Date(breakdown.computedAt).toLocaleString()}
        </span>
      </div>

      <div className="space-y-3">
        {terms.map((t) => (
          <div key={t.label}>
            <div className="flex items-baseline justify-between mb-1">
              <div>
                <span className="text-xs font-medium text-slate-300">{t.label}</span>
                <span className="text-[10px] text-slate-500 ml-2">{t.sublabel}</span>
              </div>
              <span className="text-xs font-mono text-slate-400">{t.weighted.toFixed(2)}</span>
            </div>
            <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${t.color} transition-all duration-500`}
                style={{ width: `${(t.weighted / maxWeighted) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-white/[0.06] flex items-baseline justify-between">
        <span className="text-sm font-semibold text-slate-200">Total Score</span>
        <span className="text-xl font-bold text-white">{breakdown.score.toFixed(2)}</span>
      </div>
    </div>
  );
}

/* ── Status transition controls ───────────────────────────────────────────── */

function StatusControls({ incident }: { incident: IncidentDetail }) {
  const availableTransitions = useMemo(() => {
    return STATUS_TRANSITIONS[incident.status].filter((to) =>
      canTransition(incident.status, to)
    );
  }, [incident.status]);

  return (
    <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-200">Actions</h3>

      <div className="space-y-2">
        {/* Current status */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Current:</span>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS[incident.status]}`}>
            {incident.status.replace('_', ' ')}
          </span>
        </div>

        {/* Transition buttons */}
        {availableTransitions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {availableTransitions.map((to) => {
              const isPositive = ['ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED'].includes(to);
              const isNegative = ['REJECTED', 'DUPLICATE'].includes(to);

              return (
                <button
                  key={to}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${isPositive
                      ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20'
                      : isNegative
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/15'
                        : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] border border-white/[0.06]'
                    }
                  `}
                  title={`Transition to ${to.replace('_', ' ')}`}
                >
                  → {to.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        )}

        {availableTransitions.length === 0 && (
          <div className="text-xs text-slate-500 italic">
            Terminal status — no further transitions.
          </div>
        )}

        <div className="pt-2">
          <button
            className="w-full py-1.5 rounded-lg text-xs font-medium border border-dashed border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Merge Duplicate Incidents
          </button>
        </div>
      </div>

      {/* Assignment */}
      <div className="pt-3 border-t border-white/[0.06] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Department</span>
          <span className="text-xs text-slate-300">
            {incident.department ? DEPARTMENT_LABEL[incident.department as Department] : 'Triage Queue'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Assigned to</span>
          <span className="text-xs text-slate-300">
            {incident.assigned_to?.name ?? 'Unassigned'}
          </span>
        </div>
        {incident.sla_due_at && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">SLA Due</span>
            <span className="text-xs text-slate-300">
              {new Date(incident.sla_due_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Status history audit trail ───────────────────────────────────────────── */

function StatusTimeline({ incident }: { incident: IncidentDetail }) {
  return (
    <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-200">Status History</h3>
      <div className="space-y-0">
        {incident.status_history.map((entry, i) => (
          <div key={i} className="flex gap-3 relative">
            {/* Timeline line */}
            {i < incident.status_history.length - 1 && (
              <div className="absolute left-[7px] top-5 w-px h-full bg-white/[0.06]" />
            )}
            {/* Dot */}
            <div className={`w-[15px] h-[15px] rounded-full border-2 flex-shrink-0 mt-0.5 ${
              i === incident.status_history.length - 1
                ? 'border-blue-500 bg-blue-500/20'
                : 'border-slate-600 bg-[#0a0e1a]'
            }`} />
            {/* Content */}
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${STATUS_COLORS[entry.to_status]}`}>
                  {entry.to_status.replace('_', ' ')}
                </span>
                {entry.actor_name && (
                  <span className="text-[10px] text-slate-500">by {entry.actor_name}</span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {new Date(entry.at).toLocaleString()}
              </div>
              {entry.note && (
                <div className="text-xs text-slate-400 mt-1">{entry.note}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Severity consensus ───────────────────────────────────────────────────── */

function SeverityConsensus({ consensus }: { consensus: IncidentDetail['severity_consensus'] }) {
  const total = consensus.MINOR + consensus.MODERATE + consensus.SEVERE;
  if (total === 0) return null;

  return (
    <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-200">Reporter Severity Consensus</h3>
      <div className="text-[10px] text-slate-500 -mt-1">Advisory only — does not feed the priority score</div>
      <div className="flex gap-2">
        {[
          { label: 'Minor', value: consensus.MINOR, color: 'bg-green-500' },
          { label: 'Moderate', value: consensus.MODERATE, color: 'bg-yellow-500' },
          { label: 'Severe', value: consensus.SEVERE, color: 'bg-red-500' },
        ].map((s) => (
          <div key={s.label} className="flex-1 text-center">
            <div className={`h-2 rounded-full ${s.color} opacity-60 mb-1`}
              style={{ width: `${(s.value / total) * 100}%`, minWidth: s.value > 0 ? '8px' : '0' }}
            />
            <div className="text-xs font-medium text-slate-300">{s.value}</div>
            <div className="text-[10px] text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Recurrence chain ─────────────────────────────────────────────────────── */

function RecurrenceChain({ chain }: { chain: IncidentDetail['recurrence_chain'] }) {
  if (chain.length === 0) return null;

  return (
    <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-rose-400">
        🔄 Recurrence Chain — {chain.length + 1} incident{chain.length > 0 ? 's' : ''} at this location
      </h3>
      <div className="text-xs text-slate-400">
        This location has had repeated failures. {chain.length >= 2 ? 'Infrastructure replacement may be needed, not just patching.' : ''}
      </div>
      <div className="space-y-1">
        {chain.map((c) => (
          <div key={c.incident_id} className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">{new Date(c.first_reported_at).toLocaleDateString()}</span>
            <span className="text-slate-600">→</span>
            <span className={c.resolved_at ? 'text-green-400' : 'text-amber-400'}>
              {c.resolved_at ? `Resolved ${new Date(c.resolved_at).toLocaleDateString()}` : 'Still open'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Verification tally ───────────────────────────────────────────────────── */

function VerificationTally({ verification, status }: { verification: IncidentDetail['verification']; status: Status }) {
  if (status !== 'RESOLVED' && status !== 'VERIFIED' && status !== 'REOPENED') return null;
  const total = verification.fixed + verification.not_fixed + verification.pending;
  if (total === 0) return null;

  const pctNotFixed = total > 0 ? (verification.not_fixed / (verification.fixed + verification.not_fixed || 1)) : 0;

  return (
    <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-200">Citizen Verification</h3>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-lg font-bold text-emerald-400">{verification.fixed}</div>
          <div className="text-[10px] text-slate-500">Fixed</div>
        </div>
        <div>
          <div className="text-lg font-bold text-rose-400">{verification.not_fixed}</div>
          <div className="text-[10px] text-slate-500">Not Fixed</div>
        </div>
        <div>
          <div className="text-lg font-bold text-slate-400">{verification.pending}</div>
          <div className="text-[10px] text-slate-500">Pending</div>
        </div>
      </div>
      {pctNotFixed > 0.4 && (
        <div className="text-xs text-rose-400 font-medium">
          ⚠ &gt;40% say not fixed — auto-reopen threshold reached
        </div>
      )}
    </div>
  );
}

/* ── Incident Detail Page ─────────────────────────────────────────────────── */

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = params.id as string;

  const incident = useMemo(() =>
    INCIDENTS.find((i) => i.incident_id === incidentId),
    [incidentId]
  );

  if (!incident) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-4xl">🔍</div>
          <div className="text-sm text-slate-400">Incident not found</div>
          <Link href="/admin" className="text-xs text-blue-400 hover:underline">← Back to queue</Link>
        </div>
      </div>
    );
  }

  const tierColors = TIER_COLORS[incident.priority_tier];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link href="/admin" className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back to Queue
          </Link>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>{CATEGORY_ICONS[incident.category]}</span>
            {CATEGORY_LABEL[incident.category]}
          </h1>
          <div className="text-sm text-slate-400">{incident.address}</div>
          {incident.ward_name && (
            <div className="text-xs text-slate-500">Ward: {incident.ward_name}</div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${tierColors.bg} ${tierColors.text} ${tierColors.border} border`}>
            <span className={`w-2 h-2 rounded-full ${tierColors.dot}`} />
            {incident.priority_score.toFixed(1)}
          </span>
          <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${STATUS_COLORS[incident.status]}`}>
            {incident.status.replace('_', ' ')}
          </span>
          {incident.manual_override && (
            <span className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 font-medium border border-amber-500/15">
              📌 Pinned
            </span>
          )}
        </div>
      </div>

      {/* ── Body: Two columns ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column: Photos + reports info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Photo gallery */}
          <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">
              Report Photos
              <span className="text-xs text-slate-500 font-normal ml-2">
                {incident.reports.length} of {incident.report_count} reports shown
              </span>
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {incident.reports.map((r) => (
                <div key={r.report_id} className="aspect-square bg-slate-800 rounded-lg overflow-hidden relative group">
                  <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-lg">
                    📷
                  </div>
                  {r.description && (
                    <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-sm p-1.5 text-[9px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      {r.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Map: centroid + scatter */}
          <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Location</h3>
            <div className="h-64 rounded-lg overflow-hidden relative border border-white/[0.06] bg-[#0f1629]">
              <Map
                markers={[
                  // Individual reports (scatter)
                  ...incident.reports.map((r) => ({
                    id: r.report_id,
                    lat: r.location.lat,
                    lng: r.location.lng,
                    title: `Report #${r.ticket_id}`,
                    isCentroid: false,
                  })),
                  // Centroid
                  {
                    id: 'centroid',
                    lat: incident.centroid.lat,
                    lng: incident.centroid.lng,
                    title: 'Calculated Centroid',
                    isCentroid: true,
                  }
                ]}
                center={[incident.centroid.lat, incident.centroid.lng]}
                zoom={14}
              />
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between">
              <span>Centroid: {incident.centroid.lat.toFixed(4)}, {incident.centroid.lng.toFixed(4)}</span>
              <a 
                href={`https://www.google.com/maps?q=${incident.centroid.lat},${incident.centroid.lng}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Open in Google Maps ↗
              </a>
            </div>
          </div>

          {/* Citizen notes */}
          {incident.reports.some((r) => r.description) && (
            <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">Citizen Notes</h3>
              <div className="space-y-2">
                {incident.reports.filter((r) => r.description).map((r) => (
                  <div key={r.report_id} className="text-xs text-slate-400 bg-white/[0.02] rounded-lg p-3">
                    <span className="text-slate-500 mr-2">#{r.ticket_id}</span>
                    {r.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolution photo */}
          {incident.resolution_photo_url && (
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-emerald-400">✅ Resolution Photo</h3>
              <div className="h-48 bg-slate-800 rounded-lg flex items-center justify-center text-2xl">
                📷
              </div>
            </div>
          )}
        </div>

        {/* Right column: Breakdown + controls */}
        <div className="space-y-6">
          {/* Priority breakdown — THE non-negotiable panel */}
          {incident.priority_breakdown && (
            <BreakdownPanel breakdown={incident.priority_breakdown} />
          )}

          {/* Status transition controls */}
          <StatusControls incident={incident} />

          {/* Status history */}
          <StatusTimeline incident={incident} />

          {/* Severity consensus */}
          <SeverityConsensus consensus={incident.severity_consensus} />

          {/* Recurrence chain */}
          <RecurrenceChain chain={incident.recurrence_chain} />

          {/* Verification tally */}
          <VerificationTally verification={incident.verification} status={incident.status} />

          {/* Quick stats */}
          <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5 space-y-2">
            <h3 className="text-sm font-semibold text-slate-200">Details</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">First reported</span>
                <span className="text-slate-300">{new Date(incident.first_reported_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Report count</span>
                <span className="text-slate-300">{incident.report_count} unique reporters</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Age</span>
                <span className="text-slate-300">{incident.age_days.toFixed(1)} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category</span>
                <span className="text-slate-300">{CATEGORY_LABEL[incident.category]}</span>
              </div>
              {incident.flagged_mismatch && (
                <div className="flex justify-between">
                  <span className="text-amber-400">⚠ Flagged mismatch</span>
                  <span className="text-amber-400 text-[10px]">Category may be wrong</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
