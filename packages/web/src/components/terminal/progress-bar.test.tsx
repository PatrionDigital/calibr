import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './progress-bar';

describe('ProgressBar', () => {
  describe('rendering', () => {
    it('renders progress bar', () => {
      render(<ProgressBar value={50} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('sets correct aria-valuenow', () => {
      render(<ProgressBar value={50} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    });

    it('sets correct aria-valuemin', () => {
      render(<ProgressBar value={50} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemin', '0');
    });

    it('sets correct aria-valuemax', () => {
      render(<ProgressBar value={50} max={100} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('percentage display', () => {
    it('shows percentage when showPercent is true', () => {
      render(<ProgressBar value={50} showPercent />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('hides percentage when showPercent is false', () => {
      render(<ProgressBar value={50} showPercent={false} />);
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('calculates percentage correctly with custom max', () => {
      render(<ProgressBar value={25} max={50} showPercent />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('label', () => {
    it('displays label when provided', () => {
      render(<ProgressBar value={50} label="Loading..." />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('hides label when not provided', () => {
      render(<ProgressBar value={50} />);
      expect(screen.queryByTestId('progress-label')).not.toBeInTheDocument();
    });
  });

  describe('styles', () => {
    it('renders blocks style by default', () => {
      render(<ProgressBar value={50} variant="blocks" />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('data-variant', 'blocks');
    });

    it('renders ascii style', () => {
      render(<ProgressBar value={50} variant="ascii" />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('data-variant', 'ascii');
    });

    it('renders dots style', () => {
      render(<ProgressBar value={50} variant="dots" />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('data-variant', 'dots');
    });
  });

  describe('fill calculation', () => {
    it('fills 0% when value is 0', () => {
      render(<ProgressBar value={0} />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveStyle({ width: '0%' });
    });

    it('fills 50% when value is half of max', () => {
      render(<ProgressBar value={50} max={100} />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveStyle({ width: '50%' });
    });

    it('fills 100% when value equals max', () => {
      render(<ProgressBar value={100} max={100} />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveStyle({ width: '100%' });
    });

    it('clamps to 100% when value exceeds max', () => {
      render(<ProgressBar value={150} max={100} />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveStyle({ width: '100%' });
    });
  });

  describe('size variants', () => {
    it('supports sm size', () => {
      render(<ProgressBar value={50} size="sm" />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('data-size', 'sm');
    });

    it('supports md size', () => {
      render(<ProgressBar value={50} size="md" />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('data-size', 'md');
    });

    it('supports lg size', () => {
      render(<ProgressBar value={50} size="lg" />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('data-size', 'lg');
    });
  });

  describe('animation', () => {
    it('applies animation class when animated', () => {
      render(<ProgressBar value={50} animated />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveClass('transition-all');
    });

    it('respects reduced motion preference', () => {
      render(<ProgressBar value={50} animated />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveClass('motion-reduce:transition-none');
    });
  });

  describe('colors', () => {
    it('uses primary color by default', () => {
      render(<ProgressBar value={50} />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveClass('bg-[hsl(var(--primary))]');
    });

    it('supports success color', () => {
      render(<ProgressBar value={50} color="success" />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveClass('bg-[hsl(var(--success))]');
    });

    it('supports warning color', () => {
      render(<ProgressBar value={50} color="warning" />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveClass('bg-[hsl(var(--warning))]');
    });

    it('supports error color', () => {
      render(<ProgressBar value={50} color="error" />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveClass('bg-[hsl(var(--destructive))]');
    });
  });
});
