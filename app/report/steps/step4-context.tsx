'use client';

import { useState } from 'react';
import { useReportWizard } from '../report-context';
import { SEVERITY_SELF, type SeveritySelf } from '@/lib/contracts/enums';

export default function Step4Context() {
  const { data, updateData, nextStep, prevStep } = useReportWizard();
  const [description, setDescription] = useState(data.description || '');
  const [severity, setSeverity] = useState<SeveritySelf>(data.severity_self || 'MODERATE');

  const handleNext = () => {
    updateData({ description, severity_self: severity });
    nextStep();
  };

  const getSeverityColor = (sev: SeveritySelf, isSelected: boolean) => {
    if (!isSelected) return 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50';
    if (sev === 'MINOR') return 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500';
    if (sev === 'MODERATE') return 'bg-yellow-50 border-yellow-500 text-yellow-700 ring-1 ring-yellow-500';
    return 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500';
  };

  return (
    <div className="flex flex-col h-full space-y-6 flex-1">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">More Details</h2>
        <p className="text-sm text-gray-500">Optional, but helps crews prioritize.</p>
      </div>

      <div className="space-y-6 flex-1 mt-4">
        {/* Severity */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700 block">
            How severe is this?
          </label>
          <div className="flex gap-2">
            {SEVERITY_SELF.map((sev) => {
              const isSelected = severity === sev;
              return (
                <button
                  key={sev}
                  onClick={() => setSeverity(sev)}
                  className={`flex-1 py-3 px-2 rounded-xl border font-medium text-sm transition-all ${getSeverityColor(
                    sev,
                    isSelected
                  )}`}
                >
                  {sev.charAt(0) + sev.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700 block">
            Any other details?
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Deep pothole on the left lane, dangerous for two-wheelers..."
            maxLength={140}
            className="w-full rounded-xl border border-gray-300 p-4 min-h-[120px] resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
          />
          <div className="text-right text-xs text-gray-400 font-medium">
            {description.length} / 140
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 flex gap-3">
        <button
          onClick={prevStep}
          className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-colors"
        >
          Review & Submit
        </button>
      </div>
    </div>
  );
}
