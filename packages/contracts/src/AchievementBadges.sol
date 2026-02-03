// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title AchievementBadges
 * @author Calibr.xyz Team
 * @notice Soulbound NFT badges for forecasting achievements (streak, accuracy, volume milestones)
 * @dev Non-transferable ERC-721 tokens. Each user can earn each achievement once.
 */
contract AchievementBadges is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    using Strings for uint256;

    // =============================================================================
    // Events
    // =============================================================================

    event AchievementMinted(
        address indexed recipient,
        uint256 indexed tokenId,
        string achievementId,
        uint256 value
    );

    event AchievementRegistered(string achievementId, string name, Category category);

    // =============================================================================
    // Errors
    // =============================================================================

    error SoulboundToken();
    error Unauthorized();
    error AchievementNotFound();
    error AchievementAlreadyExists();
    error AchievementAlreadyEarned();
    error AchievementNotActive();

    // =============================================================================
    // Types
    // =============================================================================

    enum Category {
        STREAK,
        ACCURACY,
        VOLUME,
        TIER,
        SPECIAL
    }

    struct AchievementDef {
        string name;
        string description;
        Category category;
        uint256 targetValue;
        bool active;
    }

    struct AchievementToken {
        string achievementId;
        uint256 value;
        uint256 awardedAt;
        bytes32 easUid;
    }

    // =============================================================================
    // State Variables
    // =============================================================================

    /// @notice Token counter
    uint256 private _tokenIdCounter;

    /// @notice Registered achievement definitions by ID
    mapping(string => AchievementDef) private _achievementDefs;

    /// @notice Track registered achievement IDs
    string[] private _achievementIds;

    /// @notice Token data by token ID
    mapping(uint256 => AchievementToken) private _tokens;

    /// @notice User's earned achievements: user => achievementId => tokenId
    mapping(address => mapping(string => uint256)) private _userAchievements;

    /// @notice User's achievement token list
    mapping(address => uint256[]) private _userTokens;

    /// @notice Authorized minters
    mapping(address => bool) public authorizedMinters;

    // =============================================================================
    // Category Display Info
    // =============================================================================

    mapping(Category => string) public categoryColors;
    mapping(Category => string) public categoryNames;

    // =============================================================================
    // Constructor
    // =============================================================================

    constructor(
        address initialOwner
    ) ERC721("Calibr Achievement Badge", "CALIBR-ACH") Ownable(initialOwner) {
        authorizedMinters[initialOwner] = true;

        categoryNames[Category.STREAK] = "Streak";
        categoryNames[Category.ACCURACY] = "Accuracy";
        categoryNames[Category.VOLUME] = "Volume";
        categoryNames[Category.TIER] = "Tier";
        categoryNames[Category.SPECIAL] = "Special";

        categoryColors[Category.STREAK] = "#ff6600";
        categoryColors[Category.ACCURACY] = "#00ff00";
        categoryColors[Category.VOLUME] = "#0088ff";
        categoryColors[Category.TIER] = "#ffaa00";
        categoryColors[Category.SPECIAL] = "#ff00ff";
    }

    // =============================================================================
    // Admin Functions
    // =============================================================================

    function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
        authorizedMinters[minter] = authorized;
    }

    /**
     * @notice Register a new achievement definition
     * @param achievementId Unique string ID (e.g., "streak-7")
     * @param name Display name
     * @param description Description
     * @param category Achievement category
     * @param targetValue Target value to unlock
     */
    function registerAchievement(
        string calldata achievementId,
        string calldata name,
        string calldata description,
        Category category,
        uint256 targetValue
    ) external onlyOwner {
        if (bytes(_achievementDefs[achievementId].name).length > 0) {
            revert AchievementAlreadyExists();
        }

        _achievementDefs[achievementId] = AchievementDef({
            name: name,
            description: description,
            category: category,
            targetValue: targetValue,
            active: true
        });

        _achievementIds.push(achievementId);

        emit AchievementRegistered(achievementId, name, category);
    }

    /**
     * @notice Activate or deactivate an achievement
     * @param achievementId Achievement ID
     * @param active Whether the achievement is active
     */
    function setAchievementActive(string calldata achievementId, bool active) external onlyOwner {
        if (bytes(_achievementDefs[achievementId].name).length == 0) {
            revert AchievementNotFound();
        }
        _achievementDefs[achievementId].active = active;
    }

    // =============================================================================
    // Minting Functions
    // =============================================================================

    /**
     * @notice Mint an achievement badge for a user
     * @param recipient User address
     * @param achievementId Achievement definition ID
     * @param value The achieved value
     * @param easUid EAS attestation UID
     * @return tokenId The minted token ID
     */
    function mintAchievement(
        address recipient,
        string calldata achievementId,
        uint256 value,
        bytes32 easUid
    ) external returns (uint256 tokenId) {
        if (!authorizedMinters[msg.sender]) revert Unauthorized();

        AchievementDef storage def = _achievementDefs[achievementId];
        if (bytes(def.name).length == 0) revert AchievementNotFound();
        if (!def.active) revert AchievementNotActive();
        if (_userAchievements[recipient][achievementId] != 0) revert AchievementAlreadyEarned();

        tokenId = ++_tokenIdCounter;
        _safeMint(recipient, tokenId);

        _tokens[tokenId] = AchievementToken({
            achievementId: achievementId,
            value: value,
            awardedAt: block.timestamp,
            easUid: easUid
        });

        _userAchievements[recipient][achievementId] = tokenId;
        _userTokens[recipient].push(tokenId);

        emit AchievementMinted(recipient, tokenId, achievementId, value);

        return tokenId;
    }

    // =============================================================================
    // View Functions
    // =============================================================================

    function getAchievementDef(
        string calldata achievementId
    ) external view returns (AchievementDef memory) {
        return _achievementDefs[achievementId];
    }

    function getAchievementToken(uint256 tokenId) external view returns (AchievementToken memory) {
        return _tokens[tokenId];
    }

    function hasAchievement(
        address user,
        string calldata achievementId
    ) external view returns (bool) {
        return _userAchievements[user][achievementId] != 0;
    }

    function getUserAchievements(address user) external view returns (uint256[] memory) {
        return _userTokens[user];
    }

    function getUserAchievementCount(address user) external view returns (uint256) {
        return _userTokens[user].length;
    }

    function getRegisteredAchievementCount() external view returns (uint256) {
        return _achievementIds.length;
    }

    // =============================================================================
    // Token URI (On-chain SVG)
    // =============================================================================

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(tokenId);

        AchievementToken memory token = _tokens[tokenId];
        AchievementDef memory def = _achievementDefs[token.achievementId];
        string memory catName = categoryNames[def.category];
        string memory catColor = categoryColors[def.category];

        string memory svg = _generateSVG(def.name, catName, catColor, token.value);

        string memory json = string(
            abi.encodePacked(
                '{"name": "Calibr Achievement: ',
                def.name,
                '", "description": "',
                def.description,
                '", "image": "data:image/svg+xml;base64,',
                Base64.encode(bytes(svg)),
                '", "attributes": [{"trait_type": "Category", "value": "',
                catName,
                '"}, {"trait_type": "Value", "value": ',
                token.value.toString(),
                '}, {"trait_type": "Achievement", "value": "',
                token.achievementId,
                '"}]}'
            )
        );

        return string(
            abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json)))
        );
    }

    function _generateSVG(
        string memory name,
        string memory catName,
        string memory catColor,
        uint256 value
    ) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
                '<rect width="400" height="400" fill="#000000"/>',
                '<circle cx="200" cy="160" r="80" fill="none" stroke="',
                catColor,
                '" stroke-width="3"/>',
                '<circle cx="200" cy="160" r="70" fill="none" stroke="',
                catColor,
                '" stroke-width="1" opacity="0.4"/>',
                '<text x="200" y="170" text-anchor="middle" font-family="monospace" font-size="36" fill="',
                catColor,
                '">',
                value.toString(),
                '</text>',
                '<text x="200" y="280" text-anchor="middle" font-family="monospace" font-size="18" fill="',
                catColor,
                '">',
                name,
                '</text>',
                '<text x="200" y="310" text-anchor="middle" font-family="monospace" font-size="14" fill="#888888">',
                catName,
                '</text>',
                '<text x="200" y="370" text-anchor="middle" font-family="monospace" font-size="11" fill="#008000">',
                'CALIBR.XYZ ACHIEVEMENT',
                '</text>',
                '</svg>'
            )
        );
    }

    // =============================================================================
    // Soulbound Override (Non-transferable)
    // =============================================================================

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);

        if (from != address(0) && to != address(0)) {
            revert SoulboundToken();
        }

        return super._update(to, tokenId, auth);
    }

    // =============================================================================
    // Required Overrides
    // =============================================================================

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
