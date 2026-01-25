// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title SuperforecasterBadges
 * @author Calibr.xyz Team
 * @notice Soulbound NFT badges for superforecaster tier achievements
 * @dev Non-transferable ERC-721 tokens representing tier progression
 */
contract SuperforecasterBadges is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    using Strings for uint256;

    // =============================================================================
    // Events
    // =============================================================================

    event BadgeMinted(
        address indexed recipient,
        uint256 indexed tokenId,
        Tier tier,
        uint256 score,
        string category
    );

    event TierPromoted(
        address indexed user,
        Tier fromTier,
        Tier toTier,
        uint256 tokenId
    );

    // =============================================================================
    // Errors
    // =============================================================================

    error SoulboundToken();
    error Unauthorized();
    error AlreadyHasTier();
    error InvalidTier();

    // =============================================================================
    // Types
    // =============================================================================

    enum Tier {
        NONE,
        APPRENTICE,
        JOURNEYMAN,
        EXPERT,
        MASTER,
        GRANDMASTER
    }

    struct Badge {
        uint256 tokenId;
        Tier tier;
        uint256 score; // Brier score * 10000
        uint256 rank;
        string category;
        uint256 awardedAt;
        bytes32 easUid;
    }

    // =============================================================================
    // State Variables
    // =============================================================================

    /// @notice Token counter
    uint256 private _tokenIdCounter;

    /// @notice User's current tier badge
    mapping(address => uint256) public userCurrentBadge;

    /// @notice Badge data by token ID
    mapping(uint256 => Badge) public badges;

    /// @notice User's badge history
    mapping(address => uint256[]) public userBadgeHistory;

    /// @notice Authorized minters
    mapping(address => bool) public authorizedMinters;

    /// @notice Base URI for metadata
    string public baseTokenURI;

    // =============================================================================
    // Tier Colors and Info
    // =============================================================================

    mapping(Tier => string) public tierColors;
    mapping(Tier => string) public tierNames;
    mapping(Tier => string) public tierIcons;

    // =============================================================================
    // Constructor
    // =============================================================================

    constructor(
        address initialOwner
    ) ERC721("Calibr Superforecaster Badge", "CALIBR-SF") Ownable(initialOwner) {
        authorizedMinters[initialOwner] = true;

        // Set tier info
        tierNames[Tier.APPRENTICE] = "Apprentice";
        tierNames[Tier.JOURNEYMAN] = "Journeyman";
        tierNames[Tier.EXPERT] = "Expert";
        tierNames[Tier.MASTER] = "Master";
        tierNames[Tier.GRANDMASTER] = "Grandmaster";

        tierColors[Tier.APPRENTICE] = "#888888";
        tierColors[Tier.JOURNEYMAN] = "#cd7f32";
        tierColors[Tier.EXPERT] = "#c0c0c0";
        tierColors[Tier.MASTER] = "#ffd700";
        tierColors[Tier.GRANDMASTER] = "#00ffff";

        tierIcons[Tier.APPRENTICE] = unicode"🌱";
        tierIcons[Tier.JOURNEYMAN] = unicode"🎯";
        tierIcons[Tier.EXPERT] = unicode"🔮";
        tierIcons[Tier.MASTER] = unicode"🧠";
        tierIcons[Tier.GRANDMASTER] = unicode"👁️";
    }

    // =============================================================================
    // Admin Functions
    // =============================================================================

    function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
        authorizedMinters[minter] = authorized;
    }

    function setBaseURI(string calldata uri) external onlyOwner {
        baseTokenURI = uri;
    }

    // =============================================================================
    // Minting Functions
    // =============================================================================

    /**
     * @notice Mint a new badge for a user
     * @param recipient User address
     * @param tier The tier achieved
     * @param score Brier score (scaled by 10000)
     * @param rank Leaderboard rank
     * @param category Category (e.g., "GENERAL", "POLITICS")
     * @param easUid EAS attestation UID
     * @return tokenId The minted token ID
     */
    function mintBadge(
        address recipient,
        Tier tier,
        uint256 score,
        uint256 rank,
        string calldata category,
        bytes32 easUid
    ) external returns (uint256 tokenId) {
        if (!authorizedMinters[msg.sender]) revert Unauthorized();
        if (tier == Tier.NONE) revert InvalidTier();

        // Check if this is a promotion
        uint256 currentBadgeId = userCurrentBadge[recipient];
        Tier currentTier = Tier.NONE;
        if (currentBadgeId != 0) {
            currentTier = badges[currentBadgeId].tier;
            if (tier <= currentTier) revert AlreadyHasTier();
        }

        // Mint new badge
        tokenId = ++_tokenIdCounter;
        _safeMint(recipient, tokenId);

        badges[tokenId] = Badge({
            tokenId: tokenId,
            tier: tier,
            score: score,
            rank: rank,
            category: category,
            awardedAt: block.timestamp,
            easUid: easUid
        });

        userCurrentBadge[recipient] = tokenId;
        userBadgeHistory[recipient].push(tokenId);

        emit BadgeMinted(recipient, tokenId, tier, score, category);

        if (currentTier != Tier.NONE) {
            emit TierPromoted(recipient, currentTier, tier, tokenId);
        }

        return tokenId;
    }

    // =============================================================================
    // View Functions
    // =============================================================================

    /**
     * @notice Get user's current tier
     * @param user User address
     * @return Current tier
     */
    function getUserTier(address user) external view returns (Tier) {
        uint256 badgeId = userCurrentBadge[user];
        if (badgeId == 0) return Tier.NONE;
        return badges[badgeId].tier;
    }

    /**
     * @notice Get user's badge history
     * @param user User address
     * @return Array of token IDs
     */
    function getUserBadgeHistory(address user) external view returns (uint256[] memory) {
        return userBadgeHistory[user];
    }

    /**
     * @notice Get badge details
     * @param tokenId Token ID
     * @return Badge struct
     */
    function getBadge(uint256 tokenId) external view returns (Badge memory) {
        return badges[tokenId];
    }

    // =============================================================================
    // Token URI (On-chain SVG)
    // =============================================================================

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(tokenId);

        Badge memory badge = badges[tokenId];
        string memory tierName = tierNames[badge.tier];
        string memory tierColor = tierColors[badge.tier];
        string memory tierIcon = tierIcons[badge.tier];

        // Generate SVG
        string memory svg = _generateSVG(tierName, tierColor, tierIcon, badge.score, badge.rank);

        // Generate metadata JSON
        string memory json = string(
            abi.encodePacked(
                '{"name": "Calibr ',
                tierName,
                ' Badge #',
                tokenId.toString(),
                '", "description": "Superforecaster achievement badge for reaching ',
                tierName,
                ' tier on Calibr.xyz", "image": "data:image/svg+xml;base64,',
                Base64.encode(bytes(svg)),
                '", "attributes": [{"trait_type": "Tier", "value": "',
                tierName,
                '"}, {"trait_type": "Score", "value": ',
                (badge.score / 100).toString(),
                '}, {"trait_type": "Rank", "value": ',
                badge.rank.toString(),
                '}, {"trait_type": "Category", "value": "',
                badge.category,
                '"}]}'
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    function _generateSVG(
        string memory tierName,
        string memory tierColor,
        string memory tierIcon,
        uint256 score,
        uint256 rank
    ) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
                '<rect width="400" height="400" fill="#000000"/>',
                '<rect x="10" y="10" width="380" height="380" fill="none" stroke="',
                tierColor,
                '" stroke-width="2"/>',
                '<text x="200" y="100" text-anchor="middle" font-family="monospace" font-size="48" fill="',
                tierColor,
                '">',
                tierIcon,
                '</text>',
                '<text x="200" y="180" text-anchor="middle" font-family="monospace" font-size="24" fill="',
                tierColor,
                '">',
                tierName,
                '</text>',
                '<text x="200" y="240" text-anchor="middle" font-family="monospace" font-size="16" fill="#00ff00">',
                'Brier: 0.',
                _formatScore(score),
                '</text>',
                '<text x="200" y="280" text-anchor="middle" font-family="monospace" font-size="16" fill="#00ff00">',
                'Rank #',
                rank.toString(),
                '</text>',
                '<text x="200" y="360" text-anchor="middle" font-family="monospace" font-size="12" fill="#008000">',
                'CALIBR.XYZ SUPERFORECASTER',
                '</text>',
                '</svg>'
            )
        );
    }

    function _formatScore(uint256 score) internal pure returns (string memory) {
        // Convert score (e.g., 1500) to "15" for display as "0.15"
        return (score / 100).toString();
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

        // Allow minting (from == address(0)) but prevent transfers
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
