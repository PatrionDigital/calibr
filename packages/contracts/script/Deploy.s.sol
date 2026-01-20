// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {CaliberCore} from "../src/CaliberCore.sol";
import {CaliberEASResolver} from "../src/CaliberEASResolver.sol";
import {IEAS} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

/**
 * @title DeployScript
 * @notice Deploys CaliberCore and CaliberEASResolver contracts
 *
 * Usage:
 *   # Deploy only (no verification)
 *   forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast
 *
 *   # Deploy with verification
 *   forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast --verify
 */
contract DeployScript is Script {
    // Base network EAS address (predeploy)
    address constant EAS_BASE = 0x4200000000000000000000000000000000000021;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts with deployer:", deployer);
        console.log("EAS address:", EAS_BASE);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy CaliberEASResolver
        CaliberEASResolver resolver = new CaliberEASResolver(
            IEAS(EAS_BASE),
            deployer
        );
        console.log("CaliberEASResolver deployed at:", address(resolver));

        // Deploy CaliberCore
        CaliberCore caliberCore = new CaliberCore(deployer);
        console.log("CaliberCore deployed at:", address(caliberCore));

        // Set resolver in CaliberCore
        caliberCore.setResolver(address(resolver));
        console.log("Resolver set in CaliberCore");

        // Authorize CaliberCore as an attester in the resolver
        resolver.grantRole(resolver.ATTESTER_ROLE(), address(caliberCore));
        console.log("CaliberCore authorized as attester");

        vm.stopBroadcast();

        // Output for .env update
        console.log("");
        console.log("=== Add to .env ===");
        console.log("RESOLVER_ADDRESS=", address(resolver));
        console.log("CALIBER_CORE_ADDRESS=", address(caliberCore));
        console.log("");
        console.log("=== Next Steps ===");
        console.log("1. Update .env with addresses above");
        console.log("2. Run: forge script script/RegisterSchemas.s.sol --rpc-url base-sepolia --broadcast");
    }
}
