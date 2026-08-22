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
      <div className="bg-[#111827]/90 backdrop-blur-md border border-white/[0.08] p-3 rounded-lg shadow-xl text-xs">
        <div className="font-semibold text-slate-200 mb-2">{label}</div>
        {payload.map((entry: TooltipEntry, i: number) => (
          <div key={i} className="flex items-center gap-2 text-slate-300 py-0.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}:</span>
            <span className="font-mono text-white">{entry.value}</span>
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
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Platform Analytics</h1>
          <p className="text-xs text-slate-400 mt-1">Live operational metrics and historical trends</p>
        </div>
        
        <div className="flex gap-2">
          <select className="bg-[#111827] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/40">
            <option>Last 14 days</option>
            <option>Last 30 days</option>
            <option>This Quarter</option>
          </select>
          <select className="bg-[#111827] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/40">
            <option>All Departments</option>
            <option>Public Works</option>
            <option>Sanitation</option>
            <option>Water & Drainage</option>
            <option>Electrical</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Incident Volume Trend */}
        <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Incident Volume Trend</h3>
            <p className="text-[10px] text-slate-500">Submitted vs Resolved per day</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <AreaChart data={VOLUME_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Area type="monotone" dataKey="submitted" name="New Incidents" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSub)" />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Performance */}
        <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Resolution Speed by Department</h3>
            <p className="text-[10px] text-slate-500">Average time to resolve (hours)</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={DEPT_PERF_DATA} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="resolveHours" name="Resolution Time (hrs)" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SLA Compliance */}
        <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-200">SLA Compliance by Priority</h3>
            <p className="text-[10px] text-slate-500">Percentage of incidents resolved within SLA</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <ComposedChart data={SLA_COMPLIANCE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="compliance" name="Actual Compliance %" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
                <Line type="step" dataKey="target" name="Target SLA %" stroke="#f43f5e" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quality Signal: Reopen Rate */}
        <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Quality Signal: Reopen Rate</h3>
              <p className="text-[10px] text-slate-500">Incidents reopened by citizens after being marked fixed</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-rose-400 font-bold bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                ⚠ Water & Drain &gt; 10%
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={DEPT_PERF_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="reopenRate" name="Reopen Rate %" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={30}>
                  {
                    DEPT_PERF_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.reopenRate > 10 ? '#f43f5e' : '#fb923c'} />
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
