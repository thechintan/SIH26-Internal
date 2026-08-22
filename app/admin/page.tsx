'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CATEGORIES,
  CATEGORY_LABEL,
  DEPARTMENTS,
  DEPARTMENT_LABEL,
  STATUSES,
  PRIORITY_TIERS,
  type Category,
  type Department,
  type Status,
  type PriorityTier,
} from '../../lib/contracts/enums';
import type { IncidentSummary } from '../../lib/contracts/incident';
import { TIER_COLORS, STATUS_COLORS, CATEGORY_ICONS } from './_lib/constants';
import Map from './_components/Map';

/* ── Hardcoded mock data (from mocks/fixtures.ts shape) ───────────────────── */
/* Using inline data until MSW browser integration is wired. All shapes match
   the frozen IncidentSummarySchema from lib/contracts/incident.ts. */

import { INCIDENT_SUMMARIES } from '../../mocks/fixtures';

/* ── KPI card ─────────────────────────────────────────────────────────────── */

function KPICard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-4 backdrop-blur-sm">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold tracking-tight ${accent}`}>{value}</div>
    </div>
  );
}

/* ── Priority badge ───────────────────────────────────────────────────────── */

function PriorityBadge({ tier, score }: { tier: PriorityTier; score: number }) {
  const c = TIER_COLORS[tier];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text} ${c.border} border`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {score.toFixed(1)}
    </span>
  );
}

/* ── Status badge ─────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS[status] ?? 'bg-slate-500/15 text-slate-400'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

/* ── Tabs for mobile (Queue / Map) ────────────────────────────────────────── */

type ViewTab = 'queue' | 'map';

/* ── Filter bar ───────────────────────────────────────────────────────────── */

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#111827] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/40 appearance-none cursor-pointer"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ── Sort options (PRD §10.3) ─────────────────────────────────────────────── */

const SORT_OPTIONS = [
  { value: 'priority', label: 'Priority' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'most_reported', label: 'Most Reported' },
] as const;

/* ── Command Center page ──────────────────────────────────────────────────── */

export default function AdminCommandCenter() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ViewTab>('queue');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [sort, setSort] = useState('priority');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* ── Compute filtered + sorted incidents ──────────────────────────── */

  const incidents = useMemo(() => {
    let rows: IncidentSummary[] = [...INCIDENT_SUMMARIES];

    if (filterCategory) rows = rows.filter((r) => r.category === filterCategory);
    if (filterStatus)   rows = rows.filter((r) => r.status === filterStatus);
    if (filterDept)     rows = rows.filter((r) => r.department === filterDept);
    if (filterTier)     rows = rows.filter((r) => r.priority_tier === filterTier);

    const sorters: Record<string, (a: IncidentSummary, b: IncidentSummary) => number> = {
      priority:      (a, b) => b.priority_score - a.priority_score,
      newest:        (a, b) => Date.parse(b.first_reported_at) - Date.parse(a.first_reported_at),
      oldest:        (a, b) => Date.parse(a.first_reported_at) - Date.parse(b.first_reported_at),
      most_reported: (a, b) => b.report_count - a.report_count,
    };
    rows.sort(sorters[sort] ?? sorters.priority);

    return rows;
  }, [filterCategory, filterStatus, filterDept, filterTier, sort]);

  /* ── KPI computations ─────────────────────────────────────────────── */

  const allIncidents = INCIDENT_SUMMARIES;
  const openCount = allIncidents.filter((i) =>
    !['RESOLVED', 'VERIFIED', 'REJECTED', 'DUPLICATE'].includes(i.status)
  ).length;
  const unassignedCount = allIncidents.filter((i) =>
    ['SUBMITTED', 'ACKNOWLEDGED'].includes(i.status)
  ).length;
  const resolvedThisWeek = allIncidents.filter((i) => i.status === 'RESOLVED').length;
  const avgAge = allIncidents.length > 0
    ? (allIncidents.reduce((s, i) => s + i.age_days, 0) / allIncidents.length).toFixed(1)
    : '0';

  /* ── Toggle selection ─────────────────────────────────────────────── */

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === incidents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(incidents.map((i) => i.incident_id)));
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* ── Top KPI strip ───────────────────────────────────────────── */}
      <div className="px-4 lg:px-6 py-4 border-b border-white/[0.06] bg-[#0d1224]/50">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Open Incidents" value={openCount} accent="text-blue-400" />
          <KPICard label="Unassigned" value={unassignedCount} accent="text-amber-400" />
          <KPICard label="Resolved this week" value={resolvedThisWeek} accent="text-emerald-400" />
          <KPICard label="Avg Age (days)" value={avgAge} accent="text-violet-400" />
        </div>
      </div>

      {/* ── Mobile tabs ─────────────────────────────────────────────── */}
      <div className="lg:hidden flex border-b border-white/[0.06]">
        {(['queue', 'map'] as ViewTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab === 'queue' ? '📋 Queue' : '🗺️ Map'}
          </button>
        ))}
      </div>

      {/* ── Split view (desktop) / Tabs (mobile) ────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left panel: Queue ──────────────────────────────────────── */}
        <div className={`
          ${activeTab === 'queue' ? 'flex' : 'hidden'}
          lg:flex flex-col flex-1 lg:w-[40%] lg:flex-none
          border-r border-white/[0.06] overflow-hidden
        `}>
          {/* Filters */}
          <div className="px-4 py-3 border-b border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300">
                Incident Queue
                <span className="ml-2 text-xs text-slate-500 font-normal">
                  {incidents.length} result{incidents.length !== 1 ? 's' : ''}
                </span>
              </h2>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-blue-400 font-medium">
                    {selectedIds.size} selected
                  </span>
                  <div className="h-4 w-px bg-white/[0.1]"></div>
                  <button className="text-[10px] px-2 py-1 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06] hover:bg-white/[0.08] transition-colors">
                    Assign
                  </button>
                  <button className="text-[10px] px-2 py-1 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06] hover:bg-white/[0.08] transition-colors">
                    Change Status
                  </button>
                  <button className="text-[10px] px-2 py-1 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06] hover:bg-white/[0.08] transition-colors">
                    Merge
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterSelect
                label="Category"
                value={filterCategory}
                onChange={setFilterCategory}
                options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
              />
              <FilterSelect
                label="Status"
                value={filterStatus}
                onChange={setFilterStatus}
                options={STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
              />
              <FilterSelect
                label="Department"
                value={filterDept}
                onChange={setFilterDept}
                options={DEPARTMENTS.map((d) => ({ value: d, label: DEPARTMENT_LABEL[d] }))}
              />
              <FilterSelect
                label="Priority"
                value={filterTier}
                onChange={setFilterTier}
                options={PRIORITY_TIERS.map((t) => ({ value: t, label: t }))}
              />
              <FilterSelect
                label="Sort by"
                value={sort}
                onChange={setSort}
                options={SORT_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
              />
            </div>
          </div>

          {/* Queue list */}
          <div className="flex-1 overflow-y-auto">
            {/* Select-all row */}
            <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.size === incidents.length && incidents.length > 0}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5 rounded bg-[#111827] border-white/10 accent-blue-500"
              />
              <span className="text-[10px] uppercase tracking-wider text-slate-500">Select All</span>
            </div>

            {incidents.map((inc) => (
              <Link
                key={inc.incident_id}
                href={`/admin/incidents/${inc.incident_id}`}
                className={`
                  block px-4 py-3 border-b border-white/[0.04]
                  hover:bg-white/[0.02] transition-colors cursor-pointer
                  ${selectedIds.has(inc.incident_id) ? 'bg-blue-500/5' : ''}
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(inc.incident_id)}
                    onChange={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelect(inc.incident_id); }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 w-3.5 h-3.5 rounded bg-[#111827] border-white/10 accent-blue-500 flex-shrink-0"
                  />

                  {/* Category icon */}
                  <span className="text-lg flex-shrink-0 mt-0.5" title={CATEGORY_LABEL[inc.category]}>
                    {CATEGORY_ICONS[inc.category] ?? '📋'}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <PriorityBadge tier={inc.priority_tier} score={inc.priority_score} />
                      <StatusBadge status={inc.status} />
                      {inc.flagged_mismatch && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">
                          ⚠ Mismatch
                        </span>
                      )}
                      {inc.is_recurrence && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-medium">
                          🔄 Recurring
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-slate-200 truncate">{inc.address}</div>

                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                      <span>{CATEGORY_LABEL[inc.category]}</span>
                      <span>·</span>
                      <span>{inc.report_count} reporter{inc.report_count !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>{inc.age_days.toFixed(0)}d ago</span>
                      {inc.department && (
                        <>
                          <span>·</span>
                          <span>{DEPARTMENT_LABEL[inc.department as Department]}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Thumbnail */}
                  {inc.thumbnail_url && (
                    <div className="w-10 h-10 rounded-md bg-slate-800 flex-shrink-0 overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-[10px] text-slate-500">
                        📷
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}

            {incidents.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-slate-500">
                No incidents match the current filters.
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel: Map ──────────────────────────────────────── */}
        <div className={`
          ${activeTab === 'map' ? 'flex' : 'hidden'}
          lg:flex flex-col flex-1 overflow-hidden relative
        `}>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d1224]/50 to-transparent pointer-events-none z-[400] h-16" />
          
          <Map
            markers={incidents.map((inc) => ({
              id: inc.incident_id,
              lat: inc.centroid.lat,
              lng: inc.centroid.lng,
              tier: inc.priority_tier,
              count: inc.report_count,
              title: `${CATEGORY_LABEL[inc.category]} — ${inc.report_count} report(s)`,
              onClick: () => router.push(`/admin/incidents/${inc.incident_id}`),
            }))}
          />
          
          {/* Map Legend Overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] bg-[#111827]/80 backdrop-blur-md border border-white/[0.06] rounded-full px-4 py-2 flex gap-4 shadow-xl">
            {PRIORITY_TIERS.map((tier) => {
              const c = TIER_COLORS[tier];
              const count = incidents.filter((i) => i.priority_tier === tier).length;
              return (
                <span key={tier} className={`flex items-center gap-1.5 text-[10px] font-medium ${c.text}`}>
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  {tier} ({count})
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
