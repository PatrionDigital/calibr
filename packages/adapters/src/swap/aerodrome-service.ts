/**
 * Aerodrome Swap Service
 * Token swap service using Aerodrome DEX on Base
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
} from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  type SwapConfig,
  type SwapQuoteRequest,
  type SwapQuote,
  type SwapRequest,
  type SwapResult,
  type ApprovalRequest,
  type ApprovalResult,
  type AerodromeRoute,
  type ISwapService,
  DEFAULT_SWAP_CONFIG,
  BASE_TOKENS,
} from './types';
import { AERODROME_ROUTER_ABI, ERC20_ABI } from './abi';

// =============================================================================
// Constants
// =============================================================================

const MAX_UINT256 = 2n ** 256n - 1n;
const MIN_SLIPPAGE = 0.0001; // 0.01%
const MAX_SLIPPAGE = 0.5; // 50%

// =============================================================================
// Swap Service Implementation
// =============================================================================

export class AerodromeSwapService implements ISwapService {
  private config: SwapConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- viem client types are complex with chain-specific types
  private publicClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- viem client types are complex with chain-specific types
  private walletClient: any = null;
  private account: Account | null = null;

  constructor(config: Partial<SwapConfig> = {}) {
    this.config = { ...DEFAULT_SWAP_CONFIG, ...config };
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(this.config.rpcUrl),
    });
  }

  /**
   * Initialize wallet for signing transactions
   */
  async initializeWallet(privateKey: `0x${string}`): Promise<void> {
    this.account = privateKeyToAccount(privateKey);
    this.walletClient = createWalletClient({
      account: this.account,
      chain: base,
      transport: http(this.config.rpcUrl),
    });
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): `0x${string}` | null {
    return this.account?.address ?? null;
  }

  // ===========================================================================
  // Quote Methods
  // ===========================================================================

  /**
   * Get a quote for a token swap
   */
  async getQuote(request: SwapQuoteRequest, slippage?: number): Promise<SwapQuote> {
    this.validateQuoteRequest(request);

    const effectiveSlippage = this.validateSlippage(slippage ?? this.config.defaultSlippage);

    // Build route
    const routes = await this.findBestRoute(request);
    if (routes.length === 0) {
      throw new Error('No valid route found for swap');
    }

    // Get amounts from router
    const amounts = await this.getAmountsOut(request.amountIn, routes);
    const amountOut = amounts[amounts.length - 1]!;

    // Calculate minimum output with slippage
    const amountOutMin = this.calculateMinOutput(amountOut, effectiveSlippage);

    // Calculate price impact
    const priceImpact = await this.calculatePriceImpact(request, routes, amountOut);

    // Create quote
    const now = new Date();
    return {
      tokenIn: request.tokenIn,
      tokenOut: request.tokenOut,
      amountIn: request.amountIn,
      amountOut,
      amountOutMin,
      slippage: effectiveSlippage,
      routes,
      priceImpact,
      timestamp: now,
      validUntil: new Date(now.getTime() + 60000), // 1 minute validity
    };
  }

  /**
   * Convenience method to get CALIBR to USDC quote
   */
  async swapCalibrToUsdc(amountIn: bigint, slippage?: number): Promise<SwapQuote> {
    if (BASE_TOKENS.CALIBR === '0x0000000000000000000000000000000000000000') {
      throw new Error('CALIBR token address not configured');
    }

    return this.getQuote(
      {
        tokenIn: BASE_TOKENS.CALIBR,
        tokenOut: BASE_TOKENS.USDC,
        amountIn,
        preferStable: false,
      },
      slippage
    );
  }

  // ===========================================================================
  // Swap Execution
  // ===========================================================================

  /**
   * Execute a token swap
   */
  async executeSwap(request: SwapRequest): Promise<SwapResult> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not initialized. Call initializeWallet() first.');
    }

    // Validate quote is not expired
    if (request.quote.validUntil.getTime() < Date.now()) {
      throw new Error('Quote has expired. Please get a new quote.');
    }

    const recipient = request.recipient ?? this.account.address;
    const deadline = request.deadline ?? Math.floor(Date.now() / 1000) + this.config.defaultDeadlineOffset;

    // Simulate transaction first
    const { request: txRequest } = await this.publicClient.simulateContract({
      address: this.config.routerAddress,
      abi: AERODROME_ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [
        request.quote.amountIn,
        request.quote.amountOutMin,
        request.quote.routes,
        recipient,
        BigInt(deadline),
      ],
      account: this.account,
    });

    // Execute swap
    const txHash = await this.walletClient.writeContract(txRequest);

    // Wait for confirmation
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });

    // Parse output amount from logs (simplified - would need proper log parsing)
    const amountOut = request.quote.amountOut; // Use expected for now

    return {
      success: receipt.status === 'success',
      txHash,
      amountOut,
      gasUsed: receipt.gasUsed,
      effectivePrice: Number(amountOut) / Number(request.quote.amountIn),
      blockNumber: receipt.blockNumber,
    };
  }

  // ===========================================================================
  // Approval Methods
  // ===========================================================================

  /**
   * Check if approval is needed
   */
  async checkApproval(
    token: `0x${string}`,
    owner: `0x${string}`,
    amount: bigint
  ): Promise<boolean> {
    const allowance = await this.publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [owner, this.config.routerAddress],
    });

    return (allowance as bigint) >= amount;
  }

  /**
   * Approve token spending
   */
  async approve(request: ApprovalRequest): Promise<ApprovalResult> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not initialized. Call initializeWallet() first.');
    }

    // Simulate first
    const { request: txRequest } = await this.publicClient.simulateContract({
      address: request.token,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [request.spender, request.amount],
      account: this.account,
    });

    // Execute approval
    const txHash = await this.walletClient.writeContract(txRequest);

    // Wait for confirmation
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });

    // Check new allowance
    const allowance = await this.publicClient.readContract({
      address: request.token,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [this.account.address, request.spender],
    });

    return {
      success: receipt.status === 'success',
      txHash,
      allowance: allowance as bigint,
    };
  }

  /**
   * Approve max amount for a token
   */
  async approveMax(token: `0x${string}`): Promise<ApprovalResult> {
    return this.approve({
      token,
      spender: this.config.routerAddress,
      amount: MAX_UINT256,
    });
  }

  // ===========================================================================
  // Balance Methods
  // ===========================================================================

  /**
   * Get token balance
   */
  async getBalance(token: `0x${string}`, address: `0x${string}`): Promise<bigint> {
    const balance = await this.publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address],
    });
    return balance as bigint;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private validateQuoteRequest(request: SwapQuoteRequest): void {
    if (request.amountIn <= 0n) {
      throw new Error('Amount must be greater than 0');
    }
    if (request.tokenIn === request.tokenOut) {
      throw new Error('Input and output tokens must be different');
    }
    if (!request.tokenIn.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid tokenIn address');
    }
    if (!request.tokenOut.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid tokenOut address');
    }
  }

  private validateSlippage(slippage: number): number {
    if (slippage < MIN_SLIPPAGE) {
      throw new Error(`Slippage too low. Minimum: ${MIN_SLIPPAGE * 100}%`);
    }
    if (slippage > MAX_SLIPPAGE) {
      throw new Error(`Slippage too high. Maximum: ${MAX_SLIPPAGE * 100}%`);
    }
    return slippage;
  }

  private calculateMinOutput(amountOut: bigint, slippage: number): bigint {
    const slippageBps = BigInt(Math.floor(slippage * 10000));
    return amountOut - (amountOut * slippageBps) / 10000n;
  }

  private async findBestRoute(request: SwapQuoteRequest): Promise<AerodromeRoute[]> {
    const factory = this.config.factoryAddress;

    // Try direct route first
    const directRoute: AerodromeRoute = {
      from: request.tokenIn,
      to: request.tokenOut,
      stable: request.preferStable ?? false,
      factory,
    };

    // Check if direct pool exists
    const directPool = await this.getPoolAddress(
      request.tokenIn,
      request.tokenOut,
      request.preferStable ?? false
    );

    if (directPool !== '0x0000000000000000000000000000000000000000') {
      return [directRoute];
    }

    // Try route via WETH
    const wethRoute: AerodromeRoute[] = [
      {
        from: request.tokenIn,
        to: BASE_TOKENS.WETH,
        stable: false,
        factory,
      },
      {
        from: BASE_TOKENS.WETH,
        to: request.tokenOut,
        stable: false,
        factory,
      },
    ];

    // Check if WETH route pools exist
    const pool1 = await this.getPoolAddress(request.tokenIn, BASE_TOKENS.WETH, false);
    const pool2 = await this.getPoolAddress(BASE_TOKENS.WETH, request.tokenOut, false);

    if (
      pool1 !== '0x0000000000000000000000000000000000000000' &&
      pool2 !== '0x0000000000000000000000000000000000000000'
    ) {
      return wethRoute;
    }

    return [];
  }

  private async getPoolAddress(
    tokenA: `0x${string}`,
    tokenB: `0x${string}`,
    stable: boolean
  ): Promise<`0x${string}`> {
    try {
      const pool = await this.publicClient.readContract({
        address: this.config.routerAddress,
        abi: AERODROME_ROUTER_ABI,
        functionName: 'poolFor',
        args: [tokenA, tokenB, stable, this.config.factoryAddress],
      });
      return pool as `0x${string}`;
    } catch {
      return '0x0000000000000000000000000000000000000000';
    }
  }

  private async getAmountsOut(amountIn: bigint, routes: AerodromeRoute[]): Promise<bigint[]> {
    const amounts = await this.publicClient.readContract({
      address: this.config.routerAddress,
      abi: AERODROME_ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [amountIn, routes],
    });
    return amounts as bigint[];
  }

  private async calculatePriceImpact(
    request: SwapQuoteRequest,
    routes: AerodromeRoute[],
    actualOut: bigint
  ): Promise<number> {
    // Get a small amount quote to estimate spot price
    const spotAmountIn = request.amountIn / 1000n;
    if (spotAmountIn === 0n) {
      return 0;
    }

    try {
      const spotAmounts = await this.getAmountsOut(spotAmountIn, routes);
      const spotOut = spotAmounts[spotAmounts.length - 1]!;

      // Calculate expected output at spot price
      const expectedOut = (spotOut * request.amountIn) / spotAmountIn;

      // Price impact = (expected - actual) / expected
      if (expectedOut === 0n) {
        return 0;
      }

      const impact = Number(expectedOut - actualOut) / Number(expectedOut);
      return Math.max(0, impact);
    } catch {
      return 0;
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new Aerodrome swap service
 */
export function createSwapService(config?: Partial<SwapConfig>): AerodromeSwapService {
  return new AerodromeSwapService(config);
}
