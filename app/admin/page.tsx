'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from './_lib/theme-context';
import {
  CATEGORIES, CATEGORY_LABEL,
  DEPARTMENTS, DEPARTMENT_LABEL,
  STATUSES, PRIORITY_TIERS,
  type Department, type Status, type PriorityTier,
} from '../../lib/contracts/enums';
import type { IncidentSummary } from '../../lib/contracts/incident';
import { TIER_COLORS, STATUS_COLORS, CATEGORY_ICONS } from './_lib/constants';
import Map from './_components/Map';
import CustomSelect from './_components/CustomSelect';
import { INCIDENT_SUMMARIES } from '../../mocks/fixtures';

/* ── KPI Card ─────────────────────────────────────────────────────────────── */

function KPICard({ label, value, color, icon }: {
  label: string; value: string | number; color: string; icon: string;
}) {
  return (
    <div style={{
      background: 'var(--admin-bg-surface)', border: '1px solid var(--admin-border)',
      borderRadius: 12, padding: '16px 18px',
      boxShadow: 'var(--admin-shadow-card)',
      transition: 'all 0.25s ease',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, opacity: 0.9 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-secondary)' }}>{label}</div>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color }}>{value}</div>
    </div>
  );
}

/* ── Priority/Status badges ──────────────────────────────────────────────── */

function PriorityBadge({ tier, score }: { tier: PriorityTier; score: number }) {
  const c = TIER_COLORS[tier];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 9999,
      fontSize: 12, fontWeight: 600,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.text }} />
      {score.toFixed(1)}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_COLORS[status] ?? { bg: 'var(--admin-bg-active)', text: 'var(--admin-text-secondary)', border: 'var(--admin-border)' };
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 10px', borderRadius: 9999,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
      background: c.bg, color: c.text, border: `1px solid ${c.border}`
    }}>
      {status.replace('_', ' ')}
    </span>
  );
}

/* ── Sort options ─────────────────────────────────────────────────────────── */

const SORT_OPTIONS = [
  { value: 'priority', label: 'Priority Score' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'most_reported', label: 'Most Reported' },
];

/* ── Command Center Page ──────────────────────────────────────────────────── */

