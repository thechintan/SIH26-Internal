import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Report } from '../../types/report';
import { Department, StaffUser } from '../../types/admin';
import { adminApi } from '../../api/admin.api';
import { reportsApi } from '../../api/reports.api';
import { UserCheck, AlertCircle, Building2, User } from 'lucide-react';

interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  onSuccess: (updatedReport: Report) => void;
}

export const ReassignModal: React.FC<ReassignModalProps> = ({
  isOpen,
  onClose,
  report,
  onSuccess,
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const currentDeptId =
        typeof report.assigned_department_id === 'object' && report.assigned_department_id
          ? report.assigned_department_id._id
          : (report.assigned_department_id as string) || '';

      const currentStaffId =
        typeof report.assigned_staff_id === 'object' && report.assigned_staff_id
          ? report.assigned_staff_id._id
          : (report.assigned_staff_id as string) || '';

      setSelectedDeptId(currentDeptId);
      setSelectedStaffId(currentStaffId);
      setError(null);
      loadMetadata();
    }
  }, [isOpen, report]);

  const loadMetadata = async () => {
    setIsLoadingData(true);
    try {
      const [depts, staff] = await Promise.all([
        adminApi.getDepartments().catch(() => []),
        adminApi.listStaff().catch(() => []),
      ]);
      setDepartments(depts);
      setStaffList(staff);
    } catch (e: any) {
      console.warn('Failed to load depts or staff:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Filter staff by selected department
  const filteredStaff = staffList.filter((s) => {
    if (!selectedDeptId) return true;
    const sDeptId =
      typeof s.department_id === 'object' && s.department_id
        ? s.department_id._id
        : s.department_id;
    return !sDeptId || sDeptId === selectedDeptId;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedDeptId) {
      setError('Please select a department.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await reportsApi.reassign(report._id, {
        department_id: selectedDeptId,
        staff_id: selectedStaffId || undefined,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reassign report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reassign Report"
      subtitle={`Change department or field officer for report #${report._id.slice(-6).toUpperCase()}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Department Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-brand-400" />
            Department <span className="text-rose-400">*</span>
          </label>
          <select
            value={selectedDeptId}
            onChange={(e) => {
              setSelectedDeptId(e.target.value);
              setSelectedStaffId(''); // reset staff when department changes
            }}
            className="w-full bg-background-secondary border border-background-border rounded-xl text-slate-100 text-xs px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            required
            disabled={isLoadingData}
          >
            <option value="">Select a Department</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Staff Assignment Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-brand-400" />
            Assigned Field Officer / Staff (Optional)
          </label>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="w-full bg-background-secondary border border-background-border rounded-xl text-slate-100 text-xs px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            disabled={isLoadingData}
          >
            <option value="">Unassigned (General Department Pool)</option>
            {filteredStaff.map((staff) => (
              <option key={staff._id} value={staff._id}>
                {staff.name} ({staff.email}) - {staff.role}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            {filteredStaff.length === 0
              ? 'No registered staff found for this department.'
              : `${filteredStaff.length} officer(s) available.`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-background-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={<UserCheck className="w-4 h-4" />}
          >
            Save Reassignment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
