/**
 * Shared UI constants for the admin dashboard.
 */

import type { PriorityTier, Status, Category } from '../../../lib/contracts/enums';

/* ── Priority tier → badge style ─────────────────────────────────────────── */

export const TIER_COLORS: Record<PriorityTier, { bg: string; text: string; border: string; dot: string }> = {
  CRITICAL: { bg: 'var(--bg-semantic-danger)', text: 'var(--color-semantic-danger)', border: 'var(--color-semantic-danger)', dot: 'var(--bg-semantic-danger)' },
  HIGH:     { bg: 'var(--bg-semantic-warning)', text: 'var(--color-semantic-warning)', border: 'var(--color-semantic-warning)', dot: 'var(--bg-semantic-warning)' },
  MEDIUM:   { bg: 'var(--bg-semantic-info)', text: 'var(--color-semantic-info)', border: 'var(--color-semantic-info)', dot: 'var(--bg-semantic-info)' },
  LOW:      { bg: 'var(--admin-bg-active)', text: 'var(--admin-text-secondary)', border: 'var(--admin-border)', dot: 'var(--admin-bg-active)' },
};

/* ── Status → badge style ────────────────────────────────────────────────── */

export const STATUS_COLORS: Record<Status, { bg: string; text: string; border: string }> = {
  SUBMITTED:    { bg: 'var(--bg-semantic-info)', text: 'var(--color-semantic-info)', border: 'var(--color-semantic-info)' },
  ACKNOWLEDGED: { bg: 'var(--bg-semantic-warning)', text: 'var(--color-semantic-warning)', border: 'var(--color-semantic-warning)' },
  ASSIGNED:     { bg: 'var(--bg-semantic-info)', text: 'var(--color-semantic-info)', border: 'var(--color-semantic-info)' },
  IN_PROGRESS:  { bg: 'var(--bg-semantic-info)', text: 'var(--color-semantic-info)', border: 'var(--color-semantic-info)' },
  RESOLVED:     { bg: 'var(--bg-semantic-success)', text: 'var(--color-semantic-success)', border: 'var(--color-semantic-success)' },
  VERIFIED:     { bg: 'var(--bg-semantic-success)', text: 'var(--color-semantic-success)', border: 'var(--color-semantic-success)' },
  REOPENED:     { bg: 'var(--bg-semantic-warning)', text: 'var(--color-semantic-warning)', border: 'var(--color-semantic-warning)' },
  REJECTED:     { bg: 'var(--bg-semantic-danger)', text: 'var(--color-semantic-danger)', border: 'var(--color-semantic-danger)' },
  DUPLICATE:    { bg: 'var(--admin-bg-active)', text: 'var(--admin-text-secondary)', border: 'var(--admin-border)' },
};

/* ── Category → emoji icon ────────────────────────────────────────────────── */

export const CATEGORY_ICONS: Record<Category, string> = {
  STRUCTURAL:    '🏗️',
  ELECTRICAL:    '⚡',
  DRAIN_MANHOLE: '🕳️',
  WATER_LEAK:    '💧',
  POTHOLE:       '🛣️',
  FOOTPATH:      '🚶',
  GARBAGE:       '🗑️',
  STREETLIGHT:   '💡',
  OTHER:         '📋',
};
