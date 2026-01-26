# Calibr.xyz Privacy Options

## Overview

Calibr.xyz offers granular privacy controls for your forecasting activity. This guide explains each option and its implications.

## Privacy Settings

### Profile Visibility

Controls who can view your profile page.

| Setting | Description |
|---------|-------------|
| **Public** | Anyone can view your profile, forecasts, and stats |
| **Forecasters Only** | Only registered Calibr users can view |
| **Private** | Only you can view your profile |

### Show on Leaderboard

When enabled, your stats appear on public leaderboards. Your tier, Brier score, and forecast count are visible.

Disabling this:
- Removes you from public rankings
- Your position is not calculated
- You can still view leaderboards

### Show Wallet Address

Controls whether your Ethereum address is displayed publicly.

**Enabled**: Others can see your wallet address on your profile and attestations.

**Disabled**: Address is hidden, shown as "Anonymous Forecaster" or truncated.

### Default Forecast Privacy

Sets the default visibility for new forecasts.

| Setting | Description |
|---------|-------------|
| **Public** | Forecasts visible to anyone |
| **Private** | Only you can see your forecasts |

You can override this per-forecast.

### Share Reasoning Publicly

When enabled, your commit messages (reasoning) are visible with public forecasts.

**Enabled**: Others can read why you made each prediction.

**Disabled**: Reasoning hidden even on public forecasts.

## Forecast Privacy Levels

Each forecast can be set to:

### Public Forecasts

- Visible on your public profile
- Counted in leaderboard rankings
- Can be attested on-chain
- Reasoning visible (if setting enabled)

### Private Forecasts

- Only visible to you
- Still contribute to your calibration stats
- Cannot be attested on-chain
- Not included in public leaderboard calculations

## EAS Attestation Privacy

On-chain attestations have three modes:

### On-Chain Public

- Fully visible on blockchain explorers
- Permanent and immutable
- Anyone can verify

### Off-Chain Public

- Stored on EAS servers, not blockchain
- Lower gas costs
- Can be revoked
- Still publicly verifiable via EAS API

### Off-Chain Private (Merkle Tree)

- Only hash stored publicly
- You control who can verify
- Selective disclosure possible
- Highest privacy level

## GDPR Rights

### Data Export (Article 20)

Export all your data at any time:

```
Settings > Privacy > Export My Data
```

Includes:
- Profile information
- All forecasts (public and private)
- Positions and transactions
- Attestations
- Privacy settings

Format: JSON file with machine-readable structure.

### Right to Erasure (Article 17)

Request deletion of your data:

```
Settings > Privacy > Delete My Data
```

**Deletion Types:**

| Type | What's Deleted | What Remains |
|------|----------------|--------------|
| **Full Account** | Everything | Nothing |
| **Forecasts Only** | All forecasts, calibration data | Account, wallet connections |
| **PII Only** | Name, email, wallet labels | Forecasts (anonymized) |

**Important Notes:**

1. **On-chain attestations cannot be deleted** - they are immutable by design. They can be revoked (marked as invalid) but not removed.

2. **Processing time**: Deletion may take several minutes to hours depending on attestation count.

3. **Irreversible**: Full account deletion cannot be undone.

## Data Retention

| Data Type | Retention Period | Notes |
|-----------|------------------|-------|
| Active forecasts | Indefinite | Until market resolves |
| Resolved forecasts | 5 years | For calibration history |
| Transaction logs | 7 years | Regulatory compliance |
| On-chain attestations | Permanent | Immutable by design |
| Session data | 30 days | Auto-deleted |
| Error logs | 90 days | For debugging |

## Third-Party Data Sharing

Calibr.xyz shares data with:

### Platform Integrations

When connecting to Polymarket, Kalshi, etc.:
- Your positions are synced
- Trades are recorded locally
- We don't share your Calibr data back

### Blockchain Networks

When creating attestations:
- Data is published to EAS contracts
- Visible on Base network
- Transaction history is public

### Analytics (Optional)

If you opt-in to analytics:
- Anonymized usage patterns
- No personal forecasts
- Helps improve the platform

## Security Recommendations

### Wallet Security

- Use a hardware wallet for high-value attestations
- Consider a separate wallet for Calibr activity
- Never share private keys

### Privacy-Conscious Usage

1. **Use private forecasts** for sensitive predictions
2. **Disable reasoning sharing** if you don't want analysis visible
3. **Use off-chain private attestations** for maximum privacy
4. **Review your profile** from a logged-out browser

### Account Recovery

Your account is tied to your wallet. Losing wallet access means:
- You cannot update forecasts
- You cannot revoke attestations
- You cannot delete your account

Keep wallet recovery phrases secure.

## FAQ

**Q: Can I make my forecast history completely private?**

A: Yes. Set profile visibility to Private and default forecast privacy to Private. Existing public forecasts can be made private individually.

**Q: Will my old public forecasts become private if I change settings?**

A: No. Visibility settings only affect new forecasts. Update individual forecasts to change their visibility.

**Q: Can someone link my wallet to my Calibr activity?**

A: If you've created on-chain attestations, yes. The attestation records include your wallet address. Use off-chain private attestations for anonymity.

**Q: What happens to my leaderboard position if I go private?**

A: You're removed from public rankings. Your internal stats continue tracking.

**Q: Can I delete a single forecast?**

A: Yes, unless it has an on-chain attestation. Navigate to the forecast and click Delete.

**Q: How do I revoke an attestation?**

A: Navigate to the forecast, click "Revoke Attestation". This marks it as revoked on-chain but doesn't delete it.

## Contact

For privacy concerns or data requests:

- Email: privacy@calibr.xyz
- Response time: 48-72 hours
