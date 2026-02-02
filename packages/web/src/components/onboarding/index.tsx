'use client';

import { useState, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface OnboardingStep {
  id: string;
  title: string;
  completed: boolean;
}

export interface PrivacyPreferences {
  publicProfile: boolean;
  showForecasts: boolean;
  showStats: boolean;
  showAchievements: boolean;
  allowDataExport: boolean;
  attestationMode: 'on-chain' | 'off-chain' | 'private';
}

export interface PlatformPreferences {
  defaultPlatform: 'polymarket' | 'limitless' | 'all';
  showTutorials: boolean;
  emailNotifications: boolean;
  darkMode: boolean;
  terminalTheme: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface OnboardingState {
  currentStep: number;
  steps: OnboardingStep[];
  isComplete: boolean;
  privacyPreferences: PrivacyPreferences;
  platformPreferences: PlatformPreferences;
}

// =============================================================================
// Default Values
// =============================================================================

const defaultSteps: OnboardingStep[] = [
  { id: 'welcome', title: 'Welcome', completed: false },
  { id: 'wallet', title: 'Connect Wallet', completed: false },
  { id: 'privacy', title: 'Privacy Settings', completed: false },
  { id: 'preferences', title: 'Preferences', completed: false },
  { id: 'complete', title: 'Ready', completed: false },
];

const defaultPrivacyPreferences: PrivacyPreferences = {
  publicProfile: true,
  showForecasts: true,
  showStats: true,
  showAchievements: true,
  allowDataExport: true,
  attestationMode: 'on-chain',
};

const defaultPlatformPreferences: PlatformPreferences = {
  defaultPlatform: 'polymarket',
  showTutorials: true,
  emailNotifications: false,
  darkMode: true,
  terminalTheme: true,
  autoRefresh: true,
  refreshInterval: 30,
};

// =============================================================================
// OnboardingProgress Component
// =============================================================================

interface OnboardingProgressProps {
  steps: OnboardingStep[];
  currentStep: number;
  showNumbers?: boolean;
  showPercentage?: boolean;
}

export function OnboardingProgress({
  steps,
  currentStep,
  showNumbers = false,
  showPercentage = false,
}: OnboardingProgressProps) {
  const completedCount = steps.filter((s) => s.completed).length;
  const percentage = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="font-mono" data-testid="onboarding-progress">
      {showPercentage && (
        <div className="text-[var(--terminal-green)] text-sm mb-2">{percentage}% complete</div>
      )}
      <div className="flex items-center gap-2">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            data-testid={`progress-step-${idx}`}
            className={`flex items-center gap-1 px-2 py-1 text-xs border transition-colors ${
              idx === currentStep
                ? 'border-[var(--terminal-green)] text-[var(--terminal-green)] current'
                : step.completed
                ? 'border-[var(--terminal-green)] bg-[var(--terminal-green)] text-black completed'
                : 'border-[var(--terminal-dim)] text-[var(--terminal-dim)]'
            }`}
            data-testid-extra="progress-step"
          >
            {showNumbers && <span>{idx + 1}.</span>}
            <span>{step.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// OnboardingWelcome Component
// =============================================================================

interface OnboardingWelcomeProps {
  onNext: () => void;
}

export function OnboardingWelcome({ onNext }: OnboardingWelcomeProps) {
  return (
    <div className="border border-[var(--terminal-green)] p-6 font-mono">
      <div data-testid="terminal-header" className="text-[var(--terminal-dim)] text-xs mb-4">
        ┌──────────────────────────────────────────────────────────────┐
      </div>

      <h1 className="text-[var(--terminal-green)] text-2xl mb-4">
        Welcome to CALIBR
      </h1>

      <p className="text-[var(--terminal-green)] mb-6 opacity-80">
        Your prediction market portfolio manager and forecasting journal.
      </p>

      <div className="space-y-3 mb-6 text-sm">
        <div className="flex items-center gap-2 text-[var(--terminal-green)]">
          <span>📊</span>
          <span>Track your portfolio across Polymarket and Limitless</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--terminal-green)]">
          <span>🎯</span>
          <span>Forecast with confidence using Kelly Criterion</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--terminal-green)]">
          <span>📈</span>
          <span>Measure your calibration and improve over time</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--terminal-green)]">
          <span>🏆</span>
          <span>Earn attestations and climb the leaderboard</span>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black transition-colors"
      >
        Get Started →
      </button>
    </div>
  );
}

