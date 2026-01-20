# Calibr.ly Smart Contracts

## Framework
Foundry (forge, anvil, cast)

## Networks
- Base Mainnet (production)
- Base Sepolia (testnet)

## Key Contracts
- CaliberEASResolver.sol - Custom EAS schema resolver
- ForecastRegistry.sol - On-chain forecast management
- CALIBRToken.sol - ERC-20 with staking

## EAS Integration
EAS is a Base predeploy:
- EAS Contract: 0x4200000000000000000000000000000000000021
- Schema Registry: 0x4200000000000000000000000000000000000020

## Dependencies
- OpenZeppelin Contracts ^5.0.0
- EAS Contracts

## Testing
Always run `forge test -vvv` before commits
