// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {ISchemaRegistry} from "@ethereum-attestation-service/eas-contracts/contracts/ISchemaRegistry.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/contracts/resolver/ISchemaResolver.sol";

/**
 * @title RegisterForecastSchemaScript
 * @notice Registers just the Forecast schema for testing on Base Sepolia
 * @dev Does not require a custom resolver - uses address(0)
 */
contract RegisterForecastSchemaScript is Script {
    // Base network Schema Registry address (predeploy)
    address constant SCHEMA_REGISTRY = 0x4200000000000000000000000000000000000020;

    // Forecast schema definition
    string constant FORECAST_SCHEMA =
        "uint256 probability,string marketId,string platform,uint256 confidence,string reasoning,bool isPublic";

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        console.log("Registering Forecast schema on Base Sepolia...");
        console.log("Schema Registry:", SCHEMA_REGISTRY);

        ISchemaRegistry schemaRegistry = ISchemaRegistry(SCHEMA_REGISTRY);

        vm.startBroadcast(deployerPrivateKey);

        // Register Forecast Schema with no resolver (address(0))
        bytes32 forecastSchemaUid = schemaRegistry.register(
            FORECAST_SCHEMA,
            ISchemaResolver(address(0)), // No custom resolver
            true // revocable
        );

        vm.stopBroadcast();

        console.log("");
        console.log("=== Schema Registration Complete ===");
        console.log("Schema:", FORECAST_SCHEMA);
        console.log("");
        console.log("FORECAST_SCHEMA_UID=");
        console.logBytes32(forecastSchemaUid);
        console.log("");
        console.log("Add this to your .env file!");
    }
}
