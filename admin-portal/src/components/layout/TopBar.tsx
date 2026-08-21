import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Radio, Bell } from 'lucide-react';

interface TopBarProps {
  title?: string;
  subtitle?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle }) => {
  const queryClient = useQueryClient();
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setSecondsUntilRefresh(30);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <header className="h-16 border-b border-background-border bg-background-card/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Page Title & Context */}
      <div>
        {title && <h2 className="text-base font-bold text-slate-100">{title}</h2>}
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      {/* Action Controls & Live Status */}
      <div className="flex items-center gap-4">
        {/* Live Polling Status Indicator */}
        <div className="flex items-center gap-2 bg-background-secondary border border-background-border rounded-xl px-3 py-1.5 text-xs text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-medium text-slate-300 hidden sm:inline">
            Live Feed:
          </span>
          <span className="font-mono text-[11px] text-emerald-400 font-semibold w-6 text-right">
            {secondsUntilRefresh}s
          </span>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="ml-1 p-1 hover:text-white text-slate-400 hover:bg-background-hover rounded transition-colors"
            title="Refresh data now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
