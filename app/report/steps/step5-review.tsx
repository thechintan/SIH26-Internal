'use client';

import { useState } from 'react';
import { useReportWizard } from '../report-context';
import { useMutation } from '@tanstack/react-query';
import { CATEGORY_LABEL } from '@/lib/contracts/enums';
import type { CreateReportRequest, CreateReportResponse } from '@/lib/contracts/report';
import { Loader2, CheckCircle, MapPin, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Step5Review() {
  const { data, prevStep } = useReportWizard();
  const [successResponse, setSuccessResponse] = useState<CreateReportResponse | null>(null);

  const submitMutation = useMutation({
    mutationFn: async () => {
      // 1. Get presigned URL
      const uploadRes = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: data.imageFile?.name || 'photo.jpg', contentType: data.imageFile?.type || 'image/jpeg' }),
      });
      if (!uploadRes.ok) throw new Error('Failed to get upload URL');
      const { url: presignedUrl, path: storagePath } = await uploadRes.json();

      // 2. Upload image
      if (data.imageFile) {
        await fetch(presignedUrl, {
          method: 'PUT',
          body: data.imageFile,
        });
      }

      // 3. Submit report
      const payload: CreateReportRequest = {
        category: data.category!,
        photo_url: storagePath,
        location: data.location!,
        gps_accuracy_m: data.gps_accuracy_m || 50, // default if missing
        description: data.description,
        severity_self: data.severity_self || 'MODERATE',
        device_fingerprint: 'demo-fingerprint-1234', // Simple mock fingerprint
      };

      const reportRes = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!reportRes.ok) throw new Error('Failed to submit report');
      
      return (await reportRes.json()) as CreateReportResponse;
    },
    onSuccess: (res) => {
      setSuccessResponse(res);
    },
  });

  if (successResponse) {
    return (
      <div className="flex flex-col h-full items-center justify-center space-y-6 text-center pt-8">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner mb-2 animate-in zoom-in duration-300">
          <CheckCircle className="w-10 h-10" />
        </div>
        
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Report Submitted!</h2>
        
        <div className="bg-white border rounded-2xl p-6 shadow-sm max-w-sm w-full space-y-4">
          <div className="flex justify-between items-center text-sm border-b pb-4">
            <span className="text-gray-500">Ticket ID</span>
            <span className="font-mono font-bold">{successResponse.ticket_id}</span>
          </div>
          
          {successResponse.clustered && (
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex gap-3 text-left">
              <AlertTriangle className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">You're not alone.</p>
                <p className="opacity-90 mt-1">
                  {successResponse.report_count - 1} other {successResponse.report_count - 1 === 1 ? 'person has' : 'people have'} already reported this issue. We've added your report to the existing ticket to boost its priority.
                </p>
              </div>
            </div>
          )}
        </div>

        <Link 
          href={`/track/${successResponse.report_id}`}
          className="mt-6 flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-xl font-semibold shadow hover:bg-gray-800 transition-colors"
        >
          Track this issue
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 flex-1">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Review & Submit</h2>
        <p className="text-sm text-gray-500">Make sure everything looks right.</p>
      </div>

      <div className="flex-1 space-y-4 mt-4">
        {/* Photo Preview */}
        {data.photo_url && (
          <div className="w-full h-48 rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <img src={data.photo_url} className="w-full h-full object-cover" alt="Issue preview" />
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y">
          {/* Category */}
          <div className="p-4 flex justify-between items-center">
            <span className="text-sm text-gray-500 font-medium">Category</span>
            <span className="font-semibold">{data.category ? CATEGORY_LABEL[data.category] : 'None'}</span>
          </div>
          
          {/* Severity */}
          <div className="p-4 flex justify-between items-center">
            <span className="text-sm text-gray-500 font-medium">Severity</span>
            <span className="font-semibold capitalize">{data.severity_self?.toLowerCase()}</span>
          </div>

          {/* Location */}
          <div className="p-4 flex flex-col gap-1">
            <span className="text-sm text-gray-500 font-medium flex items-center gap-1">
              <MapPin className="w-4 h-4" /> Location
            </span>
            <span className="font-mono text-xs text-gray-700 bg-gray-100 p-2 rounded-lg truncate">
              {data.location?.lat.toFixed(5)}, {data.location?.lng.toFixed(5)}
            </span>
          </div>
        </div>
      </div>

      {submitMutation.isError && (
        <p className="text-sm text-red-500 text-center font-medium bg-red-50 p-3 rounded-xl border border-red-200">
          Error: {submitMutation.error.message}
        </p>
      )}

      <div className="mt-auto pt-4 flex gap-3">
        <button
          onClick={prevStep}
          disabled={submitMutation.isPending}
          className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
          className="flex-[2] py-3 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-colors disabled:opacity-70"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Report'
          )}
        </button>
      </div>
    </div>
  );
}
