import React from 'react';
import { Polygon, Tooltip } from 'react-leaflet';
import { AHMEDABAD_WARDS } from '../../utils/wardsData';

interface WardOverlayProps {
  showLabels?: boolean;
}

export const WardOverlay: React.FC<WardOverlayProps> = ({ showLabels = true }) => {
  return (
    <>
      {AHMEDABAD_WARDS.map((ward) => (
        <Polygon
          key={ward.name}
          positions={ward.coordinates}
          pathOptions={{
            color: ward.color,
            weight: 2,
            dashArray: '4, 6',
            fillColor: ward.color,
            fillOpacity: 0.07,
          }}
        >
          {showLabels && (
            <Tooltip permanent direction="center" className="ward-tooltip">
              <span className="font-semibold text-xs text-slate-200 bg-background-card/90 px-2 py-1 rounded border border-background-border shadow">
                {ward.name}
              </span>
            </Tooltip>
          )}
        </Polygon>
      ))}
    </>
  );
};
