'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Shortcut {
  key: string;
  label: string;
  action: () => void;
}

export interface StatusBarProps {
  shortcuts: Shortcut[];
  fixed?: boolean;
  disabled?: boolean;
  className?: string;
}

export function StatusBar({
  shortcuts,
  fixed = true,
  disabled = false,
  className,
}: StatusBarProps) {
  const [activeKey, setActiveKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcut = shortcuts.find((s) => {
        const key = s.key.toUpperCase();
        const eventKey = e.key.toUpperCase();
        // Handle Escape key mapping
        if (key === 'ESC' && eventKey === 'ESCAPE') return true;
        return key === eventKey;
      });

      if (shortcut) {
        setActiveKey(shortcut.key);
        shortcut.action();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const shortcut = shortcuts.find((s) => {
        const key = s.key.toUpperCase();
        const eventKey = e.key.toUpperCase();
        if (key === 'ESC' && eventKey === 'ESCAPE') return true;
        return key === eventKey;
      });

      if (shortcut) {
        setActiveKey(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [shortcuts, disabled]);

  return (
    <div
      data-testid="status-bar"
      className={cn(
        'flex items-center gap-1 border border-[hsl(var(--primary))]',
        'bg-[hsl(var(--background))] px-2 py-1 font-mono text-sm',
        fixed && 'fixed bottom-0 left-0 right-0',
        disabled && 'opacity-50',
        className
      )}
    >
      {shortcuts.map((shortcut) => (
        <button
          key={shortcut.key}
          onClick={shortcut.action}
          disabled={disabled}
          data-active={activeKey === shortcut.key ? 'true' : 'false'}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5',
            'transition-colors',
            activeKey === shortcut.key
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--background))]'
              : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--primary)/0.1)]',
            disabled && 'cursor-not-allowed'
          )}
        >
          <span className="font-bold text-[hsl(var(--primary))]">
            {shortcut.key}
          </span>
          <span>{shortcut.label}</span>
        </button>
      ))}
    </div>
  );
}
