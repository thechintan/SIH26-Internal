'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import { useReportWizard } from '../report-context';
import type { GeoPoint } from '@/lib/contracts/common';

// Dynamically import map to avoid SSR 'window is not defined' errors
const LeafletMap = dynamic(() => import('./map-component'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] rounded-xl border bg-gray-100 flex items-center justify-center animate-pulse">
      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
    </div>
  ),
});

export default function Step3Location() {
  const { data, updateData, nextStep, prevStep } = useReportWizard();
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [location, setLocation] = useState<GeoPoint>(
    data.location || { lat: 28.6139, lng: 77.2090 } // Default to New Delhi if no location
  );

  useEffect(() => {
    // If we don't have a location yet, try to get it immediately
    if (!data.location) {
      handleLocate();
    }
  }, []);

  const handleLocate = () => {
    setIsLocating(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocation(newLoc);
        updateData({
          location: newLoc,
          gps_accuracy_m: Math.round(position.coords.accuracy),
        });
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setError('Could not fetch GPS location. Please drag the pin on the map.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleNext = () => {
    // Ensure we have it saved in context
    updateData({ location });
    nextStep();
  };

  return (
    <div className="flex flex-col h-full space-y-4 flex-1">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Where is it?</h2>
        <p className="text-sm text-gray-500">Drag the pin to the exact spot.</p>
      </div>

      <div className="flex-1 relative min-h-[300px] my-4 rounded-xl shadow-inner border border-gray-200 p-1 bg-white">
        <LeafletMap location={location} onChange={setLocation} />
        
        <button
          onClick={handleLocate}
          disabled={isLocating}
          className="absolute bottom-4 right-4 z-[400] bg-white p-3 rounded-full shadow-lg border hover:bg-gray-50 transition-all text-blue-600 disabled:opacity-50"
        >
          {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}
      {data.gps_accuracy_m && (
        <p className="text-xs text-green-600 text-center font-medium">
          GPS Accuracy: ±{data.gps_accuracy_m}m
        </p>
      )}

      <div className="mt-auto pt-4 flex gap-3">
        <button
          onClick={prevStep}
          className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-colors"
        >
          Confirm Location
        </button>
      </div>
    </div>
  );
}
