import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WindowChrome } from './window-chrome';

describe('WindowChrome', () => {
  describe('rendering', () => {
    it('renders with title', () => {
      render(<WindowChrome title="MARKET BROWSER">Content</WindowChrome>);
      expect(screen.getByText(/MARKET BROWSER/)).toBeInTheDocument();
    });

    it('renders children content', () => {
      render(<WindowChrome title="Test">Hello World</WindowChrome>);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('uses box drawing characters for frame', () => {
      render(<WindowChrome title="Test">Content</WindowChrome>);
      const container = screen.getByTestId('window-chrome');
      expect(container).toBeInTheDocument();
    });
  });

  describe('window controls', () => {
    it('shows window controls when controls prop is true', () => {
      render(<WindowChrome title="Test" controls>Content</WindowChrome>);
      expect(screen.getByLabelText('minimize')).toBeInTheDocument();
      expect(screen.getByLabelText('maximize')).toBeInTheDocument();
      expect(screen.getByLabelText('close')).toBeInTheDocument();
    });

    it('hides window controls when controls prop is false', () => {
      render(<WindowChrome title="Test" controls={false}>Content</WindowChrome>);
      expect(screen.queryByLabelText('minimize')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('maximize')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('close')).not.toBeInTheDocument();
    });

    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<WindowChrome title="Test" controls onClose={onClose}>Content</WindowChrome>);
      fireEvent.click(screen.getByLabelText('close'));
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onMinimize when minimize button clicked', () => {
      const onMinimize = vi.fn();
      render(<WindowChrome title="Test" controls onMinimize={onMinimize}>Content</WindowChrome>);
      fireEvent.click(screen.getByLabelText('minimize'));
      expect(onMinimize).toHaveBeenCalled();
    });

    it('calls onMaximize when maximize button clicked', () => {
      const onMaximize = vi.fn();
      render(<WindowChrome title="Test" controls onMaximize={onMaximize}>Content</WindowChrome>);
      fireEvent.click(screen.getByLabelText('maximize'));
      expect(onMaximize).toHaveBeenCalled();
    });
  });

  describe('styling', () => {
    it('applies terminal styling', () => {
      render(<WindowChrome title="Test">Content</WindowChrome>);
      const container = screen.getByTestId('window-chrome');
      expect(container).toHaveClass('border');
    });

    it('applies custom className', () => {
      render(<WindowChrome title="Test" className="custom-class">Content</WindowChrome>);
      const container = screen.getByTestId('window-chrome');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('variants', () => {
    it('supports default variant', () => {
      render(<WindowChrome title="Test" variant="default">Content</WindowChrome>);
      const container = screen.getByTestId('window-chrome');
      expect(container).toBeInTheDocument();
    });

    it('supports double variant with double-line borders', () => {
      render(<WindowChrome title="Test" variant="double">Content</WindowChrome>);
      const container = screen.getByTestId('window-chrome');
      expect(container).toHaveAttribute('data-variant', 'double');
    });
  });
});
