import React from 'react';
import { Inbox, Database, RefreshCw, Plus } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isSeedHelper?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  isSeedHelper = false,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-background-border/80 rounded-2xl bg-background-secondary/30">
      <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 shadow-glow-brand">
        {icon || (isSeedHelper ? <Database className="w-8 h-8" /> : <Inbox className="w-8 h-8" />)}
      </div>

      <h4 className="text-lg font-bold text-slate-100 mb-1">{title}</h4>
      <p className="text-sm text-slate-400 max-w-md mb-6">{description}</p>

      {isSeedHelper && (
        <div className="w-full max-w-md bg-background-card border border-background-border rounded-xl p-4 mb-6 text-left text-xs font-mono text-slate-300">
          <div className="text-slate-400 font-sans text-xs font-semibold mb-2">
            💡 Quick Tip: Seed sample data
          </div>
          <div className="bg-background-secondary px-3 py-2 rounded border border-background-border text-emerald-400 select-all">
            cd backend &amp;&amp; npm run seed
          </div>
          <p className="font-sans text-[11px] text-slate-400 mt-2">
            This will populate wards, departments, staff accounts, routing rules, and sample reports.
          </p>
        </div>
      )}

      {actionLabel && onAction && (
        <Button
          variant="primary"
          onClick={onAction}
          leftIcon={isSeedHelper ? <RefreshCw className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
