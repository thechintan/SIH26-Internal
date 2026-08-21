import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../api/reports.api';
import { useAuthStore } from '../store/authStore';
import { Report } from '../types/report';
import { MiniMap } from '../components/map/MiniMap';
import { StatusUpdateModal } from '../components/reports/StatusUpdateModal';
import { ReassignModal } from '../components/reports/ReassignModal';
import { PhotoLightbox } from '../components/lightbox/PhotoLightbox';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Skeleton';
import { formatDate, formatRelativeTime, STATUS_CONFIG } from '../utils/formatters';
import {
  ArrowLeft,
  ThumbsUp,
  Clock,
  User,
  Building2,
  MapPin,
  FileText,
  Volume2,
  Image as ImageIcon,
  CheckCircle2,
  History,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  Edit3,
} from 'lucide-react';

export const ReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isUpvoting, setIsUpvoting] = useState(false);

  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['report-detail', id],
    queryFn: () => reportsApi.getReportById(id!),
    enabled: !!id,
  });

  const handleOpenLightbox = (images: string[], index = 0) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const handleUpvote = async () => {
    if (!report) return;
    setIsUpvoting(true);
    try {
      await reportsApi.upvote(report._id);
      queryClient.invalidateQueries({ queryKey: ['report-detail', id] });
    } catch (e: any) {
      console.warn('Upvote error:', e);
    } finally {
      setIsUpvoting(false);
    }
  };

  const handleStatusSuccess = (updated: Report) => {
    queryClient.setQueryData(['report-detail', id], updated);
    queryClient.invalidateQueries({ queryKey: ['reports-queue'] });
    queryClient.invalidateQueries({ queryKey: ['map-reports'] });
    queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="p-12 text-center border border-rose-800/60 rounded-2xl bg-rose-950/20 max-w-lg mx-auto space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Report Not Found</h3>
        <p className="text-xs text-slate-400">
          {(error as any)?.message || 'The requested civic report could not be loaded.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
          Back to Reports Queue
        </Button>
      </div>
    );
  }

  const wardName =
    typeof report.ward_id === 'object' && report.ward_id ? report.ward_id.name : 'Unknown Ward';

  const deptName =
    typeof report.assigned_department_id === 'object' && report.assigned_department_id
      ? report.assigned_department_id.name
      : 'Unassigned Department';

  const staffName =
    typeof report.assigned_staff_id === 'object' && report.assigned_staff_id
      ? report.assigned_staff_id.name
      : null;

  const staffEmail =
    typeof report.assigned_staff_id === 'object' && report.assigned_staff_id
      ? report.assigned_staff_id.email
      : null;

  const reporterName =
    typeof report.reporter_id === 'object' && report.reporter_id
      ? report.reporter_id.name
      : 'Citizen Reporter';

  const reporterPhone =
    typeof report.reporter_id === 'object' && report.reporter_id
      ? report.reporter_id.phone
      : null;

  const canReassign = user?.role === 'super-admin' || user?.role === 'dept-head';
  const hasImages = report.images && report.images.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Action & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-background-border/80 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/reports')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Report Queue
          </Button>

          <div className="h-4 w-px bg-background-border" />

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-black text-slate-100">
                #{report._id.slice(-6).toUpperCase()}
              </span>
              <PriorityBadge priority={report.priority_tier} size="md" />
              <StatusBadge status={report.status} size="md" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Submitted {formatDate(report.createdAt)} ({formatRelativeTime(report.createdAt)})
            </p>
          </div>
        </div>

        {/* Action Controls Header */}
        <div className="flex items-center gap-2.5">
          {/* Upvote button */}
          <button
            onClick={handleUpvote}
            disabled={isUpvoting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-background-card hover:bg-background-hover border border-background-border hover:border-brand-500 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
            title="Citizen Upvote Confirmation"
          >
            <ThumbsUp className="w-3.5 h-3.5 text-brand-400" />
            <span>{report.upvote_count || 0} Confirmations</span>
          </button>

          {canReassign && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsReassignModalOpen(true)}
              leftIcon={<Building2 className="w-4 h-4 text-brand-400" />}
            >
              Reassign
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsStatusModalOpen(true)}
            leftIcon={<Edit3 className="w-4 h-4" />}
          >
            Update Status
          </Button>
        </div>
      </div>

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details, Media, Voice, Timeline (2 cols wide) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description & Category Overview Card */}
          <div className="bg-background-card border border-background-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CategoryBadge category={report.category} size="md" />
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-300 font-medium">{wardName}</span>
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Priority Score: <span className="text-brand-300 font-bold">{report.priority_score}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Citizen Grievance Description
              </h4>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap bg-background-secondary/50 p-4 rounded-xl border border-background-border/60">
                {report.description || 'No textual description provided with this report.'}
              </p>
            </div>

            {/* Voice Note Audio Playback if present */}
            {report.voice_note_url && (
              <div className="p-4 rounded-xl bg-background-secondary border border-brand-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-300">
                  <Volume2 className="w-4 h-4 text-brand-400" />
                  <span>Citizen Voice Note Recording</span>
                </div>
                <audio controls className="w-full h-10 mt-1" src={report.voice_note_url}>
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>

          {/* Photo Evidence Gallery */}
          <div className="bg-background-card border border-background-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-brand-400" />
                Citizen Photo Evidence ({report.images?.length || 0})
              </h4>
              <span className="text-[11px] text-slate-400">Click to expand high-res lightbox</span>
            </div>

            {hasImages ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {report.images!.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleOpenLightbox(report.images!, idx)}
                    className="relative aspect-video rounded-xl overflow-hidden border border-background-border group cursor-pointer hover:border-brand-500 transition-all"
                  >
                    <img
                      src={imgUrl}
                      alt={`Report photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity backdrop-blur-xs">
                      View Photo #{idx + 1}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-background-border rounded-xl bg-background-secondary/30 text-xs text-slate-400">
                No initial photos attached to this report.
              </div>
            )}
          </div>

          {/* Status History Lifecycle Timeline */}
          <div className="bg-background-card border border-background-border rounded-2xl p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-brand-400" />
                Status Lifecycle &amp; Audit Trail
              </h4>
              <span className="text-[11px] text-slate-400">Enforced state machine transitions</span>
            </div>

            <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-background-border">
              {report.status_history?.map((entry, idx) => {
                const config = STATUS_CONFIG[entry.status] || STATUS_CONFIG.submitted;
                const isLast = idx === report.status_history.length - 1;

                return (
                  <div key={idx} className="relative group">
                    {/* Timeline Node Icon */}
                    <div
                      className={`absolute -left-6 top-0 w-5 h-5 rounded-full border-2 border-background-card flex items-center justify-center ${
                        isLast ? 'ring-4 ring-brand-500/20' : ''
                      }`}
                      style={{ backgroundColor: config.color }}
                    >
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>

                    {/* Timeline Event Card */}
                    <div className="bg-background-secondary/70 border border-background-border rounded-xl p-4 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded border ${config.badgeClass}`}
                          >
                            {config.label}
                          </span>
                          {entry.actor_id && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {typeof entry.actor_id === 'object'
                                ? entry.actor_id.name
                                : 'System / Officer'}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(entry.timestamp)} ({formatRelativeTime(entry.timestamp)})
                        </span>
                      </div>

                      {/* Transition Note */}
                      <p className="text-xs text-slate-300 bg-background-card/50 p-2.5 rounded-lg border border-background-border/40">
                        {entry.note || 'No transition note recorded.'}
                      </p>

                      {/* Resolution After-Photo if present */}
                      {entry.photo_url && (
                        <div className="pt-2">
                          <p className="text-[11px] font-semibold text-emerald-400 mb-1.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Resolution Verification After-Photo:
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenLightbox([entry.photo_url!], 0)}
                            className="relative w-40 aspect-video rounded-lg overflow-hidden border border-emerald-500/40 hover:border-emerald-400 group cursor-pointer"
                          >
                            <img
                              src={entry.photo_url}
                              alt="Resolution Proof"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-semibold transition-opacity">
                              Expand Proof
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: MiniMap & Metadata Cards */}
        <div className="space-y-6">
          {/* MiniMap Card */}
          <div className="bg-background-card border border-background-border rounded-2xl p-5 shadow-card space-y-3">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-400" />
              Geographic Location &amp; Ward
            </h4>

            <MiniMap
              coordinates={report.location.coordinates}
              address={report.address}
              priority={report.priority_tier}
              status={report.status}
              wardName={wardName}
            />

            {report.address && (
              <div className="text-xs text-slate-300 bg-background-secondary p-3 rounded-xl border border-background-border">
                <span className="font-semibold text-slate-400 block text-[10px] uppercase">
                  Street Address
                </span>
                {report.address}
              </div>
            )}
          </div>

          {/* Department & Staff Assignment Card */}
          <div className="bg-background-card border border-background-border rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-400" />
                Department &amp; Officer
              </h4>
              {canReassign && (
                <button
                  onClick={() => setIsReassignModalOpen(true)}
                  className="text-xs text-brand-400 hover:text-brand-300 font-semibold hover:underline cursor-pointer"
                >
                  Change
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-background-secondary p-3 rounded-xl border border-background-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Assigned Department
                </span>
                <p className="font-semibold text-slate-200">{deptName}</p>
              </div>

              <div className="bg-background-secondary p-3 rounded-xl border border-background-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Assigned Field Staff
                </span>
                {staffName ? (
                  <div>
                    <p className="font-semibold text-emerald-400">{staffName}</p>
                    {staffEmail && <p className="text-[11px] text-slate-400">{staffEmail}</p>}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Unassigned (Department Pool)</p>
                )}
              </div>
            </div>
          </div>

          {/* Citizen Reporter Card */}
          <div className="bg-background-card border border-background-border rounded-2xl p-5 shadow-card space-y-3">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-400" />
              Citizen Reporter
            </h4>

            <div className="bg-background-secondary p-3.5 rounded-xl border border-background-border space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Name:</span>
                <span className="font-semibold text-slate-200">{reporterName}</span>
              </div>
              {reporterPhone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Contact:</span>
                  <span className="font-mono text-slate-300">{reporterPhone}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-background-border/60">
                <span className="text-slate-400">Civic Confirmations:</span>
                <span className="font-bold text-brand-400 flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {report.upvote_count || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <PhotoLightbox
        isOpen={isLightboxOpen}
        images={lightboxImages}
        initialIndex={lightboxIndex}
        onClose={() => setIsLightboxOpen(false)}
      />

      {/* Status Update Modal */}
      <StatusUpdateModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        report={report}
        onSuccess={handleStatusSuccess}
      />

      {/* Reassign Modal */}
      <ReassignModal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        report={report}
        onSuccess={handleStatusSuccess}
      />
    </div>
  );
};