// =============================================================================
// OnboardingConnectWallet Component
// =============================================================================

interface OnboardingConnectWalletProps {
  onNext: () => void;
  onBack: () => void;
  isConnected?: boolean;
  address?: string;
  onConnect?: () => void;
}

export function OnboardingConnectWallet({
  onNext,
  onBack,
  isConnected = false,
  address,
  onConnect,
}: OnboardingConnectWalletProps) {
  return (
    <div className="border border-[var(--terminal-green)] p-6 font-mono">
      <h2 className="text-[var(--terminal-green)] text-xl mb-4">Connect Your Wallet</h2>

      <p className="text-[var(--terminal-green)] mb-4 opacity-80 text-sm">
        Your wallet is used for on-chain attestation of your forecasts and achievements.
        This creates a verifiable record of your predictions.
      </p>

      {isConnected ? (
        <div className="mb-6 p-4 border border-[var(--terminal-green)] bg-[var(--terminal-green)] bg-opacity-10">
          <div className="text-[var(--terminal-green)] text-sm">✓ Wallet Connected</div>
          <div className="text-[var(--terminal-green)] text-xs mt-1 font-mono">{address}</div>
        </div>
      ) : (
        <button
          onClick={onConnect}
          className="w-full py-3 mb-6 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black transition-colors"
        >
          Connect Wallet
        </button>
      )}

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!isConnected}
          className={`flex-1 py-2 border border-[var(--terminal-green)] transition-colors ${
            isConnected
              ? 'text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black'
              : 'text-[var(--terminal-dim)] cursor-not-allowed'
          }`}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// OnboardingPrivacySettings Component
// =============================================================================

interface OnboardingPrivacySettingsProps {
  preferences: PrivacyPreferences;
  onChange: (preferences: PrivacyPreferences) => void;
  onNext: () => void;
  onBack: () => void;
}

export function OnboardingPrivacySettings({
  preferences,
  onChange,
  onNext,
  onBack,
}: OnboardingPrivacySettingsProps) {
  const attestationModes = [
    { value: 'on-chain', label: 'On-Chain', description: 'Public, verifiable on blockchain' },
    { value: 'off-chain', label: 'Off-Chain', description: 'Stored privately on IPFS' },
    { value: 'private', label: 'Private', description: 'Merkle tree for selective disclosure' },
  ];

  return (
    <div className="border border-[var(--terminal-green)] p-6 font-mono">
      <h2 className="text-[var(--terminal-green)] text-xl mb-4">Privacy Settings</h2>

      <div data-testid="privacy-explanation" className="text-[var(--terminal-dim)] text-xs mb-4">
        Control how your data is stored and shared. You can change these later.
      </div>

      <div className="space-y-4 mb-6">
        {/* Profile Privacy */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.publicProfile}
            onChange={(e) => onChange({ ...preferences, publicProfile: e.target.checked })}
            className="w-4 h-4 accent-[var(--terminal-green)]"
          />
          <span className="text-[var(--terminal-green)] text-sm">Public Profile</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.showForecasts}
            onChange={(e) => onChange({ ...preferences, showForecasts: e.target.checked })}
            className="w-4 h-4 accent-[var(--terminal-green)]"
          />
          <span className="text-[var(--terminal-green)] text-sm">Show Forecasts</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.showStats}
            onChange={(e) => onChange({ ...preferences, showStats: e.target.checked })}
            className="w-4 h-4 accent-[var(--terminal-green)]"
          />
          <span className="text-[var(--terminal-green)] text-sm">Show Statistics</span>
        </label>

        {/* Attestation Mode */}
        <div className="pt-4 border-t border-[var(--terminal-green)] border-opacity-30">
          <div className="text-[var(--terminal-dim)] text-xs mb-2">Attestation Mode</div>
          <div className="space-y-2">
            {attestationModes.map((mode) => (
              <label
                key={mode.value}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="attestationMode"
                  value={mode.value}
                  checked={preferences.attestationMode === mode.value}
                  onChange={() => onChange({ ...preferences, attestationMode: mode.value as PrivacyPreferences['attestationMode'] })}
                  className="w-4 h-4 accent-[var(--terminal-green)]"
                />
                <div>
                  <span className="text-[var(--terminal-green)] text-sm">{mode.label}</span>
                  <span className="text-[var(--terminal-dim)] text-xs ml-2">{mode.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// OnboardingPreferences Component
// =============================================================================

interface OnboardingPreferencesProps {
  preferences: PlatformPreferences;
  onChange: (preferences: PlatformPreferences) => void;
  onNext: () => void;
  onBack: () => void;
}

export function OnboardingPreferences({
  preferences,
  onChange,
  onNext,
  onBack,
}: OnboardingPreferencesProps) {
  const platforms = [
    { value: 'polymarket', label: 'Polymarket' },
    { value: 'limitless', label: 'Limitless' },
    { value: 'all', label: 'All Platforms' },
  ];

  const refreshIntervals = [15, 30, 60, 120];

  return (
    <div className="border border-[var(--terminal-green)] p-6 font-mono">
      <h2 className="text-[var(--terminal-green)] text-xl mb-4">Preferences</h2>

      <div className="space-y-4 mb-6">
        {/* Default Platform */}
        <div>
          <div className="text-[var(--terminal-dim)] text-xs mb-2">Default Platform</div>
          <div className="flex gap-2">
            {platforms.map((platform) => (
              <button
                key={platform.value}
                onClick={() => onChange({ ...preferences, defaultPlatform: platform.value as PlatformPreferences['defaultPlatform'] })}
                className={`px-3 py-1 border text-xs transition-colors ${
                  preferences.defaultPlatform === platform.value
                    ? 'border-[var(--terminal-green)] bg-[var(--terminal-green)] text-black'
                    : 'border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20'
                }`}
              >
                {platform.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.showTutorials}
            onChange={(e) => onChange({ ...preferences, showTutorials: e.target.checked })}
            className="w-4 h-4 accent-[var(--terminal-green)]"
          />
          <span className="text-[var(--terminal-green)] text-sm">Show Tutorials</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.terminalTheme}
            onChange={(e) => onChange({ ...preferences, terminalTheme: e.target.checked })}
            className="w-4 h-4 accent-[var(--terminal-green)]"
          />
          <span className="text-[var(--terminal-green)] text-sm">Terminal Theme</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.autoRefresh}
            onChange={(e) => onChange({ ...preferences, autoRefresh: e.target.checked })}
            className="w-4 h-4 accent-[var(--terminal-green)]"
          />
          <span className="text-[var(--terminal-green)] text-sm">Auto-Refresh Data</span>
        </label>

        {/* Refresh Interval */}
        {preferences.autoRefresh && (
          <div>
            <label className="text-[var(--terminal-dim)] text-xs mb-2 block">Refresh Interval</label>
            <select
              value={preferences.refreshInterval}
              onChange={(e) => onChange({ ...preferences, refreshInterval: Number(e.target.value) })}
              className="bg-black border border-[var(--terminal-green)] text-[var(--terminal-green)] px-2 py-1 text-sm"
            >
              {refreshIntervals.map((interval) => (
                <option key={interval} value={interval}>
                  {interval} seconds
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// OnboardingComplete Component
// =============================================================================

interface OnboardingCompleteProps {
  onFinish: () => void;
  onBack?: () => void;
  privacyPreferences?: PrivacyPreferences;
  platformPreferences?: PlatformPreferences;
}

export function OnboardingComplete({
  onFinish,
  onBack,
  privacyPreferences,
  platformPreferences,
}: OnboardingCompleteProps) {
  return (
    <div className="border border-[var(--terminal-green)] p-6 font-mono">
      <div data-testid="success-indicator" className="text-4xl text-center mb-4">
        ✓
      </div>

      <h2 className="text-[var(--terminal-green)] text-xl text-center mb-4">
        You&apos;re Ready!
      </h2>

      <p className="text-[var(--terminal-green)] text-sm text-center mb-6 opacity-80">
        Your account is set up and ready to start forecasting.
      </p>

      {(privacyPreferences || platformPreferences) && (
        <div data-testid="settings-summary" className="mb-6 p-4 border border-[var(--terminal-green)] border-opacity-30 text-xs">
          <div className="text-[var(--terminal-dim)] mb-2">Your Settings</div>
          {privacyPreferences && (
            <div className="text-[var(--terminal-green)]">
              Profile: {privacyPreferences.publicProfile ? 'Public' : 'Private'} |
              Attestation: {privacyPreferences.attestationMode}
            </div>
          )}
          {platformPreferences && (
            <div className="text-[var(--terminal-green)]">
              Platform: {platformPreferences.defaultPlatform} |
              Theme: {platformPreferences.terminalTheme ? 'Terminal' : 'Standard'}
            </div>
          )}
        </div>
      )}

      <div className="mb-6 p-4 bg-[var(--terminal-green)] bg-opacity-10 border border-[var(--terminal-green)] border-opacity-30 text-xs">
        <div className="text-[var(--terminal-green)] font-bold mb-1">💡 Quick Tip</div>
        <div className="text-[var(--terminal-green)] opacity-80">
          Start by exploring the markets page and making your first forecast!
        </div>
      </div>

      <div className="flex gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="flex-1 py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20 transition-colors"
          >
            ← Back
          </button>
        )}
        <button
          onClick={onFinish}
          className="flex-1 py-3 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black transition-colors"
        >
          Start Forecasting →
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// OnboardingFlow Component
// =============================================================================

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip?: () => void;
  initialStep?: number;
}

export function OnboardingFlow({ onComplete, onSkip, initialStep = 0 }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [steps, setSteps] = useState<OnboardingStep[]>(defaultSteps);
  const [privacyPreferences, setPrivacyPreferences] = useState<PrivacyPreferences>(defaultPrivacyPreferences);
  const [platformPreferences, setPlatformPreferences] = useState<PlatformPreferences>(defaultPlatformPreferences);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | undefined>();

  const nextStep = useCallback(() => {
    setSteps((prev) =>
      prev.map((s, idx) => (idx === currentStep ? { ...s, completed: true } : s))
    );
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, [currentStep, steps.length]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleConnect = useCallback(() => {
    // Simulate wallet connection
    setIsWalletConnected(true);
    setWalletAddress('0x1234...5678');
  }, []);

  const handleComplete = useCallback(() => {
    setSteps((prev) => prev.map((s) => ({ ...s, completed: true })));
    onComplete();
  }, [onComplete]);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <OnboardingWelcome onNext={nextStep} />;
      case 1:
        return (
          <OnboardingConnectWallet
            onNext={nextStep}
            onBack={prevStep}
            isConnected={isWalletConnected}
            address={walletAddress}
            onConnect={handleConnect}
          />
        );
      case 2:
        return (
          <OnboardingPrivacySettings
            preferences={privacyPreferences}
            onChange={setPrivacyPreferences}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <OnboardingPreferences
            preferences={platformPreferences}
            onChange={setPlatformPreferences}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
        return (
          <OnboardingComplete
            onFinish={handleComplete}
            onBack={prevStep}
            privacyPreferences={privacyPreferences}
            platformPreferences={platformPreferences}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4" data-testid="onboarding-flow">
      <OnboardingProgress steps={steps} currentStep={currentStep} />

      <div className="mt-6">{renderStep()}</div>

      {onSkip && currentStep < steps.length - 1 && (
        <button
          onClick={onSkip}
          className="w-full mt-4 py-2 text-[var(--terminal-dim)] text-sm hover:text-[var(--terminal-green)] transition-colors"
        >
          Skip onboarding
        </button>
      )}
    </div>
  );
}

// =============================================================================
// useOnboarding Hook
// =============================================================================

interface UseOnboardingReturn {
  currentStep: number;
  steps: OnboardingStep[];
  isComplete: boolean;
  privacyPreferences: PrivacyPreferences;
  platformPreferences: PlatformPreferences;
  setPrivacyPreferences: (prefs: PrivacyPreferences) => void;
  setPlatformPreferences: (prefs: PlatformPreferences) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
}

export function useOnboarding(): UseOnboardingReturn {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>(defaultSteps);
  const [isComplete, setIsComplete] = useState(false);
  const [privacyPreferences, setPrivacyPreferences] = useState<PrivacyPreferences>(defaultPrivacyPreferences);
  const [platformPreferences, setPlatformPreferences] = useState<PlatformPreferences>(defaultPlatformPreferences);

  const nextStep = useCallback(() => {
    setSteps((prev) =>
      prev.map((s, idx) => (idx === currentStep ? { ...s, completed: true } : s))
    );
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, [currentStep, steps.length]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const skipOnboarding = useCallback(() => {
    setIsComplete(true);
  }, []);

  const completeOnboarding = useCallback(() => {
    setSteps((prev) => prev.map((s) => ({ ...s, completed: true })));
    setIsComplete(true);
  }, []);

  return {
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
  };
}
