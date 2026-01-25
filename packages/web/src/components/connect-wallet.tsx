'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAppIdentity } from '@/hooks/useAppIdentity';
import { BASE_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from '@/types/identity';

/**
 * Tier badge colors for visual distinction
 */
const TIER_COLORS: Record<string, string> = {
  APPRENTICE: 'text-[hsl(var(--muted-foreground))]',
  JOURNEYMAN: 'text-blue-400',
  EXPERT: 'text-purple-400',
  MASTER: 'text-yellow-400',
  GRANDMASTER: 'text-[hsl(var(--primary))]',
};

/**
 * ConnectWallet - Wallet connection UI component with identity integration
 *
 * Features:
 * - RainbowKit wallet connection
 * - Chain switching for Base network
 * - Shows calibration tier badge when available
 * - Indicates Polymarket Safe status
 */
export function ConnectWallet() {
  const identity = useAppIdentity();

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        // Check if on supported network
        const isBaseNetwork =
          chain?.id === BASE_CHAIN_ID || chain?.id === BASE_SEPOLIA_CHAIN_ID;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="px-3 py-1.5 text-xs font-bold border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-black transition-colors"
                  >
                    [CONNECT WALLET]
                  </button>
                );
              }

              if (chain.unsupported || !isBaseNetwork) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="px-3 py-1.5 text-xs font-bold border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))] hover:text-black transition-colors"
                  >
                    [SWITCH TO BASE]
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  {/* Calibration Tier Badge */}
                  {identity.calibrationTier && (
                    <span
                      className={`px-2 py-1 text-xs border border-[hsl(var(--border))] ${TIER_COLORS[identity.calibrationTier] || ''}`}
                      title={`Superforecaster Tier: ${identity.calibrationTier}`}
                    >
                      {identity.calibrationTier.charAt(0)}
                    </span>
                  )}

                  {/* Polymarket Safe Indicator */}
                  {identity.polymarketSafeDeployed && (
                    <span
                      className="px-2 py-1 text-xs text-[hsl(var(--success))] border border-[hsl(var(--success))]"
                      title="Polymarket Safe Deployed"
                    >
                      PM
                    </span>
                  )}

                  {/* Chain Selector */}
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="px-2 py-1 text-xs border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] transition-colors"
                  >
                    {chain.name}
                  </button>

                  {/* Account Button */}
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="px-3 py-1.5 text-xs font-bold border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-black transition-colors"
                  >
                    {account.displayName}
                    {account.displayBalance ? ` (${account.displayBalance})` : ''}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
