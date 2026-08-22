'use client';

import React, { useEffect, useRef } from 'react';
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
  isDark?: boolean;
}

const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

/** Forces Leaflet to recalculate its size — fixes the "grey tiles" bug when the
 *  container was hidden (display:none / tab-switch) at mount time. */
function MapResizer({ isDark }: { isDark: boolean }) {
  const map = useMap();
  // On mount, resize immediately + after a short delay (handles tab-switch animation lag)
  useEffect(() => {
    map.invalidateSize({ animate: false });
    const t = setTimeout(() => map.invalidateSize({ animate: false }), 300);
    return () => clearTimeout(t);
  // Re-run whenever isDark changes (tile swap also shifts layout slightly)
  }, [map, isDark]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Swaps the tile layer live whenever isDark changes — no page reload needed. */
function ThemedTileLayer({ isDark }: { isDark: boolean }) {
  const map = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (layerRef.current) map.removeLayer(layerRef.current);
    layerRef.current = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT).addTo(map);
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [map, isDark]);

  return null;
}

/** Auto-fits the viewport to all markers. */
function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) { map.setView([markers[0].lat, markers[0].lng], 15); return; }
    map.fitBounds(markers.map(m => [m.lat, m.lng] as [number, number]), { padding: [48, 48], maxZoom: 16 });
  }, [map, markers]);
  return null;
}

// Fallback colors for map markers in case CSS variables aren't evaluated natively by the DOM in leaflet icons
const TIER_COLOR: Record<PriorityTier, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f59e0b',
  MEDIUM:   '#3b82f6',
  LOW:      '#94a3b8',
};

export default function ClientMap({
  markers,
  center = [23.0225, 72.5714], // Ahmedabad default
  zoom = 12,
  isDark = true,
}: ClientMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%', background: isDark ? '#0d0f14' : '#f8f9fb' }}
      zoomControl={false}
      attributionControl={false}
    >
      {/* Invisible base layer — ThemedTileLayer manages the actual visible layer */}
      <TileLayer url="data:image/png;base64,iVBORw0KGgo=" />
      <ThemedTileLayer isDark={isDark} />
      <MapResizer isDark={isDark} />
      <FitBounds markers={markers} />

      {markers.map((m) => {
        const color = m.isCentroid
          ? '#8b5cf6'
          : m.tier ? TIER_COLOR[m.tier] : '#64748b';

        const size = m.isCentroid
          ? 22
          : m.count ? Math.max(14, Math.min(50, m.count * 3)) : 12;

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:${color};
            border:2.5px solid rgba(255,255,255,0.85);
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:700;font-size:${Math.max(9, size / 2.8)}px;
            font-family:system-ui,sans-serif;
            transition:transform 0.15s;cursor:pointer;
          ">${m.count && m.count > 1 ? m.count : ''}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        return (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={icon}
            eventHandlers={{ click: () => m.onClick?.() }}
          >
            {m.title && (
              <Popup>
                <span style={{ fontFamily: 'system-ui', fontSize: '12px', fontWeight: 500 }}>{m.title}</span>
              </Popup>
            )}
          </Marker>
        );
      })}
    </MapContainer>
  );
}
