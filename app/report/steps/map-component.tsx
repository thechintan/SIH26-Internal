'use client';

import { useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { GeoPoint } from '@/lib/contracts/common';

// Fix Leaflet's default icon path issues with Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  location: GeoPoint;
  onChange: (loc: GeoPoint) => void;
}

function LocationMarker({ location, onChange }: MapProps) {
  const markerRef = useRef<L.Marker>(null);
  
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return (
    <Marker
      position={[location.lat, location.lng]}
      ref={markerRef}
      draggable={true}
      eventHandlers={{
        dragend: () => {
          const marker = markerRef.current;
          if (marker) {
            const pos = marker.getLatLng();
            onChange({ lat: pos.lat, lng: pos.lng });
          }
        },
      }}
    />
  );
}

export default function LeafletMap({ location, onChange }: MapProps) {
  return (
    <div className="w-full h-full min-h-[300px] rounded-xl overflow-hidden border shadow-sm">
      <MapContainer
        center={[location.lat, location.lng]}
        zoom={16}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker location={location} onChange={onChange} />
      </MapContainer>
    </div>
  );
}
