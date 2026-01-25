'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAccount, useWalletClient, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { type Hex, parseUnits } from 'viem';
import { base } from 'wagmi/chains';

/**
 * Outcome data for a market
 */
interface OutcomeData {
  index: number;
  label: string;
  price: number;
  tokenId?: string;
}

/**
 * Platform-specific market data to avoid API calls
 */
interface MarketPlatformData {
  /** Market contract address (for AMM markets) */
  address?: string;
  /** Trade type: 'amm' or 'clob' */
  tradeType?: string;
  /** Exchange address (for CLOB markets) */
  exchangeAddress?: string;
  /** Collateral token info */
  collateralToken?: {
    address?: string;
    decimals?: number;
    symbol?: string;
  };
  /** Token IDs */
  yesTokenId?: string;
  noTokenId?: string;
  tokens?: Record<string, string>;
}

interface TradingPanelProps {
  marketId: string;
  marketSlug: string;
  marketQuestion: string;
  platform: string;
  /** @deprecated Use outcomes instead */
  yesPrice?: number | null;
  /** @deprecated Use outcomes instead */
  noPrice?: number | null;
  /** All outcomes for this market (binary or multi-outcome) */
  outcomes?: OutcomeData[];
  /** Platform-specific data (contract addresses, etc.) to avoid API calls */
  platformData?: MarketPlatformData;
  onTradeSuccess?: () => void;
}

type Side = 'BUY' | 'SELL';

// Limitless EIP-712 Order Types (for CLOB markets - used in commented CLOB code below)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _LIMITLESS_ORDER_TYPES = {
  Order: [
    { name: 'maker', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'feeRateBps', type: 'uint256' },
    { name: 'signatureType', type: 'uint8' },
  ],
} as const;

