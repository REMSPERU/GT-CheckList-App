import React from 'react';

export interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

export function StatusBadge({
  children,
  variant = 'success',
  className = '',
}: StatusBadgeProps) {
  const variantStyles = {
    success: 'bg-status-success-bg text-status-success border border-status-success/20',
    warning: 'bg-status-warning-bg text-status-warning border border-status-warning/20',
    danger: 'bg-status-danger-bg text-status-danger border border-status-danger/20',
    info: 'bg-status-info-bg text-status-info border border-status-info/20',
    neutral: 'bg-secondary text-text-muted border border-surface-border',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${variantStyles[variant]} ${className}`}>
      {children ?? '-'}
    </span>
  );
}