export default function AdminCommandCenter() {
  const router = useRouter();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'queue' | 'map'>('queue');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterDept, setFilterDept]         = useState('');
  const [filterTier, setFilterTier]         = useState('');
  const [sort, setSort]                     = useState('priority');

  /* Filtered + sorted rows */
  const incidents = useMemo(() => {
    let rows = [...INCIDENT_SUMMARIES] as IncidentSummary[];
    if (filterCategory) rows = rows.filter(r => r.category === filterCategory);
    if (filterStatus)   rows = rows.filter(r => r.status === filterStatus);
    if (filterDept)     rows = rows.filter(r => r.department === filterDept);
    if (filterTier)     rows = rows.filter(r => r.priority_tier === filterTier);
    const sorters: Record<string, (a: IncidentSummary, b: IncidentSummary) => number> = {
      priority:      (a, b) => b.priority_score - a.priority_score,
      newest:        (a, b) => Date.parse(b.first_reported_at) - Date.parse(a.first_reported_at),
      oldest:        (a, b) => Date.parse(a.first_reported_at) - Date.parse(b.first_reported_at),
      most_reported: (a, b) => b.report_count - a.report_count,
    };
    return rows.sort(sorters[sort] ?? sorters.priority);
  }, [filterCategory, filterStatus, filterDept, filterTier, sort]);

  /* KPI stats */
  const all = INCIDENT_SUMMARIES;
  const openCount    = all.filter(i => !['RESOLVED','VERIFIED','REJECTED','DUPLICATE'].includes(i.status)).length;
  const unassigned   = all.filter(i => ['SUBMITTED','ACKNOWLEDGED'].includes(i.status)).length;
  const resolved     = all.filter(i => i.status === 'RESOLVED').length;
  const avgAge       = all.length ? (all.reduce((s, i) => s + i.age_days, 0) / all.length).toFixed(1) : '0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--admin-bg-base)' }}>

      {/* ── KPI strip ── */}
      <div style={{ padding: '16px 24px', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          <KPICard label="Open Incidents"     value={openCount}  color="var(--color-semantic-info)" icon="🚨" />
          <KPICard label="Unassigned"          value={unassigned} color="var(--color-semantic-warning)" icon="⏳" />
          <KPICard label="Resolved This Week" value={resolved}   color="var(--color-semantic-success)" icon="✅" />
          <KPICard label="Avg Age (Days)"     value={avgAge}     color="var(--color-semantic-brand)" icon="📅" />
        </div>
      </div>

      {/* ── Mobile tabs ── */}
      <div className="lg:hidden" style={{ display: 'flex', borderBottom: '1px solid var(--admin-border)', flexShrink: 0, background: 'var(--admin-bg-surface)' }}>
        {(['queue', 'map'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '11px', fontSize: 13, fontWeight: 600,
            background: 'none', border: 'none', cursor: 'pointer',
            color: activeTab === tab ? 'var(--color-semantic-info)' : 'var(--admin-text-secondary)',
            borderBottom: activeTab === tab ? `2.5px solid var(--color-semantic-info)` : '2.5px solid transparent',
          }}>
            {tab === 'queue' ? '📋 Queue' : '🗺️ Map'}
          </button>
        ))}
      </div>

      {/* ── Split view ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '0 24px 24px 24px', gap: 24 }}>

        {/* ─── Queue panel ─── */}
        <div style={{
          width: 480, flexShrink: 0, display: 'flex', flexDirection: 'column',
          border: '1px solid var(--admin-border)', borderRadius: 12,
          overflow: 'hidden', background: 'var(--admin-bg-surface)',
          boxShadow: 'var(--admin-shadow-card)',
        }} className={activeTab === 'queue' ? 'flex' : 'hidden lg:flex'}>

          {/* Filters header */}
          <div style={{ padding: '20px', borderBottom: '1px solid var(--admin-border)', flexShrink: 0, zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--admin-text-primary)' }}>Incident Queue</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--bg-semantic-info)', border: '1px solid var(--color-semantic-info)', color: 'var(--color-semantic-info)' }}>
                  {incidents.length}
                </span>
              </div>
            </div>

            {/* Filter dropdowns */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {[
                { label: 'Category', val: filterCategory, set: setFilterCategory, opts: [{value: '', label: 'All'}, ...CATEGORIES.map(c => ({ value: c, label: CATEGORY_LABEL[c] }))] },
                { label: 'Status',   val: filterStatus,   set: setFilterStatus,   opts: [{value: '', label: 'All'}, ...STATUSES.map(s => ({ value: s, label: s.replace('_',' ') }))] },
                { label: 'Dept',     val: filterDept,     set: setFilterDept,     opts: [{value: '', label: 'All'}, ...DEPARTMENTS.map(d => ({ value: d, label: DEPARTMENT_LABEL[d] }))] },
                { label: 'Priority', val: filterTier,     set: setFilterTier,     opts: [{value: '', label: 'All'}, ...PRIORITY_TIERS.map(t => ({ value: t, label: t }))] },
                { label: 'Sort',     val: sort,           set: setSort,           opts: SORT_OPTIONS },
              ].map(({ label, val, set, opts }) => (
                <div key={label} style={{ flex: '1 1 auto', minWidth: 'calc(33% - 12px)' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-muted)', marginBottom: 6 }}>{label}</div>
                  <CustomSelect
                    value={val}
                    onChange={set}
                    options={opts}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--admin-bg-base)' }}>
            {incidents.map(inc => (
              <Link key={inc.incident_id} href={`/admin/incidents/${inc.incident_id}`}
                style={{
                  display: 'block', padding: '16px 20px',
                  borderBottom: '1px solid var(--admin-border)',
                  textDecoration: 'none', cursor: 'pointer',
                  background: 'var(--admin-bg-surface)', transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--admin-bg-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--admin-bg-surface)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ 
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: 'var(--admin-bg-active)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                    border: '1px solid var(--admin-border)'
                  }}>
                    {CATEGORY_ICONS[inc.category] ?? '📋'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <PriorityBadge tier={inc.priority_tier} score={inc.priority_score} />
                      <StatusBadge status={inc.status} />
                      {inc.flagged_mismatch && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'var(--bg-semantic-warning)', color: 'var(--color-semantic-warning)', border: '1px solid var(--color-semantic-warning)', fontWeight: 700 }}>⚠ Mismatch</span>}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {inc.address}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--admin-text-secondary)' }}>
                      <span style={{ fontWeight: 500 }}>{CATEGORY_LABEL[inc.category]}</span>
                      <span style={{ color: 'var(--admin-text-muted)' }}>•</span>
                      <span>{inc.report_count} reports</span>
                      <span style={{ color: 'var(--admin-text-muted)' }}>•</span>
                      <span>{inc.age_days.toFixed(0)}d ago</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {incidents.length === 0 && (
              <div style={{ padding: '64px 20px', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                No incidents match the current filters.
              </div>
            )}
          </div>
        </div>

        {/* ─── Map panel ─── */}
        <div style={{ 
          flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0,
          border: '1px solid var(--admin-border)', borderRadius: 12,
          boxShadow: 'var(--admin-shadow-card)',
          background: 'var(--admin-bg-active)'
        }}
          className={activeTab === 'map' ? 'flex' : 'hidden lg:flex'}
        >
          <div style={{ position: 'absolute', inset: 0 }}>
            <Map
              markers={incidents.map(inc => ({
                id: inc.incident_id,
                lat: inc.centroid.lat,
                lng: inc.centroid.lng,
                tier: inc.priority_tier,
                count: inc.report_count,
                title: `${CATEGORY_LABEL[inc.category]} — ${inc.report_count} report(s)`,
                onClick: () => router.push(`/admin/incidents/${inc.incident_id}`),
              }))}
              isDark={isDark}
            />
          </div>

          {/* Legend */}
          <div style={{
            position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 500,
            background: 'var(--admin-bg-elevated)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--admin-border)',
            borderRadius: 999, padding: '8px 24px',
            display: 'flex', gap: 20, alignItems: 'center',
            boxShadow: 'var(--admin-shadow-elevated)',
          }}>
            {PRIORITY_TIERS.map(tier => {
              const c = TIER_COLORS[tier];
              const count = incidents.filter(i => i.priority_tier === tier).length;
              return (
                <span key={tier} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: c.text }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.text }} />
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
