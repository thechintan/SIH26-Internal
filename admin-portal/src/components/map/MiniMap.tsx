import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { PriorityTier, ReportStatus } from '../../types/report';
import { createReportMarkerIcon } from './CustomMarkerIcon';
import { WardOverlay } from './WardOverlay';
import { ExternalLink, Navigation } from 'lucide-react';

interface MiniMapProps {
  coordinates: [number, number]; // [lng, lat]
  address?: string;
  priority: PriorityTier | string;
  status: ReportStatus | string;
  wardName?: string;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  coordinates,
  address,
  priority,
  status,
  wardName,
}) => {
  const [lng, lat] = coordinates || [72.56, 23.04];
  const position: [number, number] = [lat, lng];

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden border border-background-border bg-background-secondary shadow-md">
      <MapContainer
        center={position}
        zoom={15}
        className="w-full h-full z-0"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <WardOverlay showLabels={false} />
        <Marker position={position} icon={createReportMarkerIcon(priority, status)}>
          <Popup>
            <div className="text-xs p-1">
              <p className="font-semibold text-slate-100">{wardName || 'Ward Area'}</p>
              {address && <p className="text-slate-300">{address}</p>}
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Floating Info & External Link Button */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex items-center justify-between bg-background-card/90 border border-background-border/80 rounded-lg px-3 py-2 text-xs backdrop-blur shadow">
        <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] truncate max-w-[200px]">
          <Navigation className="w-3.5 h-3.5 text-brand-400 shrink-0" />
          <span>
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-brand-400 hover:text-brand-300 font-medium hover:underline shrink-0"
        >
          Google Maps
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
