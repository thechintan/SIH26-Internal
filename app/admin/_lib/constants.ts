/**
 * Shared UI constants for the admin dashboard.
 *
 * Extracted from layout.tsx because Next.js App Router layout files can only
 * export the default component + metadata. These are consumed by the command
 * center, incident detail, and field staff pages.
 */

import type { PriorityTier, Status, Category } from '../../../lib/contracts/enums';

/* ── Priority tier → badge colour (UI colour bands only — ENUMS.md) ──────── */

export const TIER_COLORS: Record<PriorityTier, { bg: string; text: string; border: string; dot: string }> = {
  CRITICAL: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
  HIGH:     { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-500' },
  MEDIUM:   { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
  LOW:      { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500' },
};

/* ── Status → badge colour ────────────────────────────────────────────────── */

export const STATUS_COLORS: Record<Status, string> = {
  SUBMITTED:    'bg-blue-500/15 text-blue-400',
  ACKNOWLEDGED: 'bg-cyan-500/15 text-cyan-400',
  ASSIGNED:     'bg-indigo-500/15 text-indigo-400',
  IN_PROGRESS:  'bg-purple-500/15 text-purple-400',
  RESOLVED:     'bg-green-500/15 text-green-400',
  VERIFIED:     'bg-emerald-500/15 text-emerald-400',
  REOPENED:     'bg-rose-500/15 text-rose-400',
  REJECTED:     'bg-stone-500/15 text-stone-400',
  DUPLICATE:    'bg-stone-500/15 text-stone-400',
};

/* ── Category → emoji icon ────────────────────────────────────────────────── */

export const CATEGORY_ICONS: Record<Category, string> = {
  STRUCTURAL:    '🏗️',
  ELECTRICAL:    '⚡',
  DRAIN_MANHOLE: '🕳️',
  WATER_LEAK:    '💧',
  POTHOLE:       '🕳️',
  FOOTPATH:      '🚶',
  GARBAGE:       '🗑️',
  STREETLIGHT:   '💡',
  OTHER:         '📋',
};
