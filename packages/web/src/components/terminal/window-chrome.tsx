'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface WindowChromeProps {
  title: string;
  children: React.ReactNode;
  controls?: boolean;
  variant?: 'default' | 'double';
  className?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function WindowChrome({
  title,
  children,
  controls = false,
  variant = 'default',
  className,
  onClose,
  onMinimize,
  onMaximize,
}: WindowChromeProps) {
  return (
    <div
      data-testid="window-chrome"
      data-variant={variant}
      className={cn(
        'border border-[hsl(var(--primary))] bg-[hsl(var(--background))]',
        'font-mono text-[hsl(var(--foreground))]',
        className
      )}
    >
      {/* Title Bar */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--primary))] px-2 py-1">
        <span className="text-sm font-bold text-[hsl(var(--primary))]">
          {variant === 'double' ? '╔' : '┌'} {title}
        </span>
        {controls && (
          <div className="flex items-center gap-1">
            <button
              aria-label="minimize"
              onClick={onMinimize}
              className="h-4 w-4 text-center text-xs text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--background))] transition-colors"
            >
              ─
            </button>
            <button
              aria-label="maximize"
              onClick={onMaximize}
              className="h-4 w-4 text-center text-xs text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--background))] transition-colors"
            >
              □
            </button>
            <button
              aria-label="close"
              onClick={onClose}
              className="h-4 w-4 text-center text-xs text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))] hover:text-[hsl(var(--background))] transition-colors"
            >
              ×
            </button>
          </div>
        )}
      </div>
      {/* Content */}
      <div className="p-2">
        {children}
      </div>
    </div>
  );
}
