import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';

interface PhotoLightboxProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setScale(1);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  if (!isOpen || images.length === 0) return null;

  const handlePrev = () => {
    setScale(1);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setScale(1);
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handleResetZoom = () => setScale(1);

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Top Bar Controls */}
      <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-white text-sm font-medium px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/60 backdrop-blur">
          Photo {currentIndex + 1} of {images.length}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800/60 border border-slate-700/60 rounded-xl p-1 backdrop-blur">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <a
            href={currentImage}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="p-2 text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/50 border border-slate-700/60 rounded-xl transition-colors backdrop-blur"
            title="Open in new tab"
          >
            <Download className="w-5 h-5" />
          </a>

          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/50 border border-slate-700/60 rounded-xl transition-colors backdrop-blur"
            title="Close Lightbox"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white bg-slate-900/70 hover:bg-slate-800 border border-slate-700 rounded-full transition-all z-20 hover:scale-110"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white bg-slate-900/70 hover:bg-slate-800 border border-slate-700 rounded-full transition-all z-20 hover:scale-110"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Main Image Container */}
      <div
        className="w-full h-full flex items-center justify-center p-8 overflow-hidden cursor-grab active:cursor-grabbing"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img
          src={currentImage}
          alt={`Report Photo ${currentIndex + 1}`}
          style={{ transform: `scale(${scale})` }}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-transform duration-150 select-none"
        />
      </div>

      {/* Thumbnails row if multiple */}
      {images.length > 1 && (
        <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2 p-2 z-20 overflow-x-auto">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setScale(1);
                setCurrentIndex(idx);
              }}
              className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                idx === currentIndex
                  ? 'border-brand-500 ring-2 ring-brand-500/50 scale-105'
                  : 'border-slate-700/80 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
