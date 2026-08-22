'use client';

import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./ClientMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#0f1629] flex items-center justify-center">
      <div className="text-sm text-slate-500 animate-pulse">Loading map...</div>
    </div>
  ),
});

export default Map;
