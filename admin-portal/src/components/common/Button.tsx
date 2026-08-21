import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-brand-600 hover:bg-brand-500 text-white shadow-glow-brand border border-brand-500/40 active:bg-brand-700',
    secondary:
      'bg-background-card hover:bg-background-hover text-slate-200 border border-background-border active:bg-background-secondary',
    danger:
      'bg-rose-600 hover:bg-rose-500 text-white shadow-glow-critical border border-rose-500/40 active:bg-rose-700',
    success:
      'bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow-success border border-emerald-500/40 active:bg-emerald-700',
    outline:
      'bg-transparent hover:bg-background-hover text-slate-300 border border-background-border active:bg-background-card',
    ghost:
      'bg-transparent hover:bg-background-card text-slate-300 hover:text-white active:bg-background-hover',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm font-medium rounded-lg gap-2',
    lg: 'px-5 py-2.5 text-base font-semibold rounded-xl gap-2.5',
  };

  return (
    <button
      className={`inline-flex items-center justify-center transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
