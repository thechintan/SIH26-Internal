'use client';

import React, { useState } from 'react';
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_SEVERITY_SEED, type Category } from '../../../lib/contracts/enums';
import { CATEGORY_ICONS } from '../_lib/constants';

/* ── Severity Weight Configuration Page ───────────────────────────────────── */

export default function SettingsPage() {
  const [weights, setWeights] = useState<Record<Category, number>>({ ...CATEGORY_SEVERITY_SEED });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    // Simulate API call to save to category_severity table
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
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Platform Settings</h1>
          <p className="text-xs text-slate-400 mt-1">Configure system-wide parameters and routing rules</p>
        </div>
        
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs font-medium text-emerald-400">✅ Saved successfully</span>
          )}
          <button
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] disabled:opacity-50 transition-colors"
          >
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:bg-slate-700 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sidebar nav for settings (stubbed) */}
        <div className="lg:col-span-1 space-y-1">
          <div className="px-3 py-2 bg-blue-500/10 text-blue-400 text-sm font-medium border-l-2 border-blue-500 rounded-r-lg">
            Severity Weights (S_cat)
          </div>
          <div className="px-3 py-2 text-slate-400 text-sm font-medium hover:bg-white/[0.02] rounded-r-lg cursor-not-allowed">
            Department Routing
          </div>
          <div className="px-3 py-2 text-slate-400 text-sm font-medium hover:bg-white/[0.02] rounded-r-lg cursor-not-allowed">
            SLA Targets
          </div>
          <div className="px-3 py-2 text-slate-400 text-sm font-medium hover:bg-white/[0.02] rounded-r-lg cursor-not-allowed">
            Admin Roles
          </div>
        </div>

        {/* Main Panel: Severity Weights */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111827]/60 border border-white/[0.06] rounded-xl p-5 md:p-6 space-y-6">
            
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">Severity Base Weights</h2>
              <div className="text-xs text-slate-400 leading-relaxed">
                <p className="mb-2">
                  This controls the baseline severity score <code className="bg-black/30 px-1 py-0.5 rounded text-pink-400">S_cat</code> in the Priority Engine formula.
                </p>
                <p>
                  Scale is 1.0 (lowest priority) to 10.0 (highest priority). Changes apply immediately to all newly created incidents, but existing incident scores are recomputed gradually.
                </p>
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
                      <div className="text-[10px] text-slate-500 font-mono">Current: {CATEGORY_SEVERITY_SEED[cat].toFixed(1)}</div>
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
                      <span className={`font-mono text-sm font-bold ${
                        weights[cat] >= 8 ? 'text-red-400' :
                        weights[cat] >= 5 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
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
                    Modifying these weights will shift the queue ranking for all active incidents on the next scoring cron tick. Ensure Field Staff are aware of priority reshuffling.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
