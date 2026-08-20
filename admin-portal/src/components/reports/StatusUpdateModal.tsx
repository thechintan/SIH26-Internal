import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Report, ReportStatus, VALID_STATUS_TRANSITIONS } from '../../types/report';
import { reportsApi } from '../../api/reports.api';
import { uploadsApi } from '../../api/uploads.api';
import { STATUS_CONFIG } from '../../utils/formatters';
import { Upload, CheckCircle2, AlertCircle, Image as ImageIcon, X } from 'lucide-react';

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  onSuccess: (updatedReport: Report) => void;
}

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  isOpen,
  onClose,
  report,
  onSuccess,
}) => {
  const validNextStatuses = VALID_STATUS_TRANSITIONS[report.status] || [];

  const [selectedStatus, setSelectedStatus] = useState<ReportStatus>(
    validNextStatuses[0] || report.status
  );
  const [note, setNote] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const next = VALID_STATUS_TRANSITIONS[report.status] || [];
      setSelectedStatus(next[0] || report.status);
      setNote('');
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoUrl('');
      setError(null);
    }
  }, [isOpen, report.status]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!note.trim()) {
      setError('A mandatory transition note is required.');
      return;
    }

    if (selectedStatus === 'resolved' && !photoFile && !photoUrl) {
      setError('An after-photo is mandatory when marking a report as Resolved.');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalPhotoUrl = photoUrl;

      // If user uploaded a new photo file, perform pre-signed S3 upload
      if (photoFile) {
        finalPhotoUrl = await uploadsApi.uploadImage(photoFile);
      }

      const updated = await reportsApi.updateStatus(report._id, {
        status: selectedStatus,
        note: note.trim(),
        photo_url: finalPhotoUrl || undefined,
      });

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update report status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Report Status"
      subtitle={`Transition report #${report._id.slice(-6).toUpperCase()} to the next lifecycle stage`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Current Status info */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-background-border text-xs">
          <span className="text-slate-400">Current Status:</span>
          <span className="font-semibold text-slate-200 capitalize">
            {STATUS_CONFIG[report.status]?.label || report.status}
          </span>
        </div>

        {/* Target Status Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Target Status <span className="text-rose-400">*</span>
          </label>
          {validNextStatuses.length === 0 ? (
            <p className="text-xs text-amber-400 bg-amber-950/40 p-3 rounded-xl border border-amber-900">
              This report has reached a terminal status and cannot be transitioned further.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {validNextStatuses.map((status) => {
                const config = STATUS_CONFIG[status];
                const isSelected = selectedStatus === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSelectedStatus(status)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-brand-600/20 border-brand-500 text-white shadow-glow-brand'
                        : 'bg-background-secondary border-background-border text-slate-400 hover:text-slate-200 hover:bg-background-hover'
                    }`}
                  >
                    <span>{config?.label || status}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Note textarea */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Mandatory Transition Note <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain actions taken, site inspection findings, or resolution summary..."
            className="w-full bg-background-secondary border border-background-border rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all p-3"
            required
          />
        </div>

        {/* Mandatory After-Photo when marking Resolved */}
        {selectedStatus === 'resolved' && (
          <div className="space-y-2 p-4 rounded-xl bg-background-secondary/80 border border-emerald-500/30">
            <label className="block text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
              Resolution After-Photo (Mandatory for verification) <span className="text-rose-400">*</span>
            </label>

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-background-border h-40 group">
                <img
                  src={photoPreview}
                  alt="Resolution Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-lg transition-colors cursor-pointer"
                  title="Remove Photo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-background-border hover:border-emerald-500/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-background-card/40 hover:bg-emerald-950/10 transition-colors">
                <Upload className="w-6 h-6 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Upload After-Photo (JPEG/PNG)
                </span>
                <span className="text-[11px] text-slate-400">
                  Direct S3 pre-signed upload
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-background-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={validNextStatuses.length === 0}
          >
            Confirm Status Update
          </Button>
        </div>
      </form>
    </Modal>
  );
};
