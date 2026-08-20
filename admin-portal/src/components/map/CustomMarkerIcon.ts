import L from 'leaflet';
import { PriorityTier, ReportStatus } from '../../types/report';
import { PRIORITY_CONFIG } from '../../utils/formatters';

export function createReportMarkerIcon(priority: PriorityTier | string, status: ReportStatus | string) {
  const p = (priority?.toLowerCase() || 'medium') as PriorityTier;
  const config = PRIORITY_CONFIG[p] || PRIORITY_CONFIG.medium;
  const isResolved = status === 'resolved' || status === 'verified';

  const pulseClass = p === 'critical' && !isResolved ? 'pulse-critical' : p === 'high' && !isResolved ? 'pulse-high' : '';

  const pinHtml = `
    <div class="custom-pin ${pulseClass}" style="width: 32px; height: 32px;">
      <div style="
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        background-color: ${config.color};
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      ">
        <div style="
          width: 12px;
          height: 12px;
          background-color: #090d16;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: pinHtml,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}
