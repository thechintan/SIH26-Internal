'use client';

import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Line, ComposedChart, Cell
} from 'recharts';

/* ── Mock Data for Analytics ──────────────────────────────────────────────── */

const VOLUME_TREND_DATA = [
  { date: 'Aug 10', submitted: 45, resolved: 32 },
  { date: 'Aug 11', submitted: 52, resolved: 40 },
  { date: 'Aug 12', submitted: 48, resolved: 45 },
  { date: 'Aug 13', submitted: 70, resolved: 50 },
  { date: 'Aug 14', submitted: 95, resolved: 65 }, // Storm
  { date: 'Aug 15', submitted: 110, resolved: 85 },
  { date: 'Aug 16', submitted: 85, resolved: 95 },
  { date: 'Aug 17', submitted: 60, resolved: 80 },
  { date: 'Aug 18', submitted: 55, resolved: 70 },
  { date: 'Aug 19', submitted: 45, resolved: 65 },
];

const DEPT_PERF_DATA = [
  { name: 'Public Works', responseHours: 4.2, resolveHours: 48.5, reopenRate: 8 },
  { name: 'Sanitation', responseHours: 2.1, resolveHours: 24.2, reopenRate: 3 },
  { name: 'Water & Drain', responseHours: 3.5, resolveHours: 72.1, reopenRate: 12 },
  { name: 'Electrical', responseHours: 1.8, resolveHours: 18.5, reopenRate: 2 },
];

const SLA_COMPLIANCE_DATA = [
  { name: 'CRITICAL', compliance: 95, target: 100 },
  { name: 'HIGH', compliance: 88, target: 90 },
  { name: 'MEDIUM', compliance: 75, target: 80 },
  { name: 'LOW', compliance: 82, target: 70 },
];

/* ── Custom Tooltip ───────────────────────────────────────────────────────── */

type TooltipEntry = { color?: string; name?: string | number; value?: string | number };

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--admin-bg-elevated)', border: '1px solid var(--admin-border)',
        padding: '12px', borderRadius: '8px', boxShadow: 'var(--admin-shadow-elevated)',
        fontSize: '12px'
      }}>
        <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '8px' }}>{label}</div>
        {payload.map((entry: TooltipEntry, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }} />
            <span style={{ color: 'var(--admin-text-secondary)' }}>{entry.name}:</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--admin-text-primary)' }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

/* ── Analytics Dashboard Page ─────────────────────────────────────────────── */

export default function AnalyticsDashboard() {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', background: 'var(--admin-bg-base)', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--admin-text-primary)' }}>Platform Analytics</h1>
          <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>Live operational metrics and historical trends</p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <select style={{ background: 'var(--admin-bg-surface)', border: '1px solid var(--admin-border)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: 'var(--admin-text-primary)', outline: 'none' }}>
            <option>Last 14 days</option>
            <option>Last 30 days</option>
            <option>This Quarter</option>
          </select>
          <select style={{ background: 'var(--admin-bg-surface)', border: '1px solid var(--admin-border)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: 'var(--admin-text-primary)', outline: 'none' }}>
            <option>All Departments</option>
            <option>Public Works</option>
            <option>Sanitation</option>
            <option>Water & Drainage</option>
            <option>Electrical</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Incident Volume Trend */}
        <div style={{ background: 'var(--admin-bg-surface)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--admin-shadow-card)' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-primary)' }}>Incident Volume Trend</h3>
            <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>Submitted vs Resolved per day</p>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer>
              <AreaChart data={VOLUME_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-semantic-info)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-semantic-info)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-semantic-success)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-semantic-success)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--admin-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--admin-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: 'var(--admin-text-muted)' }} />
                <Area type="monotone" dataKey="submitted" name="New Incidents" stroke="var(--color-semantic-info)" strokeWidth={2} fillOpacity={1} fill="url(#colorSub)" />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="var(--color-semantic-success)" strokeWidth={2} fillOpacity={1} fill="url(#colorRes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Performance */}
        <div style={{ background: 'var(--admin-bg-surface)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--admin-shadow-card)' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-primary)' }}>Resolution Speed by Department</h3>
            <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>Average time to resolve (hours)</p>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={DEPT_PERF_DATA} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" horizontal={false} />
                <XAxis type="number" stroke="var(--admin-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--admin-text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--admin-bg-hover)' }} />
                <Bar dataKey="resolveHours" name="Resolution Time (hrs)" fill="var(--color-semantic-brand)" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SLA Compliance */}
        <div style={{ background: 'var(--admin-bg-surface)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--admin-shadow-card)' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-primary)' }}>SLA Compliance by Priority</h3>
            <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>Percentage of incidents resolved within SLA</p>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer>
              <ComposedChart data={SLA_COMPLIANCE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--admin-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--admin-text-muted)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: 'var(--admin-text-muted)' }} />
                <Bar dataKey="compliance" name="Actual Compliance %" fill="var(--color-semantic-info)" radius={[4, 4, 0, 0]} barSize={40} />
                <Line type="step" dataKey="target" name="Target SLA %" stroke="var(--color-semantic-danger)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quality Signal: Reopen Rate */}
        <div style={{ background: 'var(--admin-bg-surface)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--admin-shadow-card)' }}>
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-primary)' }}>Quality Signal: Reopen Rate</h3>
              <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>Incidents reopened by citizens after being marked fixed</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-semantic-danger)', fontWeight: 700, background: 'var(--bg-semantic-danger)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-semantic-danger)' }}>
                ⚠ Water & Drain &gt; 10%
              </div>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={DEPT_PERF_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--admin-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--admin-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--admin-bg-hover)' }} />
                <Bar dataKey="reopenRate" name="Reopen Rate %" fill="var(--color-semantic-warning)" radius={[4, 4, 0, 0]} barSize={30}>
                  {
                    DEPT_PERF_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.reopenRate > 10 ? 'var(--color-semantic-danger)' : 'var(--color-semantic-warning)'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
