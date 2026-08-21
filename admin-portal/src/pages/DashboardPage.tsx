import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { reportsApi } from '../api/reports.api';
import { analyticsApi } from '../api/analytics.api';
import { useAuthStore } from '../store/authStore';
import { LiveMap } from '../components/map/LiveMap';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatRelativeTime } from '../utils/formatters';
import {
  AlertOctagon,
  Clock,
  CheckCircle2,
  TrendingUp,
  Activity,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Flame,
  BarChart2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Query map reports (refreshes every 30s)
  const {
    data: mapReports = [],
    isLoading: isMapLoading,
    refetch: refetchMap,
  } = useQuery({
    queryKey: ['map-reports', selectedCategory, selectedStatus],
    queryFn: () =>
      reportsApi.getMapReports({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
      }),
    refetchInterval: 30000, // 30s polling per SRS FR-7.4
  });

  // Query analytics summary for top cards (refreshes every 30s)
  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => analyticsApi.getSummary(),
    refetchInterval: 30000,
  });

  // Query recent critical/urgent reports
  const { data: recentReportsData, isLoading: isRecentLoading } = useQuery({
    queryKey: ['recent-reports'],
    queryFn: () => reportsApi.getReports({ limit: 5, sort: '-createdAt' }),
    refetchInterval: 30000,
  });

  const recentReports = recentReportsData?.reports || [];

  // Summary counts
  const counts = analytics?.totalCounts || {};
  const totalOpenReports =
    (counts.submitted || 0) +
    (counts.acknowledged || 0) +
    (counts.in_progress || 0) +
    (counts.reopened || 0);

  const criticalCount = mapReports.filter((r) => r.priority_tier === 'critical').length;
  const highCount = mapReports.filter((r) => r.priority_tier === 'high').length;

  const categoriesList = [
    { key: 'all', label: 'All Issues' },
    { key: 'pothole', label: 'Pothole & Road' },
    { key: 'garbage', label: 'Garbage' },
    { key: 'streetlight', label: 'Streetlight' },
    { key: 'water_leakage', label: 'Water Leak' },
    { key: 'drainage', label: 'Drainage' },
    { key: 'stray_animal', label: 'Animal Control' },
  ];

  const statusesList = [
    { key: 'all', label: 'All Statuses' },
    { key: 'acknowledged', label: 'Acknowledged' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'reopened', label: 'Reopened' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header with user welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Municipal Operations Dashboard
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time civic issue tracking, automated dispatch, and municipal SLA monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/analytics')}
            leftIcon={<BarChart2 className="w-4 h-4 text-brand-400" />}
          >
            Analytics &amp; SLA
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/reports')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            View Report Queue
          </Button>
        </div>
      </div>

      {/* Top Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Open Reports */}
        <div className="bg-background-card border border-background-border rounded-2xl p-5 shadow-card relative overflow-hidden group hover:border-brand-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Open Grievances
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isAnalyticsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{totalOpenReports}</span>
                <span className="text-xs text-slate-400">active reports</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
              <span className="text-indigo-400 font-semibold">{counts.in_progress || 0}</span> in progress •{' '}
              <span className="text-sky-400 font-semibold">{counts.acknowledged || 0}</span> queued
            </div>
          </div>
        </div>

        {/* Card 2: Critical & High Priority */}
        <div className="bg-background-card border border-background-border rounded-2xl p-5 shadow-card relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Critical &amp; High
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-glow-critical">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-3">
            {isMapLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-400">
                  {criticalCount + highCount}
                </span>
                <span className="text-xs text-slate-400">requiring attention</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
              <span className="text-rose-400 font-semibold">{criticalCount} Critical</span> •{' '}
              <span className="text-orange-400 font-semibold">{highCount} High</span>
            </div>
          </div>
        </div>

        {/* Card 3: Avg Resolution Time */}
        <div className="bg-background-card border border-background-border rounded-2xl p-5 shadow-card relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Avg Resolution Time
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isAnalyticsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  {analytics?.avgResolutionTimeHours || 0}
                </span>
                <span className="text-xs text-slate-400">hours</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
              Target SLA: <span className="text-amber-400 font-semibold">{analytics?.slaTargetHours || 24}h</span>
            </div>
          </div>
        </div>

        {/* Card 4: SLA Compliance Rate */}
        <div className="bg-background-card border border-background-border rounded-2xl p-5 shadow-card relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              SLA Compliance
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isAnalyticsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-400">
                  {analytics?.slaCompliancePercent || 100}%
                </span>
                <span className="text-xs text-slate-400">on-time</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-semibold">{counts.resolved || 0}</span> resolved •{' '}
              <span className="text-teal-400 font-semibold">{counts.verified || 0}</span> verified
            </div>
          </div>
        </div>
      </div>

      {/* Map Section Header & Quick Filter Pills */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Flame className="w-4 h-4 text-brand-400" />
              Live Interactive GIS Incident Map
            </h3>
            <p className="text-xs text-slate-400">
              Clustered markers color-coded by priority tier • Heatmap hotspot toggle • Ward boundary zones
            </p>
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {statusesList.map((st) => (
              <button
                key={st.key}
                onClick={() => setSelectedStatus(st.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  selectedStatus === st.key
                    ? 'bg-brand-600 text-white font-semibold shadow-glow-brand'
                    : 'bg-background-card hover:bg-background-hover text-slate-400 hover:text-slate-200 border border-background-border'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {categoriesList.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat.key
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500 shadow-glow-brand font-semibold'
                  : 'bg-background-card/80 hover:bg-background-card text-slate-400 hover:text-slate-200 border border-background-border'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Live Interactive Map Display */}
        {isMapLoading && mapReports.length === 0 ? (
          <Skeleton className="w-full h-[540px] rounded-2xl" />
        ) : mapReports.length === 0 && !isMapLoading ? (
          <EmptyState
            title="No Map Incidents Found"
            description="There are currently no report coordinates matching the selected filters. If this is a fresh setup, please seed the database."
            isSeedHelper={true}
            actionLabel="Refresh Map Feed"
            onAction={() => refetchMap()}
          />
        ) : (
          <LiveMap
            reports={mapReports}
            selectedCategory={selectedCategory}
            selectedStatus={selectedStatus}
            onSelectCategory={setSelectedCategory}
            onSelectStatus={setSelectedStatus}
          />
        )}
      </div>

      {/* Recent High Priority Reports Stream Table */}
      <div className="bg-background-card border border-background-border rounded-2xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Recent Incidents Stream
            </h3>
            <p className="text-xs text-slate-400">Latest incoming reports needing action</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/reports')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            All Reports
          </Button>
        </div>

        {isRecentLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : recentReports.length === 0 ? (
          <EmptyState
            title="No Recent Reports"
            description="No reports have been submitted yet."
            isSeedHelper={true}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-background-border text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Ref ID</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Ward</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Submitted</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-border/50">
                {recentReports.map((report) => (
                  <tr
                    key={report._id}
                    onClick={() => navigate(`/reports/${report._id}`)}
                    className="hover:bg-background-hover/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-300">
                      #{report._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="py-3.5 px-3">
                      <CategoryBadge category={report.category} size="sm" />
                    </td>
                    <td className="py-3.5 px-3">
                      <PriorityBadge priority={report.priority_tier} size="sm" />
                    </td>
                    <td className="py-3.5 px-3">
                      <StatusBadge status={report.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {typeof report.ward_id === 'object' && report.ward_id
                        ? report.ward_id.name
                        : 'Unknown Ward'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {typeof report.assigned_department_id === 'object' &&
                      report.assigned_department_id
                        ? report.assigned_department_id.name
                        : 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-400">
                      {formatRelativeTime(report.createdAt)}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <span className="text-brand-400 group-hover:text-brand-300 font-semibold inline-flex items-center gap-1">
                        View <ArrowRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
