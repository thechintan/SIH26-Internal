import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { analyticsApi } from '../api/analytics.api';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import {
  BarChart3,
  Download,
  Clock,
  CheckCircle2,
  TrendingUp,
  Building2,
  Layers,
  PieChart as PieIcon,
  ShieldCheck,
} from 'lucide-react';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e'];

export const AnalyticsPage: React.FC = () => {
  const {
    data: analytics,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => analyticsApi.getSummary(),
  });

  const handleExportCsv = async () => {
    try {
      await analyticsApi.downloadCsv();
    } catch (e) {
      console.warn('CSV export error:', e);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <EmptyState
        title="Failed to Load Analytics"
        description="Could not retrieve municipal aggregation data. Ensure the backend is running and seeded."
        isSeedHelper={true}
        actionLabel="Retry"
        onAction={() => refetch()}
      />
    );
  }

  // Format category data
  const categoryData = (analytics.byCategory || []).map((c) => ({
    name: c.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    count: c.count,
    avgHours: c.avgResolutionHours,
  }));

  // Format department data
  const departmentData = (analytics.byDepartment || []).map((d) => ({
    name: d.department.replace(' Department', ''),
    count: d.count,
    avgHours: d.avgResolutionHours,
  }));

  // Format ward data
  const wardData = (analytics.byWard || []).map((w) => ({
    name: w.ward,
    count: w.count,
    avgHours: w.avgResolutionHours,
  }));

  // Trend data
  const trendData = analytics.volumeTrend || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-400" />
            Municipal Performance &amp; SLA Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Department benchmarks, resolution velocity, category trends, and SLA compliance metrics
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleExportCsv}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Export CSV Report
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Grievances Handled */}
        <div className="bg-background-card border border-background-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Volume
            </span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white">
              {analytics.totalCounts?.total || 0}
            </span>
            <p className="text-xs text-slate-400 mt-1">Grievances logged in database</p>
          </div>
        </div>

        {/* SLA Compliance % */}
        <div className="bg-background-card border border-background-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              SLA Compliance
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-emerald-400">
              {analytics.slaCompliancePercent}%
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Target SLA: Within {analytics.slaTargetHours}h
            </p>
          </div>
        </div>

        {/* Avg Resolution Time */}
        <div className="bg-background-card border border-background-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Avg Resolution Velocity
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white">
              {analytics.avgResolutionTimeHours}
            </span>
            <span className="text-sm text-slate-400 ml-1">hours</span>
            <p className="text-xs text-slate-400 mt-1">Creation to resolved state</p>
          </div>
        </div>

        {/* Avg Acknowledgment Time */}
        <div className="bg-background-card border border-background-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Auto-Routing Velocity
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-cyan-400">
              {analytics.avgAcknowledgmentTimeHours}
            </span>
            <span className="text-sm text-slate-400 ml-1">hours</span>
            <p className="text-xs text-slate-400 mt-1">Automated triage engine</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: 30-Day Volume Trend */}
        <div className="bg-background-card border border-background-border rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                30-Day Incident Volume Trend
              </h3>
              <p className="text-xs text-slate-400">Daily incoming grievances timeline</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2d4a" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#131b2e',
                    borderColor: '#1f2d4a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Reports Logged"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#volumeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Breakdown */}
        <div className="bg-background-card border border-background-border rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-indigo-400" />
                Incident Distribution by Category
              </h3>
              <p className="text-xs text-slate-400">Categorical breakdown of citizen complaints</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="name"
                  label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#131b2e',
                    borderColor: '#1f2d4a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Department Workload & Resolution Comparison */}
        <div className="bg-background-card border border-background-border rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                Departmental Workload &amp; Performance
              </h3>
              <p className="text-xs text-slate-400">
                Total reports handled and average resolution hours per department
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2d4a" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#131b2e',
                    borderColor: '#1f2d4a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="count" name="Reports Handled" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar
                  dataKey="avgHours"
                  name="Avg Resolution (Hours)"
                  fill="#06b6d4"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Ward Distribution */}
        <div className="bg-background-card border border-background-border rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Geographic Ward Density
              </h3>
              <p className="text-xs text-slate-400">
                Civic issue concentration across Ahmedabad municipal zones
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2d4a" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={120} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#131b2e',
                    borderColor: '#1f2d4a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Reports Count" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
