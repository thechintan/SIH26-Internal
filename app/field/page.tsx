'use client';

import React from 'react';
import Link from 'next/link';
import { CATEGORY_LABEL, DEPARTMENT_LABEL, type Department } from '../../lib/contracts/enums';
import { INCIDENTS } from '../../mocks/fixtures';
import { TIER_COLORS, STATUS_COLORS, CATEGORY_ICONS } from '../admin/_lib/constants';

/* ── Field Staff landing — list of assigned incidents ─────────────────────── */

export default function FieldStaffPage() {
  // Show only incidents assigned or in progress (field staff's work)
  const myIncidents = INCIDENTS.filter((i) =>
    ['ASSIGNED', 'IN_PROGRESS'].includes(i.status) && i.assigned_to
  );

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-100">
      {/* Mobile header */}
      <header className="sticky top-0 z-20 bg-[#0d1224]/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold">
            FS
          </div>
          <div>
            <div className="text-sm font-semibold">CivicReport</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">Field Staff</div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-3">
        <h1 className="text-lg font-bold text-white">My Assignments</h1>
        <p className="text-xs text-slate-500">
          {myIncidents.length} incident{myIncidents.length !== 1 ? 's' : ''} assigned to you
        </p>

        {myIncidents.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="text-3xl">✅</div>
            <div className="text-sm text-slate-400">No assignments right now</div>
            <div className="text-xs text-slate-600">Check back later for new work</div>
          </div>
        ) : (
          <div className="space-y-2">
            {myIncidents.map((inc) => {
              const tierColor = TIER_COLORS[inc.priority_tier];
              return (
                <Link
                  key={inc.incident_id}
                  href={`/field/${inc.incident_id}`}
                  className="block bg-[#111827]/60 border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.02] transition-colors active:scale-[0.99]"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{CATEGORY_ICONS[inc.category]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${tierColor.bg} ${tierColor.text} ${tierColor.border} border`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tierColor.dot}`} />
                          {inc.priority_tier}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_COLORS[inc.status]}`}>
                          {inc.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="text-sm font-medium text-slate-200">{CATEGORY_LABEL[inc.category]}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{inc.address}</div>

                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                        <span>{inc.report_count} reporter{inc.report_count !== 1 ? 's' : ''}</span>
                        {inc.department && (
                          <>
                            <span>·</span>
                            <span>{DEPARTMENT_LABEL[inc.department as Department]}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <svg className="w-5 h-5 text-slate-600 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
