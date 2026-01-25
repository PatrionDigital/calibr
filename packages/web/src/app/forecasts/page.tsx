'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { api, type Forecast, type ForecastStats, type UnifiedMarket } from '@/lib/api';
import { ForecastForm, type ForecastFormData } from '@/components/forecast-form';
import { getAttestationUrl } from '@/lib/eas';
import { useEASAttestation } from '@/hooks/useEASAttestation';
import { Tooltip, InfoIcon, KELLY_TOOLTIPS } from '@/components/tooltip';

/**
 * Calculate Brier score for a forecast
 * Brier = (forecast - outcome)^2
 * Where outcome is 1 (YES) or 0 (NO)
 */
function calculateBrierScore(forecast: number, resolution: string | null): number | null {
  if (!resolution) return null;
  const outcome = resolution.toUpperCase() === 'YES' ? 1 : 0;
  return Math.pow(forecast - outcome, 2);
}

export default function ForecastsPage() {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [stats, setStats] = useState<ForecastStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<UnifiedMarket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnifiedMarket[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [includePrivate, setIncludePrivate] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [forecastsRes, statsRes] = await Promise.all([
        api.getForecasts({ limit: 50, includePrivate }),
        api.getForecastStats(),
      ]);
      setForecasts(forecastsRes.forecasts);
      setStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [includePrivate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Search markets
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.getMarkets({ search: searchQuery, limit: 10, active: true });
        setSearchResults(res.markets);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateForecast = async (data: ForecastFormData) => {
    if (!selectedMarket) return;

    try {
      await api.createForecast({
        unifiedMarketId: selectedMarket.id,
        probability: data.probability,
        confidence: data.confidence,
        commitMessage: data.commitMessage || undefined,
        isPublic: data.isPublic,
        kellyFraction: data.kellyFraction,
        executeRebalance: data.executeRebalance,
      });
      setShowCreateForm(false);
      setSelectedMarket(null);
      setSearchQuery('');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create forecast');
    }
  };

  const handleSelectMarket = (market: UnifiedMarket) => {
    setSelectedMarket(market);
    setSearchQuery('');
    setSearchResults([]);
    setShowCreateForm(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/"
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] text-sm"
            >
              &larr; HOME
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold terminal-glow mb-2">
              FORECAST JOURNAL
            </h1>
            <Link
              href="/forecasts/analytics"
              className="text-sm px-3 py-1 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors"
            >
              VIEW ANALYTICS
            </Link>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Track your probability estimates with git-style commits
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats */}
            {stats && (
              <div className="ascii-box p-4">
                <h2 className="text-sm font-bold mb-4">[STATISTICS]</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Total Forecasts</span>
                    <span className="font-bold">{stats.totalForecasts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Public</span>
                    <span>{stats.publicForecasts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Private</span>
                    <span>{stats.privateForecasts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Attested (EAS)</span>
                    <span className="text-[hsl(var(--info))]">{stats.attestedForecasts}</span>
                  </div>
                  <div className="border-t border-[hsl(var(--border))] pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-[hsl(var(--muted-foreground))]">Avg Edge</span>
                      <span className={stats.averageEdge >= 0 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'}>
                        {stats.averageEdge >= 0 ? '+' : ''}{(stats.averageEdge * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Create New Forecast */}
            <div className="ascii-box p-4">
              <h2 className="text-sm font-bold mb-4">[NEW FORECAST]</h2>

              {!showCreateForm ? (
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search markets..."
                      className="w-full bg-transparent border border-[hsl(var(--border))] px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none"
                    />
                    {isSearching && (
                      <span className="absolute right-3 top-2 text-xs text-[hsl(var(--muted-foreground))]">
                        ...
                      </span>
                    )}
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="border border-[hsl(var(--border))] max-h-60 overflow-y-auto">
                      {searchResults.map((market) => (
                        <button
                          key={market.id}
                          onClick={() => handleSelectMarket(market)}
                          className="w-full text-left p-3 border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--accent))] transition-colors"
                        >
                          <div className="text-sm truncate">{market.question}</div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                            {market.bestYesPrice !== null && (
                              <>Current: {(market.bestYesPrice > 1 ? market.bestYesPrice : market.bestYesPrice * 100).toFixed(1)}%</>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery && !isSearching && searchResults.length === 0 && (
                    <div className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                      No active markets found
                    </div>
                  )}
                </div>
              ) : selectedMarket ? (
                <ForecastForm
                  market={selectedMarket}
                  onSubmit={handleCreateForecast}
                  onCancel={() => {
                    setShowCreateForm(false);
                    setSelectedMarket(null);
                  }}
                />
              ) : null}
            </div>

            {/* Filters */}
            <div className="ascii-box p-4">
              <h2 className="text-sm font-bold mb-4">[FILTERS]</h2>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includePrivate"
                  checked={includePrivate}
                  onChange={(e) => setIncludePrivate(e.target.checked)}
                  className="accent-[hsl(var(--primary))]"
                />
                <label htmlFor="includePrivate" className="text-sm">
                  Show private forecasts
                </label>
              </div>
            </div>
          </div>

          {/* Forecast List */}
          <div className="lg:col-span-2">
            {error ? (
              <div className="ascii-box p-8 text-center">
                <div className="text-[hsl(var(--error))] mb-4">[ERROR] {error}</div>
                <button
                  onClick={() => {
                    setIsLoading(true);
                    fetchData();
                  }}
                  className="text-sm px-4 py-2 border border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors"
                >
                  RETRY
                </button>
              </div>
            ) : isLoading ? (
              <div className="ascii-box p-8 text-center">
                <div className="terminal-glow cursor-blink">LOADING FORECASTS</div>
              </div>
            ) : forecasts.length === 0 ? (
              <div className="ascii-box p-8 text-center">
                <div className="text-[hsl(var(--muted-foreground))] mb-4">
                  No forecasts yet
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Search for a market above to create your first forecast
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">
                    {forecasts.length} forecasts
                  </div>
                  <button
                    onClick={() => fetchData()}
                    className="text-xs px-2 py-1 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-colors"
                  >
                    REFRESH
                  </button>
                </div>

                {forecasts.map((forecast) => (
                  <ForecastCard
                    key={forecast.id}
                    forecast={forecast}
                    formatDate={formatDate}
                    onAttestationComplete={fetchData}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ForecastCardProps {
  forecast: Forecast;
  formatDate: (dateStr: string) => string;
  onAttestationComplete?: () => void;
}

function ForecastCard({ forecast, formatDate, onAttestationComplete }: ForecastCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAttesting, setIsAttesting] = useState(false);
  const [attestError, setAttestError] = useState<string | null>(null);
  const [attestationUid, setAttestationUid] = useState<string | null>(forecast.easAttestationUid || null);

  const { isConnected } = useAccount();
  const { createForecastAttestation, isLoading: isEASLoading, error: easError } = useEASAttestation();

  const edge = forecast.calculated?.edge ?? 0;
  const hasPositiveEdge = forecast.calculated?.hasPositiveEdge ?? false;

  const handleAttest = async () => {
    if (!isConnected) {
      setAttestError('Please connect your wallet to create an on-chain attestation');
      return;
    }

    setIsAttesting(true);
    setAttestError(null);

    try {
      // Get attestation data from backend
      const attestData = await api.getAttestationData(forecast.id);

      if (attestData.isAttested) {
        setAttestationUid(attestData.existingUid);
        return;
      }

      // Create the on-chain attestation via EAS
      // Probability: 1-99 representing 0.01-0.99 (as expected by resolver)
      // Confidence: 0-100 (as expected by resolver)
      const result = await createForecastAttestation({
        probability: Math.round(forecast.probability * 100), // Convert to 1-99 range
        marketId: forecast.unifiedMarket?.id || forecast.unifiedMarketId,
        platform: 'CALIBR',
        confidence: Math.round((forecast.confidence ?? 0.5) * 100), // Convert to 0-100 range
        reasoning: forecast.commitMessage || '',
        isPublic: forecast.isPublic,
      });

      if (!result) {
        throw new Error(easError || 'Failed to create attestation - transaction may have been rejected');
      }

      // Record the attestation in the backend
      const backendResult = await api.recordAttestation(forecast.id, {
        attestationUid: result.uid,
        txHash: result.txHash,
        chainId: 84532, // Base Sepolia
      });

      setAttestationUid(backendResult.attestation.uid);
      onAttestationComplete?.();
    } catch (err) {
      setAttestError(err instanceof Error ? err.message : 'Failed to create attestation');
    } finally {
      setIsAttesting(false);
    }
  };

  return (
    <div className="ascii-box p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">
            {forecast.unifiedMarket.question}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            {formatDate(forecast.createdAt)}
            {!forecast.isPublic && (
              <span className="ml-2 text-[hsl(var(--warning))]">[PRIVATE]</span>
            )}
            {attestationUid && (
              <a
                href={getAttestationUrl(attestationUid, 84532)}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-[hsl(var(--info))] hover:underline"
              >
                [ATTESTED]
              </a>
            )}
          </div>
        </div>

        {/* Probability Badge */}
        <div className="text-right">
          <div className="text-2xl font-bold text-[hsl(var(--primary))]">
            {(forecast.probability * 100).toFixed(0)}%
          </div>
          <div className={`text-xs ${hasPositiveEdge ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'}`}>
            Edge: {edge >= 0 ? '+' : ''}{(edge * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3">
        <div className="ascii-box p-2">
          <div className="text-[hsl(var(--muted-foreground))]">MARKET</div>
          <div className="font-mono">
            {forecast.marketYesPrice !== null
              ? (forecast.marketYesPrice * 100).toFixed(0)
              : '--'}%
          </div>
        </div>
        <div className="ascii-box p-2">
          <div className="text-[hsl(var(--muted-foreground))]">CONF</div>
          <div className="font-mono">{(forecast.confidence * 100).toFixed(0)}%</div>
        </div>
        <div className="ascii-box p-2">
          <div className="text-[hsl(var(--muted-foreground))]">KELLY</div>
          <div className="font-mono">{(forecast.kellyFraction * 100).toFixed(0)}%</div>
        </div>
        <div className="ascii-box p-2">
          <div className="text-[hsl(var(--muted-foreground))]">SIZE</div>
          <div className="font-mono">
            {forecast.recommendedSize !== null
              ? (forecast.recommendedSize * 100).toFixed(1)
              : '--'}%
          </div>
        </div>
      </div>

      {/* Commit Message */}
      {forecast.commitMessage && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left"
        >
          <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1 flex items-center justify-between">
            <span>REASONING</span>
            <span>{isExpanded ? '[-]' : '[+]'}</span>
          </div>
          <div className={`text-sm ${isExpanded ? '' : 'truncate'}`}>
            {forecast.commitMessage}
          </div>
        </button>
      )}

      {/* Attest Button */}
      {!attestationUid && !forecast.unifiedMarket.resolution && (
        <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
          <button
            onClick={handleAttest}
            disabled={isAttesting || isEASLoading}
            className="w-full text-xs px-3 py-2 border border-[hsl(var(--info))] text-[hsl(var(--info))] hover:bg-[hsl(var(--info))] hover:text-[hsl(var(--background))] transition-colors disabled:opacity-50"
          >
            {isAttesting || isEASLoading
              ? 'SIGNING WITH WALLET...'
              : isConnected
                ? 'ATTEST ON-CHAIN (EAS)'
                : 'CONNECT WALLET TO ATTEST'}
          </button>
          {attestError && (
            <div className="text-xs text-[hsl(var(--error))] mt-2">{attestError}</div>
          )}
        </div>
      )}

      {/* Attestation Link */}
      {attestationUid && (
        <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
          <a
            href={getAttestationUrl(attestationUid, 84532)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[hsl(var(--info))] hover:underline flex items-center gap-1"
          >
            View on EAS Scan
            <span className="font-mono text-[10px] opacity-75">
              {attestationUid.slice(0, 10)}...
            </span>
          </a>
        </div>
      )}

      {/* Previous Forecast */}
      {forecast.previousForecast && (
        <div className="mt-3 pt-3 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
          Updated from {(forecast.previousForecast.probability * 100).toFixed(0)}%
          <span className={forecast.calculated?.priceChange && forecast.calculated.priceChange >= 0 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'}>
            {' '}({forecast.calculated?.priceChange && forecast.calculated.priceChange >= 0 ? '+' : ''}
            {((forecast.calculated?.priceChange ?? 0) * 100).toFixed(1)}%)
          </span>
        </div>
      )}

      {/* Market Status & Brier Score */}
      {forecast.unifiedMarket.resolution && (
        <ResolutionSection forecast={forecast} />
      )}
    </div>
  );
}

/**
 * Resolution section showing outcome and Brier score
 */
function ResolutionSection({ forecast }: { forecast: Forecast }) {
  const resolution = forecast.unifiedMarket.resolution;
  if (!resolution) return null;

  const brierScore = calculateBrierScore(forecast.probability, resolution);
  const isCorrect = (resolution.toUpperCase() === 'YES' && forecast.probability >= 0.5) ||
                   (resolution.toUpperCase() === 'NO' && forecast.probability < 0.5);

  // Interpret Brier score quality
  const getBrierQuality = (score: number): { label: string; color: string } => {
    if (score <= 0.1) return { label: 'Excellent', color: 'text-[hsl(var(--bullish))]' };
    if (score <= 0.2) return { label: 'Good', color: 'text-[hsl(var(--primary))]' };
    if (score <= 0.25) return { label: 'Average', color: 'text-[hsl(var(--muted-foreground))]' };
    if (score <= 0.4) return { label: 'Below Average', color: 'text-[hsl(var(--warning))]' };
    return { label: 'Poor', color: 'text-[hsl(var(--bearish))]' };
  };

  const brierQuality = brierScore !== null ? getBrierQuality(brierScore) : null;

  return (
    <div className="mt-3 pt-3 border-t border-[hsl(var(--border))] space-y-2">
      {/* Resolution Status */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold ${
          resolution.toUpperCase() === 'YES' ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'
        }`}>
          RESOLVED: {resolution.toUpperCase()}
        </span>
        <span className={`text-xs font-bold ${isCorrect ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'}`}>
          {isCorrect ? 'CORRECT' : 'INCORRECT'}
        </span>
      </div>

      {/* Brier Score */}
      {brierScore !== null && brierQuality && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-[hsl(var(--muted-foreground))]">
            Brier Score
            <Tooltip content={KELLY_TOOLTIPS.brierScore}>
              <InfoIcon />
            </Tooltip>
          </span>
          <span className={brierQuality.color}>
            {brierScore.toFixed(3)} ({brierQuality.label})
          </span>
        </div>
      )}

      {/* Detailed Breakdown */}
      <div className="text-xs text-[hsl(var(--muted-foreground))]">
        Your forecast: {(forecast.probability * 100).toFixed(0)}%
        {resolution.toUpperCase() === 'YES' ? ' YES' : ' NO'} |
        Actual: {resolution.toUpperCase()}
      </div>
    </div>
  );
}
