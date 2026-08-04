import React, { HTMLAttributes } from 'react';

export function Card({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-surface-border bg-surface/90 shadow-[0_12px_36px_rgba(8,47,42,0.06)] backdrop-blur-md transition-all duration-200 ${className}`}
      {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`border-b border-surface-border px-6 py-4 ${className}`}
      {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`m-0 text-base font-bold text-text-main tracking-tight ${className}`}
      {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`mt-1 text-sm text-text-muted ${className}`}
      {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center justify-end border-t border-surface-border px-6 py-4 gap-3 bg-secondary/30 rounded-b-2xl ${className}`}
      {...props}>
      {children}
    </div>
  );
}
