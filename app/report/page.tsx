'use client';

import { ReportProvider, useReportWizard } from './report-context';
import Step1Photo from './steps/step1-photo';
import Step2Category from './steps/step2-category';
import Step3Location from './steps/step3-location';
import Step4Context from './steps/step4-context';
import Step5Review from './steps/step5-review';

function WizardContent() {
  const { currentStep } = useReportWizard();

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col relative pb-20">
      {/* Progress Bar Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-bold text-gray-800 tracking-tight">
          Report Issue
        </h1>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                s <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
        {currentStep === 1 && <Step1Photo />}
        {currentStep === 2 && <Step2Category />}
        {currentStep === 3 && <Step3Location />}
        {currentStep === 4 && <Step4Context />}
        {currentStep === 5 && <Step5Review />}
      </div>
    </div>
  );
}

export default function ReportWizardPage() {
  return (
    <ReportProvider>
      <WizardContent />
    </ReportProvider>
  );
}
