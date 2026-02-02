/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type {
  OnboardingStep,
  OnboardingState,
  PrivacyPreferences,
  PlatformPreferences,
} from '../../src/components/onboarding';
import {
  OnboardingProgress,
  OnboardingWelcome,
  OnboardingConnectWallet,
  OnboardingPrivacySettings,
  OnboardingPreferences,
  OnboardingComplete,
  OnboardingFlow,
  useOnboarding,
} from '../../src/components/onboarding';

// =============================================================================
// Test Data
// =============================================================================

const mockSteps: OnboardingStep[] = [
  { id: 'welcome', title: 'Welcome', completed: true },
  { id: 'wallet', title: 'Connect Wallet', completed: true },
  { id: 'privacy', title: 'Privacy Settings', completed: false },
  { id: 'preferences', title: 'Preferences', completed: false },
  { id: 'complete', title: 'Ready', completed: false },
];

const mockPrivacyPreferences: PrivacyPreferences = {
  publicProfile: true,
  showForecasts: true,
  showStats: true,
  showAchievements: true,
  allowDataExport: true,
  attestationMode: 'on-chain',
};

const mockPlatformPreferences: PlatformPreferences = {
  defaultPlatform: 'polymarket',
  showTutorials: true,
  emailNotifications: false,
  darkMode: true,
  terminalTheme: true,
  autoRefresh: true,
  refreshInterval: 30,
};

// =============================================================================
// OnboardingProgress Tests
// =============================================================================

describe('OnboardingProgress', () => {
  it('renders all steps', () => {
    render(<OnboardingProgress steps={mockSteps} currentStep={2} />);
    // Each step has data-testid="progress-step-{idx}"
    const steps = document.querySelectorAll('[data-testid^="progress-step-"]');
    expect(steps.length).toBe(5);
  });

  it('shows step titles', () => {
    render(<OnboardingProgress steps={mockSteps} currentStep={2} />);
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
  });

  it('highlights current step', () => {
    render(<OnboardingProgress steps={mockSteps} currentStep={2} />);
    const currentStep = screen.getByTestId('progress-step-2');
    expect(currentStep).toHaveClass('current');
  });

  it('shows completed steps', () => {
    render(<OnboardingProgress steps={mockSteps} currentStep={2} />);
    const completedStep = screen.getByTestId('progress-step-0');
    expect(completedStep).toHaveClass('completed');
  });

  it('shows step numbers', () => {
    render(<OnboardingProgress steps={mockSteps} currentStep={2} showNumbers={true} />);
    // Numbers are rendered with periods like "1.", "2."
    expect(screen.getByText(/^1\./)).toBeInTheDocument();
    expect(screen.getByText(/^2\./)).toBeInTheDocument();
  });

  it('displays progress percentage', () => {
    render(<OnboardingProgress steps={mockSteps} currentStep={2} showPercentage={true} />);
    expect(screen.getByText(/40%/)).toBeInTheDocument();
  });
});

// =============================================================================
// OnboardingWelcome Tests
// =============================================================================

