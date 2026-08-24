'use client';

import React, { useState } from 'react';
import {
  CATEGORIES,
  CATEGORY_LABEL,
  CATEGORY_SEVERITY_SEED,
  DEPARTMENTS,
  DEPARTMENT_LABEL,
  CATEGORY_DEPARTMENT,
  type Category,
  type Department,
} from '../../../lib/contracts/enums';
import { CATEGORY_ICONS } from '../_lib/constants';

type SettingsTab = 'severity' | 'routing' | 'sla' | 'roles';

/* ── Platform Settings Page ───────────────────────────────────────────────── */

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('severity');

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Platform Settings</h1>
          <p className="text-xs text-slate-400 mt-1">Configure system-wide parameters and routing rules</p>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <div className="lg:col-span-1 space-y-1">
          {[
            { id: 'severity' as const, label: 'Severity Weights (S_cat)' },
            { id: 'routing' as const, label: 'Department Routing' },
            { id: 'sla' as const, label: 'SLA Targets' },
            { id: 'roles' as const, label: 'Admin Roles' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500'
                  : 'text-slate-400 hover:bg-white/[0.02] border-l-2 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Panel */}
        <div className="lg:col-span-3">
          {activeTab === 'severity' && <SeverityWeightsPanel />}
          {activeTab === 'routing' && <DepartmentRoutingPanel />}
          {activeTab === 'sla' && <SLATargetsPanel />}
          {activeTab === 'roles' && <AdminRolesPanel />}
        </div>
      </div>
    </div>
  );
}

/* ── 1. Severity Weights Panel ────────────────────────────────────────────── */

function SeverityWeightsPanel() {
  const [weights, setWeights] = useState<Record<Category, number>>({ ...CATEGORY_SEVERITY_SEED });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    // Mock save — in real app: POST /api/admin/severity-config
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  const handleReset = () => {
    setWeights({ ...CATEGORY_SEVERITY_SEED });
  };

  const hasChanges = Object.keys(weights).some(
    (key) => weights[key as Category] !== CATEGORY_SEVERITY_SEED[key as Category]
  );

  return (
    <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-white">Severity Base Weights</h2>
          <div className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Controls baseline severity score <code className="bg-black/30 px-1 py-0.5 rounded text-pink-400">S_cat</code> in
            the Priority Engine formula. Scale is 1.0 (low) to 10.0 (critical).
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && <span className="text-xs font-medium text-emerald-400">✅ Saved</span>}
          <button
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] disabled:opacity-50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="space-y-5 pt-4 border-t border-white/[0.06]">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="flex flex-col md:flex-row md:items-center gap-4 group">
            <div className="md:w-48 flex items-center gap-3 shrink-0">
              <span className="text-xl opacity-80 group-hover:opacity-100 transition-opacity">
                {CATEGORY_ICONS[cat]}
              </span>
              <div>
                <div className="text-sm font-medium text-slate-200">{CATEGORY_LABEL[cat]}</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Default: {CATEGORY_SEVERITY_SEED[cat].toFixed(1)}
                </div>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={weights[cat]}
                onChange={(e) => setWeights({ ...weights, [cat]: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="w-12 text-right">
                <span
                  className={`font-mono text-sm font-bold ${
                    weights[cat] >= 8 ? 'text-red-400' : weights[cat] >= 5 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {weights[cat].toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasChanges && (
        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-amber-400 mt-0.5">⚠️</span>
            <div className="text-xs text-amber-200/80">
              <strong className="text-amber-400 block mb-1">Impact Warning</strong>
              Modifying weights will shift queue ranking on the next scoring cron tick.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 2. Department Routing Panel ──────────────────────────────────────────── */

function DepartmentRoutingPanel() {
  const [routing, setRouting] = useState<Record<Category, Department | null>>({ ...CATEGORY_DEPARTMENT });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    // Mock save — in real app: POST /api/admin/routing-config
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  const handleReset = () => {
    setRouting({ ...CATEGORY_DEPARTMENT });
  };

  const hasChanges = Object.keys(routing).some(
    (key) => routing[key as Category] !== CATEGORY_DEPARTMENT[key as Category]
  );

  return (
    <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-white">Department Routing</h2>
          <div className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Assign each incident category to a municipal department. New incidents auto-route on creation.
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && <span className="text-xs font-medium text-emerald-400">✅ Saved</span>}
          <button
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] disabled:opacity-50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-white/[0.06]">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="flex items-center justify-between gap-4 group">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-lg opacity-80 group-hover:opacity-100 transition-opacity">
                {CATEGORY_ICONS[cat]}
              </span>
              <div className="text-sm font-medium text-slate-200">{CATEGORY_LABEL[cat]}</div>
            </div>
            <select
              value={routing[cat] ?? ''}
              onChange={(e) => setRouting({ ...routing, [cat]: (e.target.value || null) as Department | null })}
              className="px-3 py-1.5 bg-slate-800/80 border border-white/[0.08] rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">Triage Queue (Unassigned)</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {DEPARTMENT_LABEL[dept]}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 3. SLA Targets Panel ─────────────────────────────────────────────────── */

function SLATargetsPanel() {
  const [targets, setTargets] = useState<Record<Category, { response_hours: number; resolution_hours: number }>>({
    POTHOLE: { response_hours: 4, resolution_hours: 48 },
    STREETLIGHT: { response_hours: 12, resolution_hours: 72 },
    DRAIN_MANHOLE: { response_hours: 8, resolution_hours: 96 },
    GARBAGE: { response_hours: 24, resolution_hours: 48 },
    STRUCTURAL: { response_hours: 2, resolution_hours: 168 },
    WATER_LEAK: { response_hours: 4, resolution_hours: 24 },
    FOOTPATH: { response_hours: 48, resolution_hours: 168 },
    ELECTRICAL: { response_hours: 2, resolution_hours: 24 },
    OTHER: { response_hours: 24, resolution_hours: 120 },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    // Mock save — in real app: POST /api/admin/sla-config
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  return (
    <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-white">SLA Targets</h2>
          <div className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Response = time to first acknowledgment. Resolution = time to close. All in hours.
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && <span className="text-xs font-medium text-emerald-400">✅ Saved</span>}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto pt-4 border-t border-white/[0.06]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-2 px-3 text-slate-400 font-semibold">Category</th>
              <th className="text-right py-2 px-3 text-slate-400 font-semibold">Response (hrs)</th>
              <th className="text-right py-2 px-3 text-slate-400 font-semibold">Resolution (hrs)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {CATEGORIES.map((cat) => (
              <tr key={cat} className="group hover:bg-white/[0.02]">
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                      {CATEGORY_ICONS[cat]}
                    </span>
                    <span className="text-slate-200 font-medium">{CATEGORY_LABEL[cat]}</span>
                  </div>
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={targets[cat].response_hours}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        [cat]: { ...targets[cat], response_hours: parseInt(e.target.value) || 1 },
                      })
                    }
                    className="w-16 px-2 py-1 bg-slate-800/80 border border-white/[0.08] rounded text-slate-200 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={targets[cat].resolution_hours}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        [cat]: { ...targets[cat], resolution_hours: parseInt(e.target.value) || 1 },
                      })
                    }
                    className="w-16 px-2 py-1 bg-slate-800/80 border border-white/[0.08] rounded text-slate-200 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── 4. Admin Roles Panel ─────────────────────────────────────────────────── */

function AdminRolesPanel() {
  const [users, setUsers] = useState([
    { id: '1', name: 'Super Admin', email: 'admin@city.gov', role: 'SUPER_ADMIN' as const, created: '2026-01-15' },
    { id: '2', name: 'Jane Smith', email: 'jane@city.gov', role: 'ADMIN' as const, created: '2026-02-01' },
    { id: '3', name: 'Mike Johnson', email: 'mike@city.gov', role: 'FIELD_STAFF' as const, created: '2026-03-10' },
  ]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'FIELD_STAFF'>('ADMIN');

  const handleInvite = () => {
    if (!inviteEmail) return;
    setUsers([
      ...users,
      {
        id: String(Date.now()),
        name: 'Pending',
        email: inviteEmail,
        role: inviteRole,
        created: new Date().toISOString().split('T')[0],
      },
    ]);
    setInviteEmail('');
    setShowInviteModal(false);
  };

  const handleRemove = (id: string) => {
    if (confirm('Remove this user?')) {
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  return (
    <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-white">Admin & Staff Users</h2>
          <div className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Manage access for municipal admins and field staff.
          </div>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          + Invite User
        </button>
      </div>

      <div className="overflow-x-auto pt-4 border-t border-white/[0.06]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-2 px-3 text-slate-400 font-semibold">Name</th>
              <th className="text-left py-2 px-3 text-slate-400 font-semibold">Email</th>
              <th className="text-left py-2 px-3 text-slate-400 font-semibold">Role</th>
              <th className="text-left py-2 px-3 text-slate-400 font-semibold">Joined</th>
              <th className="text-right py-2 px-3 text-slate-400 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {users.map((user) => (
              <tr key={user.id} className="group hover:bg-white/[0.02]">
                <td className="py-2 px-3 text-slate-200 font-medium">{user.name}</td>
                <td className="py-2 px-3 text-slate-400">{user.email}</td>
                <td className="py-2 px-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                      user.role === 'SUPER_ADMIN'
                        ? 'bg-purple-500/20 text-purple-300'
                        : user.role === 'ADMIN'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-400">{user.created}</td>
                <td className="py-2 px-3 text-right">
                  <button
                    onClick={() => handleRemove(user.id)}
                    disabled={user.role === 'SUPER_ADMIN'}
                    className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1f2937] border border-white/[0.1] rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold text-white">Invite New User</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@city.gov"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'FIELD_STAFF')}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="FIELD_STAFF">Field Staff</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
