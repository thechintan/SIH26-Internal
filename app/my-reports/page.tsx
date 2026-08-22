'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { MapPin, Clock, Users, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { CATEGORY_LABEL, type Status } from '@/lib/contracts/enums';
import type { MyReportListItem } from '@/lib/contracts/report';

const STATUS_COLOR: Record<Status, string> = {
  SUBMITTED: 'bg-gray-100 text-gray-700',
  ACKNOWLEDGED: 'bg-blue-100 text-blue-700',
  ASSIGNED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-700',
  VERIFIED: 'bg-emerald-100 text-emerald-800',
  REOPENED: 'bg-orange-100 text-orange-800',
  REJECTED: 'bg-red-100 text-red-700',
  DUPLICATE: 'bg-purple-100 text-purple-700',
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ReportCard({ report }: { report: MyReportListItem }) {
  return (
    <Link
      href={`/track/${report.report_id}`}
      className="block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all active:scale-[0.99] overflow-hidden"
    >
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-gray-100">
          <img
            src={report.photo_url}
            alt="Report photo"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {CATEGORY_LABEL[report.category]}
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[report.status]}`}>
              {STATUS_LABEL[report.status]}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{report.address || 'Location pinned'}</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(report.created_at)}
            </div>
            <div className="flex items-center gap-1 text-blue-600 font-medium">
              <Users className="w-3 h-3" />
              {report.report_count} {report.report_count === 1 ? 'reporter' : 'reporters'}
            </div>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-gray-300 self-center shrink-0" />
      </div>

      {/* Verification prompt banner */}
      {report.awaiting_verification && (
        <div className="bg-amber-50 border-t border-amber-200 px-3 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs font-medium text-amber-700">
            Was this actually fixed? Tap to verify.
          </span>
        </div>
      )}
    </Link>
  );
}

export default function MyReportsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-reports'],
    queryFn: async () => {
      const res = await fetch('/api/my-reports');
      if (!res.ok) throw new Error('Failed to load reports');
      return res.json();
    },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b px-4 py-3 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800 tracking-tight">My Reports</h1>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-3">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">Loading your reports...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-red-400">
            <AlertCircle className="w-8 h-8 mb-3" />
            <p className="text-sm">Could not load reports. Please try again.</p>
          </div>
        )}

        {data?.items?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <MapPin className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm font-medium">No reports yet</p>
            <Link href="/report" className="mt-4 text-blue-600 text-sm font-semibold hover:underline">
              Report an issue →
            </Link>
          </div>
        )}

        {data?.items?.map((report: MyReportListItem) => (
          <ReportCard key={report.report_id} report={report} />
        ))}
      </div>
    </main>
  );
}
