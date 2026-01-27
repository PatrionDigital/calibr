'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Command {
  id: string;
  label: string;
  action: () => void;
  shortcut?: string;
  icon?: React.ReactNode;
  group?: string;
}

export interface CommandPaletteProps {
  commands: Command[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  className?: string;
}

function fuzzyMatch(text: string, query: string): boolean {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  let textIndex = 0;
  let queryIndex = 0;

  while (textIndex < textLower.length && queryIndex < queryLower.length) {
    if (textLower[textIndex] === queryLower[queryIndex]) {
      queryIndex++;
    }
    textIndex++;
  }

  return queryIndex === queryLower.length;
}

export function CommandPalette({
  commands,
  open,
  onOpenChange,
  placeholder = 'Type a command...',
  className,
}: CommandPaletteProps) {
  const [query, setQuery] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredCommands = React.useMemo(() => {
    if (!query) return commands;
    return commands.filter((cmd) => fuzzyMatch(cmd.label, query));
  }, [commands, query]);

  const groupedCommands = React.useMemo(() => {
    const groups = new Map<string | undefined, Command[]>();
    filteredCommands.forEach((cmd) => {
      const group = cmd.group;
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Reset state when opened
  React.useEffect(() => {
    if (open) {
      setQuery('');
      setHighlightedIndex(0);
      // Focus input after a short delay to ensure the component is mounted
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Reset highlight when filtered commands change
  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredCommands.length]);

  // Global keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open on Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
        return;
      }

      // Close on Escape
      if (open && e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const executeCommand = (command: Command) => {
    command.action();
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) =>
          i >= filteredCommands.length - 1 ? 0 : i + 1
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) =>
          i <= 0 ? filteredCommands.length - 1 : i - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[highlightedIndex]) {
          executeCommand(filteredCommands[highlightedIndex]);
        }
        break;
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="command-palette-backdrop"
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 z-50 bg-black/50"
      />

      {/* Palette */}
      <div
        data-testid="command-palette"
        className={cn(
          'fixed left-1/2 top-1/4 z-50 w-full max-w-lg -translate-x-1/2',
          'border border-[hsl(var(--primary))] bg-[hsl(var(--background))]',
          'font-mono shadow-lg',
          className
        )}
      >
        {/* Search Input */}
        <div className="border-b border-[hsl(var(--primary))] p-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus
            className={cn(
              'w-full bg-transparent text-[hsl(var(--foreground))]',
              'placeholder:text-[hsl(var(--muted-foreground))]',
              'outline-none'
            )}
          />
        </div>

        {/* Commands List */}
        <div className="max-h-64 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-2 py-4 text-center text-[hsl(var(--muted-foreground))]">
              No commands found
            </div>
          ) : (
            Array.from(groupedCommands.entries()).map(([group, cmds]) => (
              <div key={group || 'ungrouped'}>
                {group && (
                  <div className="px-2 py-1 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase">
                    {group}
                  </div>
                )}
                {cmds.map((cmd) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isHighlighted = globalIndex === highlightedIndex;

                  return (
                    <div
                      key={cmd.id}
                      data-command
                      data-highlighted={isHighlighted ? 'true' : 'false'}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setHighlightedIndex(globalIndex)}
                      className={cn(
                        'flex items-center justify-between px-2 py-1.5 cursor-pointer',
                        isHighlighted
                          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--background))]'
                          : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--primary)/0.1)]'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {cmd.icon && <span>{cmd.icon}</span>}
                        <span>{cmd.label}</span>
                      </div>
                      {cmd.shortcut && (
                        <span
                          className={cn(
                            'text-xs px-1 border',
                            isHighlighted
                              ? 'border-[hsl(var(--background))]'
                              : 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                          )}
                        >
                          {cmd.shortcut}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
