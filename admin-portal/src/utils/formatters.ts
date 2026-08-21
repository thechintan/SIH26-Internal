import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { PriorityTier, ReportCategory, ReportStatus } from '../types/report';

export function formatDate(dateString?: string | Date): string {
  if (!dateString) return 'N/A';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'MMM dd, yyyy • HH:mm');
  } catch {
    return 'Invalid date';
  }
}

export function formatRelativeTime(dateString?: string | Date): string {
  if (!dateString) return 'N/A';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'N/A';
  }
}

export const CATEGORY_LABELS: Record<string, { label: string; iconName: string; color: string }> = {
  pothole: { label: 'Pothole & Road', iconName: 'AlertTriangle', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  streetlight: { label: 'Streetlight', iconName: 'Lightbulb', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  garbage: { label: 'Garbage & Waste', iconName: 'Trash2', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  water_leakage: { label: 'Water Leakage', iconName: 'Droplets', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  drainage: { label: 'Drainage & Sewage', iconName: 'Waves', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  stray_animal: { label: 'Animal Control', iconName: 'Dog', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  other: { label: 'General / Other', iconName: 'HelpCircle', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
};

export function getCategoryInfo(category: string) {
  return CATEGORY_LABELS[category] || {
    label: category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    iconName: 'HelpCircle',
    color: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  };
}

export const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; color: string; badgeClass: string; dotClass: string }
> = {
  submitted: {
    label: 'Submitted',
    color: '#94a3b8',
    badgeClass: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
    dotClass: 'bg-slate-400',
  },
  acknowledged: {
    label: 'Acknowledged',
    color: '#0284c7',
    badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-800/60',
    dotClass: 'bg-sky-400',
  },
  in_progress: {
    label: 'In Progress',
    color: '#6366f1',
    badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
    dotClass: 'bg-indigo-400',
  },
  resolved: {
    label: 'Resolved',
    color: '#10b981',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
    dotClass: 'bg-emerald-400',
  },
  verified: {
    label: 'Verified',
    color: '#059669',
    badgeClass: 'bg-teal-950/80 text-teal-300 border-teal-800/60',
    dotClass: 'bg-teal-400',
  },
  reopened: {
    label: 'Reopened',
    color: '#f43f5e',
    badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
    dotClass: 'bg-rose-400 animate-pulse',
  },
};

export const PRIORITY_CONFIG: Record<
  PriorityTier,
  { label: string; color: string; badgeClass: string; pingClass: string }
> = {
  critical: {
    label: 'Critical',
    color: '#ef4444',
    badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-800/80 font-semibold shadow-glow-critical',
    pingClass: 'bg-rose-500 animate-ping',
  },
  high: {
    label: 'High',
    color: '#f97316',
    badgeClass: 'bg-orange-950/80 text-orange-300 border-orange-800/80 font-medium',
    pingClass: 'bg-orange-500',
  },
  medium: {
    label: 'Medium',
    color: '#eab308',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    pingClass: 'bg-amber-500',
  },
  low: {
    label: 'Low',
    color: '#10b981',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    pingClass: 'bg-emerald-500',
  },
};
