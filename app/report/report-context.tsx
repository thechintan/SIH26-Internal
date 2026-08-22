'use client';

import React, { createContext, useContext, useState } from 'react';
import type { CreateReportRequest } from '@/lib/contracts/report';

type PartialReportData = Partial<CreateReportRequest> & { imageFile?: File };

interface ReportContextType {
  data: PartialReportData;
  updateData: (updates: PartialReportData) => void;
  currentStep: number;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PartialReportData>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateData = (updates: PartialReportData) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, 6));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));
  const setStep = (step: number) => setCurrentStep(step);

  return (
    <ReportContext.Provider
      value={{
        data,
        updateData,
        currentStep,
        nextStep,
        prevStep,
        setStep,
        isSubmitting,
        setIsSubmitting,
      }}
    >
      {children}
    </ReportContext.Provider>
  );
}

export function useReportWizard() {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReportWizard must be used within a ReportProvider');
  }
  return context;
}