describe('OnboardingWelcome', () => {
  it('renders welcome message', () => {
    render(<OnboardingWelcome onNext={() => {}} />);
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });

  it('displays app name', () => {
    render(<OnboardingWelcome onNext={() => {}} />);
    // "CALIBR" appears in heading, "calibration" in features
    expect(screen.getAllByText(/calibr/i).length).toBeGreaterThan(0);
  });

  it('shows key features', () => {
    render(<OnboardingWelcome onNext={() => {}} />);
    // "portfolio" and "forecast" appear in multiple places
    expect(screen.getAllByText(/portfolio/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/forecast/i).length).toBeGreaterThan(0);
  });

  it('has get started button', () => {
    render(<OnboardingWelcome onNext={() => {}} />);
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });

  it('calls onNext when get started clicked', () => {
    const onNext = vi.fn();
    render(<OnboardingWelcome onNext={onNext} />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(onNext).toHaveBeenCalled();
  });

  it('shows terminal-style decoration', () => {
    render(<OnboardingWelcome onNext={() => {}} />);
    expect(screen.getByTestId('terminal-header')).toBeInTheDocument();
  });
});

// =============================================================================
// OnboardingConnectWallet Tests
// =============================================================================

describe('OnboardingConnectWallet', () => {
  it('renders wallet connection prompt', () => {
    render(<OnboardingConnectWallet onNext={() => {}} onBack={() => {}} />);
    // "Connect Wallet" appears in heading and button
    expect(screen.getAllByText(/connect.*wallet/i).length).toBeGreaterThan(0);
  });

  it('shows connect wallet button', () => {
    render(<OnboardingConnectWallet onNext={() => {}} onBack={() => {}} />);
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('shows back button', () => {
    render(<OnboardingConnectWallet onNext={() => {}} onBack={() => {}} />);
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('calls onBack when back clicked', () => {
    const onBack = vi.fn();
    render(<OnboardingConnectWallet onNext={() => {}} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows connected state when wallet connected', () => {
    render(
      <OnboardingConnectWallet
        onNext={() => {}}
        onBack={() => {}}
        isConnected={true}
        address="0x1234...5678"
      />
    );
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
    expect(screen.getByText(/0x1234/)).toBeInTheDocument();
  });

  it('enables next when wallet connected', () => {
    render(
      <OnboardingConnectWallet
        onNext={() => {}}
        onBack={() => {}}
        isConnected={true}
        address="0x1234...5678"
      />
    );
    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled();
  });

  it('explains why wallet is needed', () => {
    render(<OnboardingConnectWallet onNext={() => {}} onBack={() => {}} />);
    expect(screen.getByText(/attestation/i)).toBeInTheDocument();
  });
});

// =============================================================================
// OnboardingPrivacySettings Tests
// =============================================================================

describe('OnboardingPrivacySettings', () => {
  it('renders privacy settings form', () => {
    render(
      <OnboardingPrivacySettings
        preferences={mockPrivacyPreferences}
        onChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getByText(/privacy/i)).toBeInTheDocument();
  });

  it('shows public profile toggle', () => {
    render(
      <OnboardingPrivacySettings
        preferences={mockPrivacyPreferences}
        onChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getByLabelText(/public profile/i)).toBeInTheDocument();
  });

  it('shows attestation mode selector', () => {
    render(
      <OnboardingPrivacySettings
        preferences={mockPrivacyPreferences}
        onChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getByText(/on-chain/i)).toBeInTheDocument();
    expect(screen.getByText(/off-chain/i)).toBeInTheDocument();
  });

  it('calls onChange when toggle changed', () => {
    const onChange = vi.fn();
    render(
      <OnboardingPrivacySettings
        preferences={mockPrivacyPreferences}
        onChange={onChange}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    fireEvent.click(screen.getByLabelText(/public profile/i));
    expect(onChange).toHaveBeenCalled();
  });

  it('shows privacy explanations', () => {
    render(
      <OnboardingPrivacySettings
        preferences={mockPrivacyPreferences}
        onChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getByTestId('privacy-explanation')).toBeInTheDocument();
  });

  it('has navigation buttons', () => {
    render(
      <OnboardingPrivacySettings
        preferences={mockPrivacyPreferences}
        onChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });
});

// =============================================================================
// OnboardingPreferences Tests
// =============================================================================

describe('OnboardingPreferences', () => {
  it('renders preferences form', () => {
    render(
      <OnboardingPreferences
        preferences={mockPlatformPreferences}
        onChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getByText(/preferences/i)).toBeInTheDocument();
  });

  it('shows default platform selector', () => {
    render(
      <OnboardingPreferences
        preferences={mockPlatformPreferences}
        onChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getByText(/polymarket/i)).toBeInTheDocument();
  });

  it('shows tutorial toggle', () => {
    render(
      <OnboardingPreferences
        preferences={mockPlatformPreferences}
        onChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getByLabelText(/tutorial/i)).toBeInTheDocument();
  });

  it('shows theme options', () => {
    render(
      <OnboardingPreferences
        preferences={mockPlatformPreferences}
        onChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getByLabelText(/terminal theme/i)).toBeInTheDocument();
  });

  it('calls onChange when preference changed', () => {
    const onChange = vi.fn();
    render(
      <OnboardingPreferences
        preferences={mockPlatformPreferences}
        onChange={onChange}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    fireEvent.click(screen.getByLabelText(/tutorial/i));
    expect(onChange).toHaveBeenCalled();
  });

  it('shows refresh interval selector', () => {
    render(
      <OnboardingPreferences
        preferences={mockPlatformPreferences}
        onChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getByLabelText(/refresh/i)).toBeInTheDocument();
  });
});

// =============================================================================
// OnboardingComplete Tests
// =============================================================================

describe('OnboardingComplete', () => {
  it('renders completion message', () => {
    render(<OnboardingComplete onFinish={() => {}} />);
    // "ready" appears in heading and description
    expect(screen.getAllByText(/ready/i).length).toBeGreaterThan(0);
  });

  it('shows success indicator', () => {
    render(<OnboardingComplete onFinish={() => {}} />);
    expect(screen.getByTestId('success-indicator')).toBeInTheDocument();
  });

  it('displays summary of settings', () => {
    render(
      <OnboardingComplete
        onFinish={() => {}}
        privacyPreferences={mockPrivacyPreferences}
        platformPreferences={mockPlatformPreferences}
      />
    );
    expect(screen.getByTestId('settings-summary')).toBeInTheDocument();
  });

  it('has finish button', () => {
    render(<OnboardingComplete onFinish={() => {}} />);
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('calls onFinish when button clicked', () => {
    const onFinish = vi.fn();
    render(<OnboardingComplete onFinish={onFinish} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    expect(onFinish).toHaveBeenCalled();
  });

  it('shows quick tips', () => {
    render(<OnboardingComplete onFinish={() => {}} />);
    expect(screen.getByText(/tip/i)).toBeInTheDocument();
  });

  it('has back button to adjust settings', () => {
    const onBack = vi.fn();
    render(<OnboardingComplete onFinish={() => {}} onBack={onBack} />);
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });
});

// =============================================================================
// OnboardingFlow Tests
// =============================================================================

describe('OnboardingFlow', () => {
  it('renders onboarding flow', () => {
    render(<OnboardingFlow onComplete={() => {}} />);
    expect(screen.getByTestId('onboarding-flow')).toBeInTheDocument();
  });

  it('starts at welcome step', () => {
    render(<OnboardingFlow onComplete={() => {}} />);
    // "Welcome" appears in progress step and heading
    expect(screen.getAllByText(/welcome/i).length).toBeGreaterThan(0);
  });

  it('shows progress indicator', () => {
    render(<OnboardingFlow onComplete={() => {}} />);
    expect(screen.getByTestId('onboarding-progress')).toBeInTheDocument();
  });

  it('advances to next step when clicking next', async () => {
    render(<OnboardingFlow onComplete={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    await waitFor(() => {
      // "Connect Wallet" appears in heading and button
      expect(screen.getAllByText(/connect.*wallet/i).length).toBeGreaterThan(0);
    });
  });

  it('goes back when clicking back', async () => {
    render(<OnboardingFlow onComplete={() => {}} initialStep={1} />);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    await waitFor(() => {
      expect(screen.getByText(/welcome.*calibr/i)).toBeInTheDocument();
    });
  });

  it('calls onComplete when finishing', async () => {
    const onComplete = vi.fn();
    render(<OnboardingFlow onComplete={onComplete} initialStep={4} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('allows skipping onboarding', () => {
    const onSkip = vi.fn();
    render(<OnboardingFlow onComplete={() => {}} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(onSkip).toHaveBeenCalled();
  });

  it('persists progress between renders', () => {
    const { rerender } = render(<OnboardingFlow onComplete={() => {}} initialStep={2} />);
    rerender(<OnboardingFlow onComplete={() => {}} initialStep={2} />);
    expect(screen.getByTestId('progress-step-2')).toHaveClass('current');
  });
});

// =============================================================================
// useOnboarding Hook Tests
// =============================================================================

describe('useOnboarding', () => {
  function TestComponent() {
    const {
      currentStep,
      steps,
      isComplete,
      privacyPreferences,
      platformPreferences,
      setPrivacyPreferences,
      setPlatformPreferences,
      nextStep,
      prevStep,
      skipOnboarding,
      completeOnboarding,
    } = useOnboarding();

    return (
      <div>
        <span data-testid="current-step">{currentStep}</span>
        <span data-testid="is-complete">{isComplete ? 'complete' : 'incomplete'}</span>
        <span data-testid="steps-count">{steps.length}</span>
        <span data-testid="public-profile">{privacyPreferences.publicProfile ? 'public' : 'private'}</span>
        <span data-testid="default-platform">{platformPreferences.defaultPlatform}</span>
        <button onClick={nextStep}>Next</button>
        <button onClick={prevStep}>Back</button>
        <button onClick={skipOnboarding}>Skip</button>
        <button onClick={completeOnboarding}>Complete</button>
        <button onClick={() => setPrivacyPreferences({ ...privacyPreferences, publicProfile: false })}>
          Make Private
        </button>
        <button onClick={() => setPlatformPreferences({ ...platformPreferences, defaultPlatform: 'limitless' })}>
          Set Limitless
        </button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes at step 0', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('current-step')).toHaveTextContent('0');
  });

  it('has 5 steps', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('steps-count')).toHaveTextContent('5');
  });

  it('starts incomplete', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('is-complete')).toHaveTextContent('incomplete');
  });

  it('advances step on nextStep', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByTestId('current-step')).toHaveTextContent('1');
  });

  it('goes back on prevStep', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByTestId('current-step')).toHaveTextContent('0');
  });

  it('does not go below step 0', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByTestId('current-step')).toHaveTextContent('0');
  });

  it('marks complete on completeOnboarding', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Complete'));
    expect(screen.getByTestId('is-complete')).toHaveTextContent('complete');
  });

  it('marks complete on skipOnboarding', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Skip'));
    expect(screen.getByTestId('is-complete')).toHaveTextContent('complete');
  });

  it('allows updating privacy preferences', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Make Private'));
    expect(screen.getByTestId('public-profile')).toHaveTextContent('private');
  });

  it('allows updating platform preferences', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Set Limitless'));
    expect(screen.getByTestId('default-platform')).toHaveTextContent('limitless');
  });

  it('has default privacy preferences', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('public-profile')).toHaveTextContent('public');
  });

  it('has default platform preferences', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('default-platform')).toHaveTextContent('polymarket');
  });
});
