'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PriorityTier } from '../../../lib/contracts/enums';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  tier?: PriorityTier;
  count?: number;
  title?: string;
  onClick?: () => void;
  isCentroid?: boolean;
}

interface ClientMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
}

// Helper to auto-fit bounds
function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) return;

    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 16);
      return;
    }

    const bounds = markers.map((m) => [m.lat, m.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [map, markers]);

  return null;
}

const TIER_BG_CLASS: Record<PriorityTier, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-slate-500',
};

export default function ClientMap({ markers, center = [28.6139, 77.2090], zoom = 11 }: ClientMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%', background: '#0f1629' }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <FitBounds markers={markers} />

      {markers.map((m) => {
        const bgClass = m.tier ? TIER_BG_CLASS[m.tier] : (m.isCentroid ? 'bg-blue-500' : 'bg-slate-500');
        const size = m.isCentroid ? 20 : (m.count ? Math.max(12, Math.min(48, m.count * 2.5)) : 10);
        const opacity = m.isCentroid ? 'opacity-30 border-2 border-blue-500' : 'opacity-80 shadow-lg';

        const icon = L.divIcon({
          className: 'bg-transparent border-0',
          html: `<div class="rounded-full ${bgClass} ${opacity} flex items-center justify-center text-white font-bold transition-transform hover:scale-110" 
                      style="width: ${size}px; height: ${size}px; font-size: ${Math.max(10, size/2.5)}px;">
                   ${m.count && m.count > 1 ? m.count : ''}
                 </div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        return (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={icon}
            eventHandlers={{
              click: () => {
                if (m.onClick) m.onClick();
              },
            }}
          >
            {m.title && (
              <Popup className="bg-slate-900 border-white/10 text-slate-200">
                <div className="font-sans font-medium text-xs">{m.title}</div>
              </Popup>
            )}
          </Marker>
        );
      })}
    </MapContainer>
  );
}
