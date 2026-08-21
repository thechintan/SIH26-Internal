import React from 'react';
import { PriorityTier, ReportStatus } from '../../types/report';
import { PRIORITY_CONFIG, STATUS_CONFIG, getCategoryInfo } from '../../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

export interface PriorityBadgeProps {
  priority: PriorityTier | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'md',
  showDot = true,
}) => {
  const p = (priority?.toLowerCase() || 'medium') as PriorityTier;
  const config = PRIORITY_CONFIG[p] || PRIORITY_CONFIG.medium;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.badgeClass} ${sizeClasses[size]}`}
    >
      {showDot && (
        <span className="relative flex h-2 w-2">
          {p === 'critical' && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
          )}
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: config.color }}
          />
        </span>
      )}
      {config.label}
    </span>
  );
};

export interface StatusBadgeProps {
  status: ReportStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const s = (status?.toLowerCase() || 'submitted') as ReportStatus;
  const config = STATUS_CONFIG[s] || STATUS_CONFIG.submitted;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
    lg: 'px-3 py-1.5 text-sm font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.badgeClass} ${sizeClasses[size]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
};

export interface CategoryBadgeProps {
  category: string;
  size?: 'sm' | 'md';
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, size = 'md' }) => {
  const info = getCategoryInfo(category);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${info.color} ${sizeClasses}`}
    >
      <CategoryIcon category={category} className="w-3.5 h-3.5" />
      {info.label}
    </span>
  );
};
