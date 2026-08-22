'use client';

import { Camera, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { useReportWizard } from '../report-context';

export default function Step1Photo() {
  const { updateData, nextStep } = useReportWizard();
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      // We store both a local blob URL for preview and the file for upload
      const previewUrl = URL.createObjectURL(compressedFile);
      
      updateData({ 
        imageFile: compressedFile,
        photo_url: previewUrl, // Temporary local URL
      });
      nextStep();
    } catch (err) {
      console.error('Error compressing image:', err);
      // Fallback
      updateData({ 
        imageFile: file,
        photo_url: URL.createObjectURL(file),
      });
      nextStep();
    } finally {
      setIsCompressing(false);
    }
  };

  return (
    <div className="flex flex-col h-full items-center justify-center space-y-6 flex-1 py-12">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Take a photo</h2>
        <p className="text-gray-500">Show us the issue clearly.</p>
      </div>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <div className="flex flex-col gap-4 w-full">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isCompressing}
          className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
        >
          {isCompressing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Camera className="w-6 h-6" />
              <span className="font-semibold text-lg">Open Camera</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
