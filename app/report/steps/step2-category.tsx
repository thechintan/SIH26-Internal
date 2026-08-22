'use client';

import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/lib/contracts/enums';
import { useReportWizard } from '../report-context';
import { 
  Building2, 
  Zap, 
  Waves, 
  Droplets, 
  AlertCircle, 
  Footprints, 
  Trash2, 
  Lightbulb, 
  HelpCircle 
} from 'lucide-react';

const icons: Record<Category, React.ElementType> = {
  STRUCTURAL: Building2,
  ELECTRICAL: Zap,
  DRAIN_MANHOLE: Waves,
  WATER_LEAK: Droplets,
  POTHOLE: AlertCircle, // Assuming pothole is warning
  FOOTPATH: Footprints,
  GARBAGE: Trash2,
  STREETLIGHT: Lightbulb,
  OTHER: HelpCircle,
};

export default function Step2Category() {
  const { data, updateData, nextStep, prevStep } = useReportWizard();

  const handleSelect = (category: Category) => {
    updateData({ category });
    nextStep();
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">What is it?</h2>
        <p className="text-sm text-gray-500">Select the best match.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = icons[cat];
          const isSelected = data.category === cat;
          return (
            <button
              key={cat}
              onClick={() => handleSelect(cat)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all active:scale-95 ${
                isSelected 
                  ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm ring-1 ring-blue-600'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <Icon className="w-8 h-8 mb-2 stroke-[1.5]" />
              <span className="text-[11px] font-medium text-center leading-tight">
                {CATEGORY_LABEL[cat]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-6 flex justify-between">
        <button
          onClick={prevStep}
          className="text-gray-500 font-medium px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}