// ERC20 ABI for USDC approval
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// FPMM (Fixed Product Market Maker) ABI for AMM trading
const FPMM_ABI = [
  {
    name: 'buy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'investmentAmount', type: 'uint256' },
      { name: 'outcomeIndex', type: 'uint256' },
      { name: 'minOutcomeTokensToBuy', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'sell',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'returnAmount', type: 'uint256' },
      { name: 'outcomeIndex', type: 'uint256' },
      { name: 'maxOutcomeTokensToSell', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'calcBuyAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'investmentAmount', type: 'uint256' },
      { name: 'outcomeIndex', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'calcSellAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'returnAmount', type: 'uint256' },
      { name: 'outcomeIndex', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'collateralToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// USDC on Base
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Hex;

// Use our backend proxy to avoid CORS issues
const API_BASE = '/api/trading/limitless';

/**
 * Normalize price to 0-1 probability range
 * Handles both 0-1 (probability) and 0-100 (percentage) inputs
 */
function normalizePrice(price: number | null): number {
  if (price === null || price === undefined) return 0.5;
  // If price > 1, assume it's a percentage and convert to probability
  return price > 1 ? price / 100 : price;
}

/**
 * Convert probability (0-1) to percentage string for display
 */
function toPercentageString(probability: number): string {
  return (probability * 100).toFixed(1);
}

export function TradingPanel({
  marketId,
  marketSlug: _marketSlug,
  marketQuestion: _marketQuestion,
  platform,
  yesPrice,
  noPrice,
  outcomes: propOutcomes,
  platformData,
  onTradeSuccess,
}: TradingPanelProps) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // Contract write hooks for AMM trading
  const { writeContractAsync: writeApprove, isPending: isApproving } = useWriteContract();
  const { writeContractAsync: writeBuy, isPending: isBuying, data: buyTxHash } = useWriteContract();
  const { writeContractAsync: writeSell, isPending: isSelling, data: sellTxHash } = useWriteContract();

  // Wait for transaction receipts
  const { isLoading: isWaitingBuy, isSuccess: buySuccess } = useWaitForTransactionReceipt({
    hash: buyTxHash,
  });
  const { isLoading: isWaitingSell, isSuccess: sellSuccess } = useWaitForTransactionReceipt({
    hash: sellTxHash,
  });

  // Build outcomes array - either from props or legacy yesPrice/noPrice
  const marketOutcomes = useMemo<OutcomeData[]>(() => {
    if (propOutcomes && propOutcomes.length > 0) {
      // Normalize prices in outcomes
      return propOutcomes.map(o => ({
        ...o,
        price: normalizePrice(o.price),
      }));
    }
    // Legacy binary market fallback
    return [
      { index: 0, label: 'Yes', price: normalizePrice(yesPrice ?? null) },
      { index: 1, label: 'No', price: normalizePrice(noPrice ?? null) },
    ];
  }, [propOutcomes, yesPrice, noPrice]);

  // Determine if this is a multi-outcome market
  const isMultiOutcome = marketOutcomes.length > 2;

  // For multi-outcome markets, get the index of the highest-priced outcome (first in sorted display)
  const defaultOutcomeIndex = useMemo(() => {
    if (isMultiOutcome && marketOutcomes.length > 0) {
      // Find the outcome with the highest price (will be displayed first)
      const sorted = [...marketOutcomes].sort((a, b) => b.price - a.price);
      return sorted[0]?.index ?? 0;
    }
    return 0; // Default to first outcome (Yes) for binary markets
  }, [isMultiOutcome, marketOutcomes]);

  // Selected outcome state - now stores the outcome index
  const [selectedOutcomeIndex, setSelectedOutcomeIndex] = useState<number>(defaultOutcomeIndex);

  // Update selection when default changes (e.g., when switching markets)
  useEffect(() => {
    setSelectedOutcomeIndex(defaultOutcomeIndex);
  }, [defaultOutcomeIndex]);
  const [side, setSide] = useState<Side>('BUY');
  const [size, setSize] = useState<string>('10');

  // Get the currently selected outcome by finding it by index property (not array position)
  const selectedOutcome = useMemo(() => {
    return marketOutcomes.find(o => o.index === selectedOutcomeIndex) || marketOutcomes[0];
  }, [marketOutcomes, selectedOutcomeIndex]);

  const [price, setPrice] = useState<string>(
    toPercentageString(selectedOutcome?.price ?? 0.5)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [marketContractAddress, setMarketContractAddress] = useState<Hex | null>(null);
  const [isAmmMarket, setIsAmmMarket] = useState<boolean>(false);

  // Read USDC allowance for AMM markets
  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: BASE_USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && marketContractAddress ? [address, marketContractAddress] : undefined,
    query: {
      enabled: !!address && !!marketContractAddress && isAmmMarket,
    },
  });

  // Handle transaction success
  useEffect(() => {
    if (buySuccess || sellSuccess) {
      setSuccess(`Transaction confirmed! ${side === 'BUY' ? 'Bought' : 'Sold'} ${selectedOutcome?.label} shares.`);
      setIsSubmitting(false);
      onTradeSuccess?.();
      refetchAllowance();
    }
  }, [buySuccess, sellSuccess, side, selectedOutcome?.label, onTradeSuccess, refetchAllowance]);

  // Update price when outcome changes
  const handleOutcomeChange = useCallback((outcomeIndex: number) => {
    setSelectedOutcomeIndex(outcomeIndex);
    const newOutcome = marketOutcomes[outcomeIndex];
    if (newOutcome) {
      setPrice(toPercentageString(newOutcome.price));
    }
  }, [marketOutcomes]);

  // Calculate estimated cost/payout
  const sizeNum = parseFloat(size) || 0;
  const priceNum = (parseFloat(price) || 50) / 100;
  const estimatedCost = side === 'BUY' ? sizeNum * priceNum : 0;
  const estimatedPayout = side === 'SELL' ? sizeNum * priceNum : sizeNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Check wallet connection
    if (!isConnected || !address) {
      setError('Please connect your wallet to trade.');
      return;
    }

    if (!walletClient) {
      setError('Wallet not ready. Please try again.');
      return;
    }

    // Check chain - Limitless is on Base
    if (chainId !== base.id) {
      try {
        setError('Switching to Base network...');
        switchChain({ chainId: base.id });
        return;
      } catch {
        setError('Please switch to Base network to trade on Limitless.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Use platformData if provided, otherwise try to fetch (may fail without API key)
      let marketData = platformData;

      if (!marketData?.address && !marketData?.exchangeAddress) {
        // Try to fetch market details via our proxy (may require API key)
        try {
          const marketResponse = await fetch(`${API_BASE}/markets/${marketId}`);
          if (marketResponse.ok) {
            const marketResult = await marketResponse.json();
            marketData = {
              address: marketResult.data?.address,
              tradeType: marketResult.data?.tradeType,
              exchangeAddress: marketResult.data?.venue?.exchange,
              collateralToken: marketResult.data?.collateralToken,
              yesTokenId: marketResult.data?.yesTokenId,
              noTokenId: marketResult.data?.noTokenId,
              tokens: marketResult.data?.tokens,
            };
          }
        } catch {
          // API fetch failed, continue with platformData
        }
      }

      // Check market type - AMM vs CLOB
      const isAmm = marketData?.tradeType === 'amm' || !marketData?.exchangeAddress;
      setIsAmmMarket(isAmm);

      if (isAmm) {
        // AMM markets trade via the market contract using FPMM
        const ammContractAddress = marketData?.address as Hex;
        if (!ammContractAddress) {
          throw new Error('Market contract address not found. Please ensure the market data is available.');
        }
        setMarketContractAddress(ammContractAddress);

        // Get collateral decimals (USDC = 6)
        const collateralDecimals = marketData?.collateralToken?.decimals || 6;

        // Calculate investment amount in collateral token units
        const sizeDecimal = parseFloat(size);
        const priceDecimal = parseFloat(price) / 100;
        const investmentAmount = sizeDecimal * priceDecimal;
        const investmentAmountWei = parseUnits(investmentAmount.toFixed(collateralDecimals), collateralDecimals);

        // Use the selected outcome index
        const outcomeIndex = BigInt(selectedOutcome?.index ?? 0);

        if (side === 'BUY') {
          // Check allowance first
          const currentAllowance = usdcAllowance ?? BigInt(0);
          if (currentAllowance < investmentAmountWei) {
            // Need to approve USDC
            setError('Approving USDC...');
            try {
              await writeApprove({
                address: BASE_USDC,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [ammContractAddress, investmentAmountWei * BigInt(2)], // Approve 2x for buffer
              });
              // Wait a bit for approval to be mined (in a real app we'd wait for receipt)
              await new Promise(resolve => setTimeout(resolve, 3000));
              await refetchAllowance();
              setError(null);
            } catch (approveError) {
              throw new Error(`Failed to approve USDC: ${approveError instanceof Error ? approveError.message : 'Unknown error'}`);
            }
          }

          // Calculate minimum tokens to buy (with 2% slippage tolerance)
          // Use rough estimate: investmentAmount / price * 0.98
          const estimatedTokens = investmentAmount / priceDecimal;
          const minTokens = parseUnits((estimatedTokens * 0.98).toFixed(collateralDecimals), collateralDecimals);

          setError('Submitting buy order...');
          await writeBuy({
            address: ammContractAddress,
            abi: FPMM_ABI,
            functionName: 'buy',
            args: [investmentAmountWei, outcomeIndex, minTokens],
          });
          setError('Waiting for confirmation...');
        } else {
          // SELL: Need to specify how much collateral we want back and max tokens to sell
          const returnAmount = parseUnits((sizeDecimal * priceDecimal).toFixed(collateralDecimals), collateralDecimals);
          // Max tokens to sell (with 2% slippage tolerance)
          const maxTokensToSell = parseUnits((sizeDecimal * 1.02).toFixed(collateralDecimals), collateralDecimals);

          setError('Submitting sell order...');
          await writeSell({
            address: ammContractAddress,
            abi: FPMM_ABI,
            functionName: 'sell',
            args: [returnAmount, outcomeIndex, maxTokensToSell],
          });
          setError('Waiting for confirmation...');
        }

        // Transaction submitted - the useEffect will handle success
        return;
      }

      // CLOB markets require Limitless API authentication
      // For now, redirect users to trade directly on Limitless
      const limitlessUrl = `https://limitless.exchange/markets/${marketId}`;
      setError('CLOB markets require Limitless account. Redirecting...');
      setIsSubmitting(false);
      window.open(limitlessUrl, '_blank');
      return;

      /* CLOB trading code - requires Limitless API key
      // Get exchange contract address (CLOB markets only)
      const exchangeAddress = marketData?.exchangeAddress;
      if (!exchangeAddress) {
        throw new Error('Market exchange address not found');
      }

      // Get token ID for the selected outcome
      let tokenId: string;
      if (selectedOutcome?.tokenId) {
        tokenId = selectedOutcome.tokenId;
      } else if (selectedOutcome?.label.toLowerCase() === 'yes') {
        tokenId = marketData?.yesTokenId || marketData?.tokens?.yes || '0';
      } else if (selectedOutcome?.label.toLowerCase() === 'no') {
        tokenId = marketData?.noTokenId || marketData?.tokens?.no || '1';
      } else {
        tokenId = String(selectedOutcome?.index ?? 0);
      }

      const priceDecimal = parseFloat(price) / 100;
      const sizeDecimal = parseFloat(size);
      const priceWei = BigInt(Math.floor(priceDecimal * 1e18));
      const sizeWei = BigInt(Math.floor(sizeDecimal * 1e18));
      const makerAmount = side === 'BUY'
        ? (sizeWei * priceWei) / BigInt(1e18)
        : sizeWei;
      const takerAmount = side === 'BUY'
        ? sizeWei
        : (sizeWei * priceWei) / BigInt(1e18);
      const expiration = BigInt(Math.floor(Date.now() / 1000) + 86400);
      const nonce = BigInt(Date.now());

      const orderData = {
        maker: address,
        taker: '0x0000000000000000000000000000000000000000' as Hex,
        tokenId: BigInt(tokenId),
        makerAmount,
        takerAmount,
        side: side === 'BUY' ? 0 : 1,
        expiration,
        nonce,
        feeRateBps: BigInt(0),
        signatureType: 0,
      };

      const domain = {
        name: 'Limitless CTF Exchange',
        version: '1',
        chainId: base.id,
        verifyingContract: exchangeAddress as Hex,
      };

      const signature = await walletClient.signTypedData({
        account: address,
        domain,
        types: LIMITLESS_ORDER_TYPES,
        primaryType: 'Order',
        message: orderData,
      });

      const submitResponse = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marketSlug: marketId,
          order: {
            maker: orderData.maker,
            taker: orderData.taker,
            tokenId: orderData.tokenId.toString(),
            makerAmount: orderData.makerAmount.toString(),
            takerAmount: orderData.takerAmount.toString(),
            side: orderData.side,
            expiration: orderData.expiration.toString(),
            nonce: orderData.nonce.toString(),
            feeRateBps: orderData.feeRateBps.toString(),
            signatureType: orderData.signatureType,
          },
          signature,
        }),
      });

      const submitResult = await submitResponse.json();
      if (!submitResponse.ok || !submitResult.success) {
        throw new Error(submitResult.error || 'Order submission failed');
      }

      const result = submitResult.data;
      setSuccess(`Order placed! ID: ${result?.id || result?.orderId || 'confirmed'}`);
      onTradeSuccess?.();
      */ // End of commented CLOB code

    } catch (err) {
      console.error('[TradingPanel] Order error:', err);
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPlatformSupported = platform === 'LIMITLESS';

  return (
    <div className="ascii-box p-4">
      <h3 className="text-sm font-bold mb-3 text-[hsl(var(--primary))]">
        [TRADE ON {platform}]
      </h3>

      {!isPlatformSupported ? (
        <div className="text-sm text-[hsl(var(--muted-foreground))]">
          Trading not yet available for {platform}. Only Limitless is currently supported.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Outcome Selection */}
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">
              OUTCOME {isMultiOutcome && `(${marketOutcomes.length} choices)`}
            </label>
            {isMultiOutcome ? (
              // Multi-outcome: Scrollable list with radio-style selection
              <div className="max-h-48 overflow-y-auto space-y-1 border border-[hsl(var(--border))] p-2">
                {marketOutcomes
                  .sort((a, b) => b.price - a.price)
                  .map((outcomeOption) => (
                    <button
                      key={outcomeOption.index}
                      type="button"
                      onClick={() => handleOutcomeChange(outcomeOption.index)}
                      className={`w-full py-2 px-3 text-sm text-left border transition-colors flex justify-between items-center ${
                        selectedOutcomeIndex === outcomeOption.index
                          ? 'bg-[hsl(var(--primary))] text-black border-[hsl(var(--primary))]'
                          : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))]'
                      }`}
                    >
                      <span className="truncate flex-1 font-medium">{outcomeOption.label}</span>
                      <span className={`ml-2 font-bold ${
                        selectedOutcomeIndex === outcomeOption.index
                          ? 'text-black'
                          : 'text-[hsl(var(--primary))]'
                      }`}>
                        {toPercentageString(outcomeOption.price)}%
                      </span>
                    </button>
                  ))}
              </div>
            ) : (
              // Binary market: YES/NO buttons side by side
              <div className="flex gap-2">
                {marketOutcomes.map((outcomeOption) => {
                  const isYes = outcomeOption.label.toLowerCase() === 'yes';
                  const isSelected = selectedOutcomeIndex === outcomeOption.index;
                  return (
                    <button
                      key={outcomeOption.index}
                      type="button"
                      onClick={() => handleOutcomeChange(outcomeOption.index)}
                      className={`flex-1 py-2 px-3 text-sm font-bold border transition-colors ${
                        isSelected
                          ? isYes
                            ? 'bg-[hsl(var(--bullish))] text-black border-[hsl(var(--bullish))]'
                            : 'bg-[hsl(var(--bearish))] text-black border-[hsl(var(--bearish))]'
                          : isYes
                            ? 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--bullish))]'
                            : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--bearish))]'
                      }`}
                    >
                      {outcomeOption.label.toUpperCase()} @ {toPercentageString(outcomeOption.price)}%
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Side Selection */}
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">
              ACTION
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSide('BUY')}
                className={`flex-1 py-2 px-3 text-sm font-bold border transition-colors ${
                  side === 'BUY'
                    ? 'bg-[hsl(var(--primary))] text-black border-[hsl(var(--primary))]'
                    : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))]'
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                className={`flex-1 py-2 px-3 text-sm font-bold border transition-colors ${
                  side === 'SELL'
                    ? 'bg-[hsl(var(--warning))] text-black border-[hsl(var(--warning))]'
                    : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--warning))]'
                }`}
              >
                SELL
              </button>
            </div>
          </div>

          {/* Size Input */}
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">
              SIZE (SHARES)
            </label>
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              min="1"
              step="1"
              className="w-full bg-black border border-[hsl(var(--border))] px-3 py-2 text-sm font-mono focus:border-[hsl(var(--primary))] focus:outline-none"
              placeholder="10"
            />
          </div>

          {/* Price Input */}
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">
              LIMIT PRICE (%)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0.1"
              max="99.9"
              step="0.1"
              className="w-full bg-black border border-[hsl(var(--border))] px-3 py-2 text-sm font-mono focus:border-[hsl(var(--primary))] focus:outline-none"
              placeholder="50.0"
            />
          </div>

          {/* Order Summary */}
          <div className="border border-[hsl(var(--border))] p-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">Order:</span>
              <span className="truncate max-w-[60%]">
                {side} {sizeNum} "{selectedOutcome?.label}" @ {price}%
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">
                {side === 'BUY' ? 'Est. Cost:' : 'Est. Receive:'}
              </span>
              <span className="text-[hsl(var(--primary))]">
                ${estimatedCost.toFixed(2)} USDC
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">
                {side === 'BUY' ? 'Max Payout:' : 'Shares Sold:'}
              </span>
              <span>
                {side === 'BUY' ? `$${estimatedPayout.toFixed(2)}` : `${sizeNum} shares`}
              </span>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--muted-foreground))]">Market Type:</span>
              {platformData?.tradeType === 'amm' || platformData?.address ? (
                <span className="text-[hsl(var(--success))]">AMM (Instant Fill)</span>
              ) : platformData?.exchangeAddress ? (
                <span className="text-[hsl(var(--warning))]">CLOB (Opens Limitless)</span>
              ) : (
                <span className="text-[hsl(var(--muted-foreground))]">Unknown</span>
              )}
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="text-xs text-[hsl(var(--destructive))] border border-[hsl(var(--destructive))] p-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-xs text-[hsl(var(--success))] border border-[hsl(var(--success))] p-2">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isApproving || isBuying || isSelling || isWaitingBuy || isWaitingSell || sizeNum <= 0}
            className={`w-full py-3 text-sm font-bold border transition-colors ${
              isSubmitting || isApproving || isBuying || isSelling || isWaitingBuy || isWaitingSell || sizeNum <= 0
                ? 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'
                : side === 'BUY'
                  ? 'border-[hsl(var(--bullish))] text-[hsl(var(--bullish))] hover:bg-[hsl(var(--bullish))] hover:text-black'
                  : 'border-[hsl(var(--bearish))] text-[hsl(var(--bearish))] hover:bg-[hsl(var(--bearish))] hover:text-black'
            }`}
          >
            {isApproving
              ? 'APPROVING USDC...'
              : isBuying || isSelling
                ? 'CONFIRM IN WALLET...'
                : isWaitingBuy || isWaitingSell
                  ? 'CONFIRMING TX...'
                  : isSubmitting
                    ? 'SIGNING ORDER...'
                    : !isConnected
                      ? 'CONNECT WALLET TO TRADE'
                      : chainId !== base.id
                        ? 'SWITCH TO BASE'
                        : `${side} "${selectedOutcome?.label}"`}
          </button>

          {/* Status */}
          <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
            {isConnected
              ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}`
              : 'Connect wallet above to trade'}
          </p>
        </form>
      )}
    </div>
  );
}
