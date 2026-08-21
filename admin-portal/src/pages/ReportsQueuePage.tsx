import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { reportsApi } from '../api/reports.api';
import { adminApi } from '../api/admin.api';
import { analyticsApi } from '../api/analytics.api';
import { useAuthStore } from '../store/authStore';
import { QueryReportsParams, Report } from '../types/report';
import { ReportFilterBar } from '../components/reports/ReportFilterBar';
import { StatusUpdateModal } from '../components/reports/StatusUpdateModal';
import { ReassignModal } from '../components/reports/ReassignModal';
import { PhotoLightbox } from '../components/lightbox/PhotoLightbox';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatDate, formatRelativeTime } from '../utils/formatters';
import {
  ClipboardList,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  ThumbsUp,
  Image as ImageIcon,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

export const ReportsQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [filters, setFilters] = useState<QueryReportsParams>({
    page: 1,
    limit: 15,
    sort: '-createdAt',
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Selected report for status update modal
  const [statusModalReport, setStatusModalReport] = useState<Report | null>(null);
  // Selected report for reassignment modal
  const [reassignModalReport, setReassignModalReport] = useState<Report | null>(null);
  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Fetch departments for filter
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => adminApi.getDepartments(),
  });

  // Fetch reports list
  const {
    data: reportsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['reports-queue', filters],
    queryFn: () => reportsApi.getReports(filters),
  });

  const reports = reportsData?.reports || [];
  const pagination = reportsData?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 };

  // Client-side search query filtering
  const filteredReports = reports.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const id = r._id?.toLowerCase() || '';
    const cat = r.category?.toLowerCase() || '';
    const address = r.address?.toLowerCase() || '';
    const desc = r.description?.toLowerCase() || '';
    return id.includes(q) || cat.includes(q) || address.includes(q) || desc.includes(q);
  });

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setFilters((prev) => ({ ...prev, page: newPage }));
    }
  };

  const handleSortChange = (sortField: string) => {
    setFilters((prev) => ({ ...prev, sort: sortField, page: 1 }));
  };

  const handleExportCsv = async () => {
    try {
      await analyticsApi.downloadCsv();
    } catch (e) {
      console.warn('Backend CSV export failed, downloading client data:', e);
    }
  };

  const handleOpenLightbox = (images: string[]) => {
    setLightboxImages(images);
    setIsLightboxOpen(true);
  };

  const handleUpdateSuccess = (updatedReport: Report) => {
    queryClient.invalidateQueries({ queryKey: ['reports-queue'] });
    queryClient.invalidateQueries({ queryKey: ['map-reports'] });
    queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
  };

  const canReassign = user?.role === 'super-admin' || user?.role === 'dept-head';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-brand-400" />
            Civic Report Queue
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Filter, triage, inspect photos, and update resolution lifecycle stages
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-3.5 h-3.5 text-brand-400" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <ReportFilterBar
        filters={filters}
        onFilterChange={setFilters}
        departments={departments}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Table Sorting & Meta Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          Showing <span className="font-semibold text-slate-200">{filteredReports.length}</span> of{' '}
          <span className="font-semibold text-slate-200">{pagination.total}</span> total reports
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase font-bold text-slate-400">Sort by:</span>
          <select
            value={filters.sort || '-createdAt'}
            onChange={(e) => handleSortChange(e.target.value)}
            className="bg-background-card border border-background-border rounded-lg text-slate-200 text-xs px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="-createdAt">Newest First</option>
            <option value="createdAt">Oldest First</option>
            <option value="-priority_score">Highest Priority Score</option>
            <option value="-upvote_count">Most Confirmations (Upvotes)</option>
          </select>
        </div>
      </div>

      {/* Main Reports Table */}
      <div className="bg-background-card border border-background-border rounded-2xl overflow-hidden shadow-card">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredReports.length === 0 ? (
          <EmptyState
            title="No Matching Reports Found"
            description="No grievances match the current filter criteria. Try adjusting or clearing your filters."
            isSeedHelper={pagination.total === 0}
            actionLabel="Reset Filters"
            onAction={() =>
              setFilters({
                page: 1,
                limit: 15,
                sort: '-createdAt',
              })
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-background-border bg-background-secondary/40 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Ref ID</th>
                  <th className="py-3.5 px-3">Photo</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3">Priority</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Ward &amp; Location</th>
                  <th className="py-3.5 px-3">Department &amp; Officer</th>
                  <th className="py-3.5 px-3">Upvotes</th>
                  <th className="py-3.5 px-3">Submitted</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-border/50">
                {filteredReports.map((report) => {
                  const wardName =
                    typeof report.ward_id === 'object' && report.ward_id
                      ? report.ward_id.name
                      : 'Unknown Ward';

                  const deptName =
                    typeof report.assigned_department_id === 'object' &&
                    report.assigned_department_id
                      ? report.assigned_department_id.name
                      : 'Unassigned';

                  const staffName =
                    typeof report.assigned_staff_id === 'object' && report.assigned_staff_id
                      ? report.assigned_staff_id.name
                      : null;

                  const hasPhotos = report.images && report.images.length > 0;
                  const firstPhoto = hasPhotos ? report.images![0] : null;

                  return (
                    <tr
                      key={report._id}
                      className="hover:bg-background-hover/70 transition-colors group cursor-pointer"
                    >
                      {/* Ref ID */}
                      <td
                        className="py-4 px-4 font-mono font-bold text-slate-200"
                        onClick={() => navigate(`/reports/${report._id}`)}
                      >
                        #{report._id.slice(-6).toUpperCase()}
                      </td>

                      {/* Photo Thumbnail */}
                      <td className="py-4 px-3">
                        {hasPhotos ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLightbox(report.images!);
                            }}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-background-border hover:border-brand-500 transition-all shrink-0 relative group/thumb cursor-pointer"
                            title="Click to view full photo"
                          >
                            <img
                              src={firstPhoto!}
                              alt="Report"
                              className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                            />
                            {report.images!.length > 1 && (
                              <span className="absolute bottom-0 right-0 bg-black/80 text-[9px] text-white px-1 rounded-tl">
                                +{report.images!.length - 1}
                              </span>
                            )}
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-background-secondary border border-background-border flex items-center justify-center text-slate-500">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td
                        className="py-4 px-3"
                        onClick={() => navigate(`/reports/${report._id}`)}
                      >
                        <CategoryBadge category={report.category} size="sm" />
                      </td>

                      {/* Priority */}
                      <td
                        className="py-4 px-3"
                        onClick={() => navigate(`/reports/${report._id}`)}
                      >
                        <PriorityBadge priority={report.priority_tier} size="sm" />
                      </td>

                      {/* Status */}
                      <td
                        className="py-4 px-3"
                        onClick={() => navigate(`/reports/${report._id}`)}
                      >
                        <StatusBadge status={report.status} size="sm" />
                      </td>

                      {/* Ward & Address */}
                      <td
                        className="py-4 px-3 max-w-[200px]"
                        onClick={() => navigate(`/reports/${report._id}`)}
                      >
                        <div className="font-semibold text-slate-200 truncate">{wardName}</div>
                        {report.address && (
                          <p className="text-[11px] text-slate-400 truncate">{report.address}</p>
                        )}
                      </td>

                      {/* Department & Staff */}
                      <td
                        className="py-4 px-3 max-w-[180px]"
                        onClick={() => navigate(`/reports/${report._id}`)}
                      >
                        <div className="font-medium text-slate-300 truncate">{deptName}</div>
                        {staffName && (
                          <div className="text-[11px] text-emerald-400 truncate flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            {staffName}
                          </div>
                        )}
                      </td>

                      {/* Upvotes */}
                      <td
                        className="py-4 px-3"
                        onClick={() => navigate(`/reports/${report._id}`)}
                      >
                        <div className="flex items-center gap-1 text-slate-300 font-medium">
                          <ThumbsUp className="w-3 h-3 text-brand-400" />
                          <span>{report.upvote_count || 0}</span>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td
                        className="py-4 px-3 text-slate-400 whitespace-nowrap"
                        onClick={() => navigate(`/reports/${report._id}`)}
                      >
                        <div>{formatRelativeTime(report.createdAt)}</div>
                        <div className="text-[10px] text-slate-400">
                          {formatDate(report.createdAt).split('•')[0]}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-4 text-right space-x-1 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusModalReport(report);
                          }}
                          className="text-xs"
                        >
                          Status
                        </Button>

                        {canReassign && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReassignModalReport(report);
                            }}
                            className="text-xs"
                          >
                            Reassign
                          </Button>
                        )}

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/reports/${report._id}`);
                          }}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-background-border bg-background-secondary/30 flex items-center justify-between text-xs">
            <div className="text-slate-400">
              Page <span className="font-semibold text-slate-200">{pagination.page}</span> of{' '}
              <span className="font-semibold text-slate-200">{pagination.totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <PhotoLightbox
        isOpen={isLightboxOpen}
        images={lightboxImages}
        onClose={() => setIsLightboxOpen(false)}
      />

      {/* Status Update Modal */}
      {statusModalReport && (
        <StatusUpdateModal
          isOpen={!!statusModalReport}
          onClose={() => setStatusModalReport(null)}
          report={statusModalReport}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {/* Reassign Modal */}
      {reassignModalReport && (
        <ReassignModal
          isOpen={!!reassignModalReport}
          onClose={() => setReassignModalReport(null)}
          report={reassignModalReport}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
};
