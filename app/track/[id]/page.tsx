'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Shield,
  AlertTriangle,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Building2,
} from 'lucide-react';
import { CATEGORY_LABEL, type Status } from '@/lib/contracts/enums';
import type { ReportDetail, TimelineEntry } from '@/lib/contracts/report';
import { useState } from 'react';

const STATUS_ICON: Record<Status, React.ElementType> = {
  SUBMITTED: Clock,
  ACKNOWLEDGED: Shield,
  ASSIGNED: Building2,
  IN_PROGRESS: AlertTriangle,
  RESOLVED: CheckCircle2,
  VERIFIED: CheckCircle2,
  REOPENED: AlertTriangle,
  REJECTED: AlertTriangle,
  DUPLICATE: AlertTriangle,
};

const STATUS_COLOR: Record<Status, string> = {
  SUBMITTED: 'text-gray-500 bg-gray-100',
  ACKNOWLEDGED: 'text-blue-600 bg-blue-50',
  ASSIGNED: 'text-indigo-600 bg-indigo-50',
  IN_PROGRESS: 'text-yellow-600 bg-yellow-50',
  RESOLVED: 'text-green-600 bg-green-50',
  VERIFIED: 'text-emerald-600 bg-emerald-50',
  REOPENED: 'text-orange-600 bg-orange-50',
  REJECTED: 'text-red-600 bg-red-50',
  DUPLICATE: 'text-purple-600 bg-purple-50',
};

const STATUS_LABEL: Record<Status, string> = {
  SUBMITTED: 'Submitted',
  ACKNOWLEDGED: 'Acknowledged',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  VERIFIED: 'Verified',
  REOPENED: 'Reopened',
  REJECTED: 'Rejected',
  DUPLICATE: 'Duplicate',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TimelineItem({ entry, isLast }: { entry: TimelineEntry; isLast: boolean }) {
  const Icon = STATUS_ICON[entry.status];
  const colorClass = STATUS_COLOR[entry.status];

  return (
    <div className="flex gap-3">
      {/* Dot and line */}
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
      </div>

      {/* Content */}
      <div className="pb-6 flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">{STATUS_LABEL[entry.status]}</p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(entry.at)}</p>
        {entry.department && (
          <p className="text-xs text-blue-600 font-medium mt-1">Dept: {entry.department}</p>
        )}
        {entry.note && (
          <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded-lg border">{entry.note}</p>
        )}
      </div>
    </div>
  );
}

function VerificationPrompt({ reportId, onDone }: { reportId: string; onDone: () => void }) {
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();

  const verifyMutation = useMutation({
    mutationFn: async (fixed: boolean) => {
      const res = await fetch(`/api/reports/${reportId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixed, note: note || undefined }),
      });
      if (!res.ok) throw new Error('Verification failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      onDone();
    },
  });

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <h3 className="font-bold text-amber-800 text-sm">Was this actually fixed?</h3>
      <p className="text-xs text-amber-700">
        Your answer matters. If enough people say no, the issue will be reopened automatically.
      </p>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note (e.g., still leaking)..."
        maxLength={140}
        className="w-full rounded-lg border border-amber-300 p-3 text-sm resize-none min-h-[60px] focus:ring-2 focus:ring-amber-400 outline-none bg-white"
      />

      <div className="flex gap-2">
        <button
          onClick={() => verifyMutation.mutate(true)}
          disabled={verifyMutation.isPending}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
        >
          <ThumbsUp className="w-4 h-4" /> Yes, fixed
        </button>
        <button
          onClick={() => verifyMutation.mutate(false)}
          disabled={verifyMutation.isPending}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
        >
          <ThumbsDown className="w-4 h-4" /> No, not fixed
        </button>
      </div>

      {verifyMutation.isError && (
        <p className="text-xs text-red-500">Something went wrong. Try again.</p>
      )}
    </div>
  );
}

export default function TrackReportPage() {
  const params = useParams();
  const reportId = params.id as string;
  const [verified, setVerified] = useState(false);

  const { data: report, isLoading, error } = useQuery<ReportDetail>({
    queryKey: ['report', reportId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${reportId}`);
      if (!res.ok) throw new Error('Failed to load report');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <p className="text-gray-500">Could not load this report.</p>
        <Link href="/my-reports" className="text-blue-600 text-sm font-semibold hover:underline">
          ← Back to My Reports
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b px-4 py-3 shadow-sm flex items-center gap-3">
        <Link href="/my-reports" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-sm font-bold text-gray-800">
            {CATEGORY_LABEL[report.category]}
          </h1>
          <p className="text-[10px] text-gray-400 font-mono">{report.ticket_id}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Photo */}
        <div className="w-full h-48 rounded-xl overflow-hidden shadow-sm border">
          <img
            src={report.photo_url}
            alt="Issue"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info card */}
        <div className="bg-white rounded-xl border shadow-sm divide-y">
          <div className="p-3 flex justify-between items-center">
            <span className="text-xs text-gray-500">Status</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[report.status]}`}>
              {STATUS_LABEL[report.status]}
            </span>
          </div>
          <div className="p-3 flex justify-between items-center">
            <span className="text-xs text-gray-500">Address</span>
            <span className="text-xs text-gray-700 text-right max-w-[60%] truncate">{report.address || 'Location pinned'}</span>
          </div>
          <div className="p-3 flex justify-between items-center">
            <span className="text-xs text-gray-500">Reporters</span>
            <span className="text-xs font-semibold text-blue-600">{report.report_count}</span>
          </div>
          {report.description && (
            <div className="p-3">
              <span className="text-xs text-gray-500 block mb-1">Description</span>
              <p className="text-sm text-gray-700">{report.description}</p>
            </div>
          )}
        </div>

        {/* Resolution photo */}
        {report.resolution_photo_url && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-gray-700">Resolution Photo</h2>
            <div className="w-full h-36 rounded-xl overflow-hidden shadow-sm border">
              <img src={report.resolution_photo_url} alt="Resolution" className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {/* Verification prompt */}
        {report.awaiting_verification && !verified && report.verified_by_me === null && (
          <VerificationPrompt reportId={reportId} onDone={() => setVerified(true)} />
        )}

        {verified && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-green-700">Thanks for verifying!</p>
          </div>
        )}

        {/* Timeline */}
        <div className="mt-6">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Status Timeline</h2>
          <div className="pl-1">
            {report.timeline.map((entry, i) => (
              <TimelineItem
                key={`${entry.status}-${entry.at}`}
                entry={entry}
                isLast={i === report.timeline.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
