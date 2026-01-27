import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CorrelationWarning, type CorrelationWarningProps } from './correlation-warning';

describe('CorrelationWarning', () => {
  const defaultProps: CorrelationWarningProps = {
    correlatedPositions: [
      { id: '1', marketQuestion: 'Trump wins 2028', outcome: 'YES', exposure: 452 },
      { id: '2', marketQuestion: 'Republicans win Senate', outcome: 'YES', exposure: 380 },
      { id: '3', marketQuestion: 'GOP wins House', outcome: 'YES', exposure: 290 },
    ],
    totalExposure: 1122,
    portfolioPercent: 9,
    onDismiss: vi.fn(),
    onViewAnalysis: vi.fn(),
  };

  describe('rendering', () => {
    it('renders warning box', () => {
      render(<CorrelationWarning {...defaultProps} />);
      expect(screen.getByTestId('correlation-warning')).toBeInTheDocument();
    });

    it('displays warning icon and title', () => {
      render(<CorrelationWarning {...defaultProps} />);
      expect(screen.getByText('⚠')).toBeInTheDocument();
      expect(screen.getByText(/CORRELATION WARNING/)).toBeInTheDocument();
    });

    it('displays warning message', () => {
      render(<CorrelationWarning {...defaultProps} />);
      expect(screen.getByText(/High exposure to correlated markets detected/)).toBeInTheDocument();
    });
  });

  describe('correlated positions list', () => {
    it('displays all correlated positions', () => {
      render(<CorrelationWarning {...defaultProps} />);
      expect(screen.getByText(/Trump wins 2028/)).toBeInTheDocument();
      expect(screen.getByText(/Republicans win Senate/)).toBeInTheDocument();
      expect(screen.getByText(/GOP wins House/)).toBeInTheDocument();
    });

    it('displays position outcomes', () => {
      render(<CorrelationWarning {...defaultProps} />);
      const yesLabels = screen.getAllByText('(YES)');
      expect(yesLabels.length).toBe(3);
    });

    it('displays exposure amounts', () => {
      render(<CorrelationWarning {...defaultProps} />);
      expect(screen.getByText(/\$452/)).toBeInTheDocument();
      expect(screen.getByText(/\$380/)).toBeInTheDocument();
      expect(screen.getByText(/\$290/)).toBeInTheDocument();
    });

    it('uses bullet points for list items', () => {
      render(<CorrelationWarning {...defaultProps} />);
      const bullets = screen.getAllByText('•');
      expect(bullets.length).toBe(3);
    });
  });

  describe('combined exposure', () => {
    it('displays total combined exposure', () => {
      render(<CorrelationWarning {...defaultProps} />);
      expect(screen.getByText(/Combined exposure:/)).toBeInTheDocument();
      expect(screen.getByText(/\$1,122/)).toBeInTheDocument();
    });

    it('displays portfolio percentage', () => {
      render(<CorrelationWarning {...defaultProps} />);
      expect(screen.getByText(/9% of portfolio/)).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('has view analysis button', () => {
      render(<CorrelationWarning {...defaultProps} />);
      expect(screen.getByText(/View Correlation Analysis/)).toBeInTheDocument();
    });

    it('has dismiss button', () => {
      render(<CorrelationWarning {...defaultProps} />);
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });

    it('calls onViewAnalysis when analysis button clicked', () => {
      const onViewAnalysis = vi.fn();
      render(<CorrelationWarning {...defaultProps} onViewAnalysis={onViewAnalysis} />);
      fireEvent.click(screen.getByText(/View Correlation Analysis/));
      expect(onViewAnalysis).toHaveBeenCalled();
    });

    it('calls onDismiss when dismiss button clicked', () => {
      const onDismiss = vi.fn();
      render(<CorrelationWarning {...defaultProps} onDismiss={onDismiss} />);
      fireEvent.click(screen.getByText('Dismiss'));
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('styling', () => {
    it('uses warning/amber border color', () => {
      render(<CorrelationWarning {...defaultProps} />);
      const warning = screen.getByTestId('correlation-warning');
      expect(warning).toHaveClass('border-[hsl(var(--warning))]');
    });

    it('applies terminal aesthetic', () => {
      render(<CorrelationWarning {...defaultProps} />);
      const warning = screen.getByTestId('correlation-warning');
      expect(warning).toHaveClass('border');
    });

    it('applies custom className', () => {
      render(<CorrelationWarning {...defaultProps} className="custom-class" />);
      const warning = screen.getByTestId('correlation-warning');
      expect(warning).toHaveClass('custom-class');
    });
  });

  describe('visibility', () => {
    it('does not render when no positions', () => {
      const { container } = render(
        <CorrelationWarning {...defaultProps} correlatedPositions={[]} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders with single position', () => {
      render(
        <CorrelationWarning
          {...defaultProps}
          correlatedPositions={[defaultProps.correlatedPositions[0]!]}
          totalExposure={452}
        />
      );
      expect(screen.getByTestId('correlation-warning')).toBeInTheDocument();
    });
  });
});
