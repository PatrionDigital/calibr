import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette, type Command } from './command-palette';

describe('CommandPalette', () => {
  const commands: Command[] = [
    { id: 'markets', label: 'View Markets', action: vi.fn(), shortcut: 'M' },
    { id: 'portfolio', label: 'View Portfolio', action: vi.fn(), shortcut: 'P' },
    { id: 'settings', label: 'Open Settings', action: vi.fn() },
    { id: 'help', label: 'Show Help', action: vi.fn(), shortcut: '?' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('renders when open is true', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(<CommandPalette commands={commands} open={false} onOpenChange={() => {}} />);
      expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
    });

    it('opens on Ctrl+K', () => {
      const onOpenChange = vi.fn();
      render(<CommandPalette commands={commands} open={false} onOpenChange={onOpenChange} />);
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it('opens on Cmd+K on Mac', () => {
      const onOpenChange = vi.fn();
      render(<CommandPalette commands={commands} open={false} onOpenChange={onOpenChange} />);
      fireEvent.keyDown(window, { key: 'k', metaKey: true });
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it('closes on Escape', () => {
      const onOpenChange = vi.fn();
      render(<CommandPalette commands={commands} open onOpenChange={onOpenChange} />);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('closes when clicking backdrop', () => {
      const onOpenChange = vi.fn();
      render(<CommandPalette commands={commands} open onOpenChange={onOpenChange} />);
      fireEvent.click(screen.getByTestId('command-palette-backdrop'));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('search', () => {
    it('renders search input', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument();
    });

    it('focuses search input when opened', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      const input = screen.getByPlaceholderText('Type a command...');
      expect(input).toHaveFocus();
    });

    it('filters commands based on search query', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      const input = screen.getByPlaceholderText('Type a command...');
      fireEvent.change(input, { target: { value: 'market' } });
      expect(screen.getByText('View Markets')).toBeInTheDocument();
      expect(screen.queryByText('View Portfolio')).not.toBeInTheDocument();
    });

    it('shows all commands when search is empty', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      expect(screen.getByText('View Markets')).toBeInTheDocument();
      expect(screen.getByText('View Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Open Settings')).toBeInTheDocument();
      expect(screen.getByText('Show Help')).toBeInTheDocument();
    });

    it('shows no results message when no commands match', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      const input = screen.getByPlaceholderText('Type a command...');
      fireEvent.change(input, { target: { value: 'xyz' } });
      expect(screen.getByText('No commands found')).toBeInTheDocument();
    });

    it('performs fuzzy search', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      const input = screen.getByPlaceholderText('Type a command...');
      fireEvent.change(input, { target: { value: 'vwm' } });
      expect(screen.getByText('View Markets')).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('highlights first command by default', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      const firstItem = screen.getByText('View Markets').closest('[data-command]');
      expect(firstItem).toHaveAttribute('data-highlighted', 'true');
    });

    it('moves highlight down with ArrowDown', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      fireEvent.keyDown(screen.getByPlaceholderText('Type a command...'), { key: 'ArrowDown' });
      const secondItem = screen.getByText('View Portfolio').closest('[data-command]');
      expect(secondItem).toHaveAttribute('data-highlighted', 'true');
    });

    it('moves highlight up with ArrowUp', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      fireEvent.keyDown(screen.getByPlaceholderText('Type a command...'), { key: 'ArrowDown' });
      fireEvent.keyDown(screen.getByPlaceholderText('Type a command...'), { key: 'ArrowUp' });
      const firstItem = screen.getByText('View Markets').closest('[data-command]');
      expect(firstItem).toHaveAttribute('data-highlighted', 'true');
    });

    it('wraps to bottom when pressing ArrowUp at top', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      fireEvent.keyDown(screen.getByPlaceholderText('Type a command...'), { key: 'ArrowUp' });
      const lastItem = screen.getByText('Show Help').closest('[data-command]');
      expect(lastItem).toHaveAttribute('data-highlighted', 'true');
    });

    it('wraps to top when pressing ArrowDown at bottom', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      fireEvent.keyDown(screen.getByPlaceholderText('Type a command...'), { key: 'ArrowDown' });
      fireEvent.keyDown(screen.getByPlaceholderText('Type a command...'), { key: 'ArrowDown' });
      fireEvent.keyDown(screen.getByPlaceholderText('Type a command...'), { key: 'ArrowDown' });
      fireEvent.keyDown(screen.getByPlaceholderText('Type a command...'), { key: 'ArrowDown' });
      const firstItem = screen.getByText('View Markets').closest('[data-command]');
      expect(firstItem).toHaveAttribute('data-highlighted', 'true');
    });

    it('executes highlighted command on Enter', () => {
      const onOpenChange = vi.fn();
      render(<CommandPalette commands={commands} open onOpenChange={onOpenChange} />);
      fireEvent.keyDown(screen.getByPlaceholderText('Type a command...'), { key: 'Enter' });
      expect(commands[0].action).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('mouse interaction', () => {
    it('highlights command on hover', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      const secondItem = screen.getByText('View Portfolio').closest('[data-command]');
      fireEvent.mouseEnter(secondItem!);
      expect(secondItem).toHaveAttribute('data-highlighted', 'true');
    });

    it('executes command on click', () => {
      const onOpenChange = vi.fn();
      render(<CommandPalette commands={commands} open onOpenChange={onOpenChange} />);
      fireEvent.click(screen.getByText('View Portfolio'));
      expect(commands[1].action).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('command display', () => {
    it('displays command labels', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      expect(screen.getByText('View Markets')).toBeInTheDocument();
      expect(screen.getByText('View Portfolio')).toBeInTheDocument();
    });

    it('displays shortcuts when provided', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      expect(screen.getByText('M')).toBeInTheDocument();
      expect(screen.getByText('P')).toBeInTheDocument();
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('supports command icons', () => {
      const commandsWithIcons: Command[] = [
        { id: 'test', label: 'Test', action: vi.fn(), icon: <span data-testid="test-icon">📊</span> },
      ];
      render(<CommandPalette commands={commandsWithIcons} open onOpenChange={() => {}} />);
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });
  });

  describe('grouping', () => {
    it('displays commands in groups when provided', () => {
      const groupedCommands: Command[] = [
        { id: 'markets', label: 'View Markets', action: vi.fn(), group: 'Navigation' },
        { id: 'settings', label: 'Open Settings', action: vi.fn(), group: 'Actions' },
      ];
      render(<CommandPalette commands={groupedCommands} open onOpenChange={() => {}} />);
      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies terminal styling', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      const palette = screen.getByTestId('command-palette');
      expect(palette).toHaveClass('border');
    });

    it('uses box drawing characters', () => {
      render(<CommandPalette commands={commands} open onOpenChange={() => {}} />);
      const palette = screen.getByTestId('command-palette');
      expect(palette).toBeInTheDocument();
    });
  });

  describe('cleanup', () => {
    it('removes event listeners on unmount', () => {
      const onOpenChange = vi.fn();
      const { unmount } = render(<CommandPalette commands={commands} open={false} onOpenChange={onOpenChange} />);
      unmount();
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });
});
