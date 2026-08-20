import React from 'react';
import { QueryReportsParams } from '../../types/report';
import { Department } from '../../types/admin';
import { AHMEDABAD_WARDS } from '../../utils/wardsData';
import { Search, Filter, RotateCcw, Calendar } from 'lucide-react';
import { Button } from '../common/Button';

interface ReportFilterBarProps {
  filters: QueryReportsParams;
  onFilterChange: (filters: QueryReportsParams) => void;
  departments: Department[];
  searchQuery: string;
  onSearchChange: (search: string) => void;
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  filters,
  onFilterChange,
  departments,
  searchQuery,
  onSearchChange,
}) => {
  const handleChange = (key: keyof QueryReportsParams, value: any) => {
    onFilterChange({
      ...filters,
      page: 1, // reset to page 1 on filter change
      [key]: value === 'all' ? undefined : value,
    });
  };

  const handleReset = () => {
    onSearchChange('');
    onFilterChange({
      page: 1,
      limit: 20,
      sort: '-createdAt',
    });
  };

  const hasActiveFilters =
    filters.category ||
    filters.status ||
    filters.priority_tier ||
    filters.department_id ||
    filters.from_date ||
    filters.to_date ||
    searchQuery;

  return (
    <div className="bg-background-card border border-background-border rounded-2xl p-5 shadow-card space-y-4">
      {/* Top Search & Reset Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by ID, category, or address..."
            className="w-full bg-background-secondary border border-background-border rounded-xl text-slate-100 placeholder-slate-500 text-xs pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="text-rose-400 hover:text-rose-300"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Filter Selects Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Category */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Category
          </label>
          <select
            value={filters.category || 'all'}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full bg-background-secondary border border-background-border rounded-xl text-slate-200 text-xs px-2.5 py-2 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Categories</option>
            <option value="pothole">Pothole & Road</option>
            <option value="streetlight">Streetlight</option>
            <option value="garbage">Garbage & Waste</option>
            <option value="water_leakage">Water Leakage</option>
            <option value="drainage">Drainage & Sewage</option>
            <option value="stray_animal">Animal Control</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Status
          </label>
          <select
            value={filters.status || 'all'}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full bg-background-secondary border border-background-border rounded-xl text-slate-200 text-xs px-2.5 py-2 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="verified">Verified</option>
            <option value="reopened">Reopened</option>
          </select>
        </div>

        {/* Priority Tier */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Priority Tier
          </label>
          <select
            value={filters.priority_tier || 'all'}
            onChange={(e) => handleChange('priority_tier', e.target.value)}
            className="w-full bg-background-secondary border border-background-border rounded-xl text-slate-200 text-xs px-2.5 py-2 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical (≥40)</option>
            <option value="high">High (≥25)</option>
            <option value="medium">Medium (≥12)</option>
            <option value="low">Low (&lt;12)</option>
          </select>
        </div>

        {/* Department */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Department
          </label>
          <select
            value={filters.department_id || 'all'}
            onChange={(e) => handleChange('department_id', e.target.value)}
            className="w-full bg-background-secondary border border-background-border rounded-xl text-slate-200 text-xs px-2.5 py-2 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* From Date */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            From Date
          </label>
          <input
            type="date"
            value={filters.from_date || ''}
            onChange={(e) => handleChange('from_date', e.target.value)}
            className="w-full bg-background-secondary border border-background-border rounded-xl text-slate-200 text-xs px-2.5 py-2 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* To Date */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            To Date
          </label>
          <input
            type="date"
            value={filters.to_date || ''}
            onChange={(e) => handleChange('to_date', e.target.value)}
            className="w-full bg-background-secondary border border-background-border rounded-xl text-slate-200 text-xs px-2.5 py-2 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>
    </div>
  );
};
