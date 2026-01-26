import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepProgress, type PurchaseStep } from './step-progress';

describe('StepProgress', () => {
  const defaultSteps: PurchaseStep[] = [
    { id: 'swap', label: 'SWAP', status: 'pending' },
    { id: 'bridge', label: 'BRIDGE', status: 'pending' },
    { id: 'deposit', label: 'DEPOSIT', status: 'pending' },
    { id: 'trade', label: 'TRADE', status: 'pending' },
  ];

  describe('rendering', () => {
    it('renders all step labels', () => {
      render(<StepProgress steps={defaultSteps} currentStep="swap" />);

      expect(screen.getByText('SWAP')).toBeInTheDocument();
      expect(screen.getByText('BRIDGE')).toBeInTheDocument();
      expect(screen.getByText('DEPOSIT')).toBeInTheDocument();
      expect(screen.getByText('TRADE')).toBeInTheDocument();
    });

    it('renders step numbers', () => {
      render(<StepProgress steps={defaultSteps} currentStep="swap" />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('renders arrow separators between steps', () => {
      render(<StepProgress steps={defaultSteps} currentStep="swap" />);

      // Should have 3 arrows (between 4 steps)
      const arrows = screen.getAllByText('→');
      expect(arrows).toHaveLength(3);
    });
  });

  describe('current step highlighting', () => {
    it('highlights the current step', () => {
      render(<StepProgress steps={defaultSteps} currentStep="bridge" />);

      const bridgeStep = screen.getByTestId('step-bridge');
      expect(bridgeStep).toHaveClass('border-[hsl(var(--primary))]');
    });

    it('applies glow effect to current step', () => {
      render(<StepProgress steps={defaultSteps} currentStep="swap" />);

      const swapStep = screen.getByTestId('step-swap');
      expect(swapStep).toHaveClass('shadow-[0_0_10px_hsl(var(--primary))]');
    });
  });

  describe('completed steps', () => {
    it('shows checkmark for completed steps', () => {
      const steps: PurchaseStep[] = [
        { id: 'swap', label: 'SWAP', status: 'completed', txHash: '0x123' },
        { id: 'bridge', label: 'BRIDGE', status: 'active' },
        { id: 'deposit', label: 'DEPOSIT', status: 'pending' },
        { id: 'trade', label: 'TRADE', status: 'pending' },
      ];

      render(<StepProgress steps={steps} currentStep="bridge" />);

      expect(screen.getByTestId('step-swap-checkmark')).toBeInTheDocument();
    });

    it('applies success styling to completed steps', () => {
      const steps: PurchaseStep[] = [
        { id: 'swap', label: 'SWAP', status: 'completed', txHash: '0x123' },
        { id: 'bridge', label: 'BRIDGE', status: 'active' },
        { id: 'deposit', label: 'DEPOSIT', status: 'pending' },
        { id: 'trade', label: 'TRADE', status: 'pending' },
      ];

      render(<StepProgress steps={steps} currentStep="bridge" />);

      const swapStep = screen.getByTestId('step-swap');
      expect(swapStep).toHaveClass('border-[hsl(var(--success))]');
    });
  });

  describe('transaction links', () => {
    it('renders transaction hash link for completed steps', () => {
      const steps: PurchaseStep[] = [
        { id: 'swap', label: 'SWAP', status: 'completed', txHash: '0x1234567890abcdef', chain: 'base' },
        { id: 'bridge', label: 'BRIDGE', status: 'active' },
        { id: 'deposit', label: 'DEPOSIT', status: 'pending' },
        { id: 'trade', label: 'TRADE', status: 'pending' },
      ];

      render(<StepProgress steps={steps} currentStep="bridge" />);

      const txLink = screen.getByRole('link', { name: /0x1234/i });
      expect(txLink).toBeInTheDocument();
      expect(txLink).toHaveAttribute('href', expect.stringContaining('basescan.org'));
    });

    it('links to correct block explorer based on chain', () => {
      const steps: PurchaseStep[] = [
        { id: 'swap', label: 'SWAP', status: 'completed', txHash: '0xabc', chain: 'base' },
        { id: 'bridge', label: 'BRIDGE', status: 'completed', txHash: '0xdef', chain: 'polygon' },
        { id: 'deposit', label: 'DEPOSIT', status: 'active' },
        { id: 'trade', label: 'TRADE', status: 'pending' },
      ];

      render(<StepProgress steps={steps} currentStep="deposit" />);

      const baseLink = screen.getByRole('link', { name: /0xabc/i });
      const polygonLink = screen.getByRole('link', { name: /0xdef/i });

      expect(baseLink).toHaveAttribute('href', expect.stringContaining('basescan.org'));
      expect(polygonLink).toHaveAttribute('href', expect.stringContaining('polygonscan.com'));
    });
  });

  describe('error state', () => {
    it('shows error styling for failed steps', () => {
      const steps: PurchaseStep[] = [
        { id: 'swap', label: 'SWAP', status: 'completed', txHash: '0x123' },
        { id: 'bridge', label: 'BRIDGE', status: 'error', error: 'Bridge failed' },
        { id: 'deposit', label: 'DEPOSIT', status: 'pending' },
        { id: 'trade', label: 'TRADE', status: 'pending' },
      ];

      render(<StepProgress steps={steps} currentStep="bridge" />);

      const bridgeStep = screen.getByTestId('step-bridge');
      expect(bridgeStep).toHaveClass('border-[hsl(var(--destructive))]');
    });

    it('displays error message for failed step', () => {
      const steps: PurchaseStep[] = [
        { id: 'swap', label: 'SWAP', status: 'completed', txHash: '0x123' },
        { id: 'bridge', label: 'BRIDGE', status: 'error', error: 'Attestation timeout' },
        { id: 'deposit', label: 'DEPOSIT', status: 'pending' },
        { id: 'trade', label: 'TRADE', status: 'pending' },
      ];

      render(<StepProgress steps={steps} currentStep="bridge" />);

      expect(screen.getByText('Attestation timeout')).toBeInTheDocument();
    });
  });

  describe('time estimate', () => {
    it('displays estimated time remaining', () => {
      render(
        <StepProgress
          steps={defaultSteps}
          currentStep="bridge"
          estimatedTimeRemaining="~15 min"
        />
      );

      expect(screen.getByText(/~15 min/)).toBeInTheDocument();
    });

    it('shows time label with estimate', () => {
      render(
        <StepProgress
          steps={defaultSteps}
          currentStep="swap"
          estimatedTimeRemaining="~20 min"
        />
      );

      expect(screen.getByText('EST. TIME:')).toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('renders in compact mode when specified', () => {
      render(<StepProgress steps={defaultSteps} currentStep="swap" compact />);

      const container = screen.getByTestId('step-progress');
      expect(container).toHaveClass('gap-1');
    });

    it('hides descriptions in compact mode', () => {
      const steps: PurchaseStep[] = [
        { id: 'swap', label: 'SWAP', status: 'active', description: 'Swapping CALIBR to USDC' },
        { id: 'bridge', label: 'BRIDGE', status: 'pending' },
        { id: 'deposit', label: 'DEPOSIT', status: 'pending' },
        { id: 'trade', label: 'TRADE', status: 'pending' },
      ];

      render(<StepProgress steps={steps} currentStep="swap" compact />);

      expect(screen.queryByText('Swapping CALIBR to USDC')).not.toBeInTheDocument();
    });
  });

  describe('descriptions', () => {
    it('shows description for active step', () => {
      const steps: PurchaseStep[] = [
        { id: 'swap', label: 'SWAP', status: 'active', description: 'Swapping CALIBR to USDC via Aerodrome' },
        { id: 'bridge', label: 'BRIDGE', status: 'pending' },
        { id: 'deposit', label: 'DEPOSIT', status: 'pending' },
        { id: 'trade', label: 'TRADE', status: 'pending' },
      ];

      render(<StepProgress steps={steps} currentStep="swap" />);

      expect(screen.getByText('Swapping CALIBR to USDC via Aerodrome')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows spinner for active step', () => {
      const steps: PurchaseStep[] = [
        { id: 'swap', label: 'SWAP', status: 'active' },
        { id: 'bridge', label: 'BRIDGE', status: 'pending' },
        { id: 'deposit', label: 'DEPOSIT', status: 'pending' },
        { id: 'trade', label: 'TRADE', status: 'pending' },
      ];

      render(<StepProgress steps={steps} currentStep="swap" />);

      const spinnerContainer = screen.getByTestId('step-swap-spinner');
      expect(spinnerContainer).toBeInTheDocument();
      // The spinner SVG inside has animate-spin class
      const spinnerSvg = spinnerContainer.querySelector('svg');
      expect(spinnerSvg).toHaveClass('animate-spin');
    });
  });
});
