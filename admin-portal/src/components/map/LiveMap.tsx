import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { MapReport } from '../../types/report';
import { createReportMarkerIcon } from './CustomMarkerIcon';
import { HeatmapLayer } from './HeatmapLayer';
import { WardOverlay } from './WardOverlay';
import { CITY_DEFAULT_CENTER, CITY_DEFAULT_ZOOM } from '../../utils/wardsData';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../common/Badge';
import { formatRelativeTime } from '../../utils/formatters';
import { Layers, Flame, MapPin, Eye, ThumbsUp, Compass } from 'lucide-react';

interface LiveMapProps {
  reports: MapReport[];
  selectedCategory?: string;
  selectedStatus?: string;
  onSelectCategory?: (cat: string) => void;
  onSelectStatus?: (status: string) => void;
}

// Controller component to smoothly reposition map
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({
  center,
  zoom,
}) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

export const LiveMap: React.FC<LiveMapProps> = ({
  reports,
  selectedCategory = 'all',
  selectedStatus = 'all',
  onSelectCategory,
  onSelectStatus,
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'markers' | 'heatmap'>('markers');
  const [showWards, setShowWards] = useState(true);

  // Filter reports
  const filteredReports = reports.filter((r) => {
    if (!r.location?.coordinates || r.location.coordinates.length < 2) return false;
    if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
    return true;
  });

  // Calculate heatmap points: [lat, lng, intensity]
  const heatPoints: Array<[number, number, number]> = filteredReports.map((r) => {
    const [lng, lat] = r.location.coordinates;
    const intensity =
      r.priority_tier === 'critical'
        ? 1.0
        : r.priority_tier === 'high'
        ? 0.75
        : r.priority_tier === 'medium'
        ? 0.5
        : 0.3;
    return [lat, lng, intensity];
  });

  return (
    <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-background-border bg-background-secondary shadow-card">
      {/* Top Map Floating Controls */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* View Mode Toggle Pill */}
        <div className="flex items-center bg-background-card/90 border border-background-border rounded-xl p-1 shadow-lg backdrop-blur pointer-events-auto">
          <button
            onClick={() => setViewMode('markers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'markers'
                ? 'bg-brand-600 text-white shadow-glow-brand'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Pins ({filteredReports.length})
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'heatmap'
                ? 'bg-rose-600 text-white shadow-glow-critical'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Heatmap
          </button>
        </div>

        {/* Layer Toggles & Status Bar */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowWards((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium backdrop-blur shadow-lg transition-all ${
              showWards
                ? 'bg-background-card/95 border-brand-500/50 text-brand-300'
                : 'bg-background-card/70 border-background-border text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Ward Zones
          </button>
        </div>
      </div>

      {/* Leaflet Map */}
      <MapContainer
        center={CITY_DEFAULT_CENTER}
        zoom={CITY_DEFAULT_ZOOM}
        className="w-full h-full z-0"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {showWards && <WardOverlay showLabels={true} />}

        {viewMode === 'heatmap' ? (
          <HeatmapLayer points={heatPoints} />
        ) : (
          filteredReports.map((report) => {
            const [lng, lat] = report.location.coordinates;
            return (
              <Marker
                key={report._id}
                position={[lat, lng]}
                icon={createReportMarkerIcon(report.priority_tier, report.status)}
              >
                <Popup className="custom-popup">
                  <div className="p-4 w-64 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        #{report._id.slice(-6).toUpperCase()}
                      </span>
                      <PriorityBadge priority={report.priority_tier} size="sm" />
                    </div>

                    <div className="flex items-center gap-2">
                      <CategoryBadge category={report.category} size="sm" />
                      <StatusBadge status={report.status} size="sm" />
                    </div>

                    {report.address && (
                      <p className="text-xs text-slate-300 line-clamp-2">
                        📍 {report.address}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-background-border/60">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-brand-400" />
                        {report.upvote_count || 0} confirmations
                      </span>
                      <span>{formatRelativeTime(report.createdAt)}</span>
                    </div>

                    <button
                      onClick={() => navigate(`/reports/${report._id}`)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-glow-brand"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })
        )}
      </MapContainer>

      {/* Map Legend at bottom left */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-background-card/90 border border-background-border rounded-xl p-3 shadow-lg backdrop-blur text-xs space-y-2 pointer-events-auto max-w-xs">
        <div className="font-bold text-slate-200 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-brand-400" />
          Priority Map Legend
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-glow-critical animate-pulse" />
            <span className="text-slate-300">Critical (≥40)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="text-slate-300">High (≥25)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-300">Medium (≥12)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Low (&lt;12)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
