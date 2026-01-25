'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useEASAttestation, type SelectiveDisclosureProof } from '@/hooks/useEASAttestation';
import { getAttestationUrl, SCHEMA_UIDS } from '@/lib/eas';
import { useChainId } from 'wagmi';
import { decodeAbiParameters, parseAbiParameters, type Address } from 'viem';

interface AttestationDetails {
  uid: Address;
  schema: Address;
  time: bigint;
  expirationTime: bigint;
  revocationTime: bigint;
  refUID: Address;
  recipient: Address;
  attester: Address;
  revocable: boolean;
  data: `0x${string}`;
  isValid: boolean;
  schemaName: string;
  decodedData?: Record<string, unknown>;
}

export default function VerifyPage() {
  const [uidInput, setUidInput] = useState('');
  const [attestation, setAttestation] = useState<AttestationDetails | null>(null);
  const [proofInput, setProofInput] = useState('');
  const [proofVerificationResult, setProofVerificationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getAttestation, isAttestationValid, verifyProof } = useEASAttestation();
  const chainId = useChainId();

  const getSchemaName = useCallback((schemaUid: Address): string => {
    const schemas = chainId === 84532 ? SCHEMA_UIDS.baseSepolia : SCHEMA_UIDS.base;

    if (schemaUid === schemas.forecast) return 'CalibrForecast';
    if (schemaUid === schemas.calibration) return 'CalibrCalibrationScore';
    if (schemaUid === schemas.identity) return 'CalibrIdentity';
    if (schemaUid === schemas.superforecaster) return 'CalibrSuperforecaster';
    if (schemaUid === schemas.reputation) return 'CalibrReputation';
    if (schemaUid === schemas.privateData) return 'CalibrPrivateData';
    return 'Unknown';
  }, [chainId]);

  const decodeAttestationData = useCallback((schema: Address, data: `0x${string}`): Record<string, unknown> | undefined => {
    const schemaName = getSchemaName(schema);

    try {
      if (schemaName === 'CalibrForecast') {
        const [probability, marketId, platform, confidence, reasoning, isPublic] = decodeAbiParameters(
          parseAbiParameters('uint256, string, string, uint256, string, bool'),
          data
        );
        return {
          probability: Number(probability),
          marketId,
          platform,
          confidence: Number(confidence),
          reasoning,
          isPublic,
        };
      }

      if (schemaName === 'CalibrPrivateData') {
        const [merkleRoot, dataType, fieldCount] = decodeAbiParameters(
          parseAbiParameters('bytes32, string, uint256'),
          data
        );
        return {
          merkleRoot,
          dataType,
          fieldCount: Number(fieldCount),
        };
      }

      if (schemaName === 'CalibrCalibrationScore') {
        const [brierScore, forecastCount, accuracy, resolvedCount, timestamp] = decodeAbiParameters(
          parseAbiParameters('uint256, uint256, uint256, uint256, uint256'),
          data
        );
        return {
          brierScore: Number(brierScore) / 10000,
          forecastCount: Number(forecastCount),
          accuracy: Number(accuracy) / 100,
          resolvedCount: Number(resolvedCount),
          timestamp: Number(timestamp),
        };
      }

      return undefined;
    } catch {
      return undefined;
    }
  }, [getSchemaName]);

  const handleLookup = async () => {
    if (!uidInput.trim()) {
      setError('Please enter an attestation UID');
      return;
    }

    // Validate UID format
    const uid = uidInput.trim();
    if (!uid.startsWith('0x') || uid.length !== 66) {
      setError('Invalid UID format. Must be a 32-byte hex string (0x + 64 characters)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAttestation(null);

    try {
      const result = await getAttestation(uid as Address);

      if (!result) {
        setError('Attestation not found. It may not exist or you may be on the wrong network.');
        return;
      }

      const isValid = await isAttestationValid(uid as Address);
      const schemaName = getSchemaName(result.schema);
      const decodedData = decodeAttestationData(result.schema, result.data);

      setAttestation({
        ...result,
        isValid,
        schemaName,
        decodedData,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lookup attestation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyProof = () => {
    if (!proofInput.trim()) {
      setProofVerificationResult({
        isValid: false,
        message: 'Please enter a proof JSON',
      });
      return;
    }

    try {
      const proof = JSON.parse(proofInput) as SelectiveDisclosureProof;

      if (!proof.merkleRoot || !proof.revealedFields) {
        setProofVerificationResult({
          isValid: false,
          message: 'Invalid proof format. Must include merkleRoot and revealedFields.',
        });
        return;
      }

      const isValid = verifyProof(proof);

      setProofVerificationResult({
        isValid,
        message: isValid
          ? `Proof verified! ${proof.revealedFields.length} field(s) validated.`
          : 'Proof verification failed. The proof does not match the merkle root.',
      });
    } catch {
      setProofVerificationResult({
        isValid: false,
        message: 'Invalid JSON format. Please check your proof input.',
      });
    }
  };

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]">
            [&lt;- HOME]
          </Link>
          <h1 className="text-2xl font-bold">ATTESTATION VERIFICATION</h1>
        </div>

        {/* Description */}
        <div className="ascii-box p-4 mb-8 bg-[hsl(var(--accent))]">
          <p className="text-sm">
            Verify on-chain attestations from the Ethereum Attestation Service (EAS).
            Enter an attestation UID to look up its details, or verify a selective disclosure proof.
          </p>
        </div>

        {/* UID Lookup Section */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4">[LOOKUP ATTESTATION]</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
                ATTESTATION UID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={uidInput}
                  onChange={(e) => setUidInput(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 bg-transparent border border-[hsl(var(--border))] px-3 py-2 font-mono text-sm focus:border-[hsl(var(--primary))] focus:outline-none"
                />
                <button
                  onClick={handleLookup}
                  disabled={isLoading}
                  className="px-4 py-2 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'LOOKING UP...' : 'LOOKUP'}
                </button>
              </div>
            </div>

            {error && (
              <div className="ascii-box p-3 border-[hsl(var(--bearish))]">
                <div className="text-[hsl(var(--bearish))] text-sm">{error}</div>
              </div>
            )}

            {attestation && (
              <div className="ascii-box p-4 space-y-4">
                {/* Validity Status */}
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${attestation.isValid ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'}`}>
                    {attestation.isValid ? '[VALID]' : '[INVALID/REVOKED]'}
                  </span>
                  <a
                    href={getAttestationUrl(attestation.uid, chainId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[hsl(var(--info))] hover:underline"
                  >
                    View on EAS Scan
                  </a>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">SCHEMA</div>
                    <div className="text-sm font-mono">{attestation.schemaName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">TIMESTAMP</div>
                    <div className="text-sm font-mono">{formatTimestamp(attestation.time)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">ATTESTER</div>
                    <div className="text-sm font-mono">{shortenAddress(attestation.attester)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">RECIPIENT</div>
                    <div className="text-sm font-mono">{shortenAddress(attestation.recipient)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">REVOCABLE</div>
                    <div className="text-sm font-mono">{attestation.revocable ? 'Yes' : 'No'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">REVOCATION TIME</div>
                    <div className="text-sm font-mono">
                      {attestation.revocationTime > 0n
                        ? formatTimestamp(attestation.revocationTime)
                        : 'Not revoked'}
                    </div>
                  </div>
                </div>

                {/* Decoded Data */}
                {attestation.decodedData && (
                  <div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mb-2">DECODED DATA</div>
                    <div className="bg-[hsl(var(--accent))] p-3 font-mono text-xs overflow-x-auto">
                      <pre>{JSON.stringify(attestation.decodedData, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {/* Raw Data */}
                <div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mb-2">RAW DATA</div>
                  <div className="bg-[hsl(var(--accent))] p-3 font-mono text-xs break-all">
                    {attestation.data}
                  </div>
                </div>

                {/* Schema UID */}
                <div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">SCHEMA UID</div>
                  <div className="font-mono text-xs break-all">{attestation.schema}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Selective Disclosure Proof Verification */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4">[VERIFY SELECTIVE DISCLOSURE PROOF]</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
                PROOF JSON
              </label>
              <textarea
                value={proofInput}
                onChange={(e) => setProofInput(e.target.value)}
                placeholder='{"merkleRoot": "0x...", "revealedFields": [...]}'
                className="w-full bg-transparent border border-[hsl(var(--border))] px-3 py-2 font-mono text-sm focus:border-[hsl(var(--primary))] focus:outline-none min-h-[150px] resize-y"
              />
            </div>

            <button
              onClick={handleVerifyProof}
              className="px-4 py-2 border border-[hsl(var(--info))] text-[hsl(var(--info))] hover:bg-[hsl(var(--info))] hover:text-[hsl(var(--info-foreground))] transition-colors"
            >
              VERIFY PROOF
            </button>

            {proofVerificationResult && (
              <div className={`ascii-box p-3 ${
                proofVerificationResult.isValid
                  ? 'border-[hsl(var(--bullish))]'
                  : 'border-[hsl(var(--bearish))]'
              }`}>
                <div className={`text-sm ${
                  proofVerificationResult.isValid
                    ? 'text-[hsl(var(--bullish))]'
                    : 'text-[hsl(var(--bearish))]'
                }`}>
                  {proofVerificationResult.message}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Example Proof Format */}
        <section>
          <h2 className="text-lg font-bold mb-4">[PROOF FORMAT REFERENCE]</h2>

          <div className="ascii-box p-4 bg-[hsl(var(--accent))]">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
              Selective disclosure proofs allow verifying specific fields from a Merkle tree attestation
              without revealing all data. Format:
            </p>
            <pre className="font-mono text-xs overflow-x-auto">
{`{
  "merkleRoot": "0x...",
  "revealedFields": [
    {
      "name": "probability",
      "value": 75,
      "proof": ["0x...", "0x...", "0x..."]
    },
    {
      "name": "marketId",
      "value": "market-123",
      "proof": ["0x...", "0x...", "0x..."]
    }
  ]
}`}
            </pre>
          </div>
        </section>

        {/* Network Info */}
        <div className="mt-8 text-xs text-[hsl(var(--muted-foreground))]">
          Connected to: {chainId === 8453 ? 'Base Mainnet' : chainId === 84532 ? 'Base Sepolia' : `Chain ${chainId}`}
        </div>
      </div>
    </main>
  );
}
