// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {ISchemaRegistry, SchemaRecord} from "@ethereum-attestation-service/eas-contracts/contracts/ISchemaRegistry.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/contracts/resolver/ISchemaResolver.sol";
import {CaliberEASResolver} from "../src/CaliberEASResolver.sol";
import {CaliberCore} from "../src/CaliberCore.sol";

/**
 * @title RegisterSchemasScript
 * @notice Registers Calibr.xyz EAS schemas on Base network
 * @dev Run this after deploying CaliberEASResolver
 */
contract RegisterSchemasScript is Script {
    // Base network Schema Registry address (predeploy)
    address constant SCHEMA_REGISTRY = 0x4200000000000000000000000000000000000020;

    // Schema definitions
    string constant FORECAST_SCHEMA =
        "uint256 probability,string marketId,string platform,uint256 confidence,string reasoning,bool isPublic";
    string constant CALIBRATION_SCHEMA =
        "uint256 brierScore,uint256 totalForecasts,uint256 timeWeightedScore,uint256 period,string category";
    string constant IDENTITY_SCHEMA =
        "string platform,string platformUserId,bytes32 proofHash,bool verified,uint256 verifiedAt";
    string constant SUPERFORECASTER_SCHEMA =
        "string tier,uint256 score,uint256 period,string category,uint256 rank";
    string constant REPUTATION_SCHEMA =
        "string platform,uint256 totalVolume,uint256 winRate,uint256 profitLoss,string verificationLevel";
    string constant PRIVATE_DATA_SCHEMA =
        "bytes32 merkleRoot,string dataType,uint256 fieldCount";

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address resolverAddress = vm.envAddress("RESOLVER_ADDRESS");
        address caliberCoreAddress = vm.envAddress("CALIBER_CORE_ADDRESS");

        console.log("Registering schemas with resolver:", resolverAddress);

        ISchemaRegistry schemaRegistry = ISchemaRegistry(SCHEMA_REGISTRY);

        vm.startBroadcast(deployerPrivateKey);

        // Register Forecast Schema (revocable)
        bytes32 forecastSchemaUid = schemaRegistry.register(
            FORECAST_SCHEMA,
            ISchemaResolver(resolverAddress),
            true // revocable
        );
        console.log("Forecast Schema UID:");
        console.logBytes32(forecastSchemaUid);

        // Register Calibration Schema (non-revocable - scores are permanent)
        bytes32 calibrationSchemaUid = schemaRegistry.register(
            CALIBRATION_SCHEMA,
            ISchemaResolver(resolverAddress),
            false // not revocable
        );
        console.log("Calibration Schema UID:");
        console.logBytes32(calibrationSchemaUid);

        // Register Identity Schema (revocable)
        bytes32 identitySchemaUid = schemaRegistry.register(
            IDENTITY_SCHEMA,
            ISchemaResolver(resolverAddress),
            true // revocable
        );
        console.log("Identity Schema UID:");
        console.logBytes32(identitySchemaUid);

        // Register Superforecaster Schema (non-revocable - badges are permanent)
        bytes32 superforecasterSchemaUid = schemaRegistry.register(
            SUPERFORECASTER_SCHEMA,
            ISchemaResolver(resolverAddress),
            false // not revocable
        );
        console.log("Superforecaster Schema UID:");
        console.logBytes32(superforecasterSchemaUid);

        // Register Reputation Schema (revocable)
        bytes32 reputationSchemaUid = schemaRegistry.register(
            REPUTATION_SCHEMA,
            ISchemaResolver(resolverAddress),
            true // revocable
        );
        console.log("Reputation Schema UID:");
        console.logBytes32(reputationSchemaUid);

        // Register Private Data Schema (revocable)
        bytes32 privateDataSchemaUid = schemaRegistry.register(
            PRIVATE_DATA_SCHEMA,
            ISchemaResolver(resolverAddress),
            true // revocable
        );
        console.log("Private Data Schema UID:");
        console.logBytes32(privateDataSchemaUid);

        // Update resolver with schema UIDs
        CaliberEASResolver resolver = CaliberEASResolver(payable(resolverAddress));
        resolver.setSchemaUids(
            forecastSchemaUid,
            calibrationSchemaUid,
            identitySchemaUid,
            superforecasterSchemaUid,
            reputationSchemaUid,
            privateDataSchemaUid
        );
        console.log("Schema UIDs set in resolver");

        // Update CaliberCore with schema UIDs
        CaliberCore caliberCore = CaliberCore(caliberCoreAddress);
        caliberCore.setSchemaUids(
            forecastSchemaUid,
            calibrationSchemaUid,
            identitySchemaUid,
            superforecasterSchemaUid
        );
        console.log("Schema UIDs set in CaliberCore");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Schema Registration Complete ===");
        console.log("FORECAST_SCHEMA_UID=");
        console.logBytes32(forecastSchemaUid);
        console.log("CALIBRATION_SCHEMA_UID=");
        console.logBytes32(calibrationSchemaUid);
        console.log("IDENTITY_SCHEMA_UID=");
        console.logBytes32(identitySchemaUid);
        console.log("SUPERFORECASTER_SCHEMA_UID=");
        console.logBytes32(superforecasterSchemaUid);
        console.log("REPUTATION_SCHEMA_UID=");
        console.logBytes32(reputationSchemaUid);
        console.log("PRIVATE_DATA_SCHEMA_UID=");
        console.logBytes32(privateDataSchemaUid);
    }
}
