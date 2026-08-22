'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({ value, onChange, options, placeholder = 'Select...', className = '' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ minWidth: 160 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--admin-bg-surface)',
          border: `1px solid ${isOpen ? 'var(--color-semantic-info)' : 'var(--admin-border)'}`,
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: 12,
          color: selectedOption ? 'var(--admin-text-primary)' : 'var(--admin-text-secondary)',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 1px var(--color-semantic-info)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <svg
          style={{ width: 14, height: 14, color: 'var(--admin-text-muted)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: 'var(--admin-bg-elevated)',
            border: '1px solid var(--admin-border)',
            borderRadius: 8,
            boxShadow: 'var(--admin-shadow-elevated)',
            zIndex: 50,
            maxHeight: 240,
            overflowY: 'auto',
            animation: 'fadeInDown 0.15s ease-out forwards',
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: '8px 12px',
                fontSize: 12,
                color: 'var(--admin-text-primary)',
                cursor: 'pointer',
                background: value === opt.value ? 'var(--admin-bg-active)' : 'transparent',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) {
                  e.currentTarget.style.background = 'var(--admin-bg-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: value === opt.value ? 600 : 400, color: value === opt.value ? 'var(--color-semantic-info)' : 'inherit' }}>
                  {opt.label}
                </span>
                {value === opt.value && (
                  <svg style={{ width: 14, height: 14, color: 'var(--color-semantic-info)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Required for the simple animation without adding a huge global stylesheet for this one component */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
