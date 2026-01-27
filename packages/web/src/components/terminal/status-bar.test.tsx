import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusBar, type Shortcut } from './status-bar';

describe('StatusBar', () => {
  const shortcuts: Shortcut[] = [
    { key: 'F1', label: 'Help', action: vi.fn() },
    { key: 'F2', label: 'Markets', action: vi.fn() },
    { key: 'F5', label: 'Refresh', action: vi.fn() },
    { key: 'ESC', label: 'Close', action: vi.fn() },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders status bar', () => {
      render(<StatusBar shortcuts={shortcuts} />);
      expect(screen.getByTestId('status-bar')).toBeInTheDocument();
    });

    it('renders all shortcut keys', () => {
      render(<StatusBar shortcuts={shortcuts} />);
      expect(screen.getByText('F1')).toBeInTheDocument();
      expect(screen.getByText('F2')).toBeInTheDocument();
      expect(screen.getByText('F5')).toBeInTheDocument();
      expect(screen.getByText('ESC')).toBeInTheDocument();
    });

    it('renders all shortcut labels', () => {
      render(<StatusBar shortcuts={shortcuts} />);
      expect(screen.getByText('Help')).toBeInTheDocument();
      expect(screen.getByText('Markets')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('uses box drawing border', () => {
      render(<StatusBar shortcuts={shortcuts} />);
      const bar = screen.getByTestId('status-bar');
      expect(bar).toHaveClass('border');
    });
  });

  describe('keyboard interaction', () => {
    it('triggers action when shortcut key is pressed', () => {
      render(<StatusBar shortcuts={shortcuts} />);
      fireEvent.keyDown(window, { key: 'F1' });
      expect(shortcuts[0].action).toHaveBeenCalled();
    });

    it('triggers correct action for each key', () => {
      render(<StatusBar shortcuts={shortcuts} />);
      fireEvent.keyDown(window, { key: 'F5' });
      expect(shortcuts[2].action).toHaveBeenCalled();
      expect(shortcuts[0].action).not.toHaveBeenCalled();
    });

    it('handles Escape key', () => {
      render(<StatusBar shortcuts={shortcuts} />);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(shortcuts[3].action).toHaveBeenCalled();
    });

    it('ignores unregistered keys', () => {
      render(<StatusBar shortcuts={shortcuts} />);
      fireEvent.keyDown(window, { key: 'F12' });
      shortcuts.forEach((s) => expect(s.action).not.toHaveBeenCalled());
    });
  });

  describe('click interaction', () => {
    it('triggers action when shortcut is clicked', () => {
      render(<StatusBar shortcuts={shortcuts} />);
      fireEvent.click(screen.getByText('F1').closest('button')!);
      expect(shortcuts[0].action).toHaveBeenCalled();
    });
  });

  describe('visual feedback', () => {
    it('highlights key on press', () => {
      render(<StatusBar shortcuts={shortcuts} />);
      const keyElement = screen.getByText('F1').closest('button');
      fireEvent.keyDown(window, { key: 'F1' });
      expect(keyElement).toHaveAttribute('data-active', 'true');
    });

    it('removes highlight on key release', () => {
      render(<StatusBar shortcuts={shortcuts} />);
      const keyElement = screen.getByText('F1').closest('button');
      fireEvent.keyDown(window, { key: 'F1' });
      fireEvent.keyUp(window, { key: 'F1' });
      expect(keyElement).toHaveAttribute('data-active', 'false');
    });
  });

  describe('positioning', () => {
    it('applies fixed positioning by default', () => {
      render(<StatusBar shortcuts={shortcuts} />);
      const bar = screen.getByTestId('status-bar');
      expect(bar).toHaveClass('fixed');
    });

    it('applies relative positioning when fixed is false', () => {
      render(<StatusBar shortcuts={shortcuts} fixed={false} />);
      const bar = screen.getByTestId('status-bar');
      expect(bar).not.toHaveClass('fixed');
    });
  });

  describe('disabled state', () => {
    it('disables keyboard shortcuts when disabled', () => {
      render(<StatusBar shortcuts={shortcuts} disabled />);
      fireEvent.keyDown(window, { key: 'F1' });
      expect(shortcuts[0].action).not.toHaveBeenCalled();
    });

    it('applies disabled styling', () => {
      render(<StatusBar shortcuts={shortcuts} disabled />);
      const bar = screen.getByTestId('status-bar');
      expect(bar).toHaveClass('opacity-50');
    });
  });

  describe('cleanup', () => {
    it('removes event listeners on unmount', () => {
      const { unmount } = render(<StatusBar shortcuts={shortcuts} />);
      unmount();
      fireEvent.keyDown(window, { key: 'F1' });
      expect(shortcuts[0].action).not.toHaveBeenCalled();
    });
  });
});
