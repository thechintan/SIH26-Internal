'use client';

import dynamic from 'next/dynamic';
import type { MapMarker } from './ClientMap';

const ClientMap = dynamic(() => import('./ClientMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 dark:bg-[#0f1629] flex items-center justify-center transition-colors duration-200">
      <div className="text-sm text-slate-400 dark:text-slate-500 animate-pulse">Loading map...</div>
    </div>
  ),
});

interface MapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  isDark?: boolean;
}

export default function Map({ markers, center, zoom, isDark = true }: MapProps) {
  return <ClientMap markers={markers} center={center} zoom={zoom} isDark={isDark} />;
}
