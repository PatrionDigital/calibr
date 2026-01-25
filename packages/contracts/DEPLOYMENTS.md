# Calibr.xyz Contract Deployments

## Base Sepolia (Testnet) - Chain ID: 84532

Deployed: January 24, 2025 (v2 - with self-attestation support)

### Contracts

| Contract | Address | Verified |
|----------|---------|----------|
| CaliberEASResolver | `0x851c4d387bEdA98Bfa1696DdBBce0f221cc5805b` | ✓ |
| CaliberCore | `0xad329633048d053efeb4E47BB7679C31ba9F8968` | ✓ |

### EAS Schema UIDs

| Schema | UID | Revocable |
|--------|-----|-----------|
| Forecast | `0xbeebd6600cf48d34e814e0aa0feb1f2bebd547a972963796e03c14d1ab4ef5a1` | Yes |
| Calibration | `0xd44c6125a33083aec2cf763b785bc865b2bb4b837902289bbbd72dfb544ba579` | No |
| Identity | `0xc0b01a6619072a6bf30cc335a60774321d479a9c7f3ec4627df17fe679b33116` | Yes |
| Superforecaster | `0x524a06a27768fa90080629c6f1c750efb55c5903fca64be95a6623bfe4a4b248` | No |
| Reputation | `0x53f34419e628bd88263a78a89cb7be1c2097c67f21062b5a966d37e15249bbff` | Yes |
| Private Data | `0xa2ad56fdcf09f2db43e242b8b284e782ba5d4f539c7baf5a5bedfedc7080b02d` | Yes |

### EAS Predeploy Addresses (Base)

| Contract | Address |
|----------|---------|
| EAS | `0x4200000000000000000000000000000000000021` |
| Schema Registry | `0x4200000000000000000000000000000000000020` |

### Basescan Links

- [CaliberEASResolver](https://sepolia.basescan.org/address/0x851c4d387bEdA98Bfa1696DdBBce0f221cc5805b)
- [CaliberCore](https://sepolia.basescan.org/address/0xad329633048d053efeb4E47BB7679C31ba9F8968)

---

## Base Mainnet - Chain ID: 8453

**Status:** Not deployed (Phase 8)

---

## Deployment Commands

```bash
# Deploy contracts
forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast --verify

# Register schemas (after updating .env with contract addresses)
forge script script/RegisterSchemas.s.sol --rpc-url base-sepolia --broadcast
```
