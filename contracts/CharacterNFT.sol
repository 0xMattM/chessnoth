// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CharacterNFT
 * @dev ERC-721 contract for character NFTs in the tactical RPG game
 * Supports minting, metadata updates, and ownership verification
 * Includes pausable functionality for emergency stops
 * Includes rate limiting to prevent spam minting
 */
contract CharacterNFT is ERC721Enumerable, Ownable, ReentrancyGuard, Pausable {
    // Mapping from token ID to IPFS hash
    mapping(uint256 => string) private _tokenURIs;
    
    // Mapping from token ID to generation
    mapping(uint256 => uint256) private _generations;
    
    // Mapping from token ID to class
    mapping(uint256 => string) private _classes;
    
    // Mapping from token ID to name
    mapping(uint256 => string) private _names;
    
    // Mapping from token ID to level
    mapping(uint256 => uint256) private _levels;
    
    // Mapping from token ID to experience points
    mapping(uint256 => uint256) private _experience;
    
    // Authorized minter address (game contract or backend)
    address public authorizedMinter;
    
    // Base URI for token metadata
    string private _baseTokenURI;
    
    // Counter for token IDs
    uint256 private _tokenIdCounter;
    
    // Rate limiting for minting (anti-spam)
    mapping(address => uint256) public lastMintTime;
    uint256 public constant MINT_COOLDOWN = 1 hours;
    
    // Events
    event CharacterMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string class,
        string name,
        uint256 generation,
        string ipfsHash
    );
    
    event CharacterLevelUp(
        uint256 indexed tokenId,
        uint256 oldLevel,
        uint256 newLevel,
        uint256 totalExperience
    );
    
    event CharacterUpgraded(
        uint256 indexed tokenId,
        uint256 expAdded,
        uint256 oldLevel,
        uint256 newLevel,
        uint256 totalExperience
    );
    
    event MetadataUpdated(
        uint256 indexed tokenId,
        string ipfsHash
    );
    
    /**
     * @dev Constructor
     * @param name Token name
     * @param symbol Token symbol
     * @param baseTokenURI Base URI for token metadata
     */
    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
        _tokenIdCounter = 1; // Start from 1
    }
    
    /**
     * @dev Sets the authorized minter address
     * @param minter Address that can mint NFTs
     */
    function setAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinter = minter;
    }
    
    /**
     * @dev Sets the base token URI
     * @param baseURI Base URI for token metadata
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    /**
     * @dev Mints a new character NFT
     * @param to Address to mint the NFT to
     * @param ipfsHash IPFS hash of the character metadata
     * @param generation Generation number of the character
     * @param class Character class name
     * @param name Character name
     * @return tokenId The ID of the newly minted token
     */
    function mintCharacter(
        address to,
        string memory ipfsHash,
        uint256 generation,
        string memory class,
        string memory name
    ) external whenNotPaused returns (uint256) {
        require(to != address(0), "CharacterNFT: Cannot mint to zero address");
        require(bytes(ipfsHash).length > 0, "CharacterNFT: IPFS hash required");
        require(bytes(class).length > 0, "CharacterNFT: Class required");
        require(bytes(name).length > 0, "CharacterNFT: Name required");
        
        // Rate limiting: prevent spam minting
        require(
            block.timestamp >= lastMintTime[msg.sender] + MINT_COOLDOWN,
            "CharacterNFT: Mint cooldown active"
        );
        lastMintTime[msg.sender] = block.timestamp;
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, ipfsHash);
        _generations[tokenId] = generation;
        _classes[tokenId] = class;
        _names[tokenId] = name;
        _levels[tokenId] = 1; // Start at level 1
        _experience[tokenId] = 0; // Start with 0 experience
        
        emit CharacterMinted(tokenId, to, class, name, generation, ipfsHash);
        
        return tokenId;
    }
    
    /**
     * @dev Updates the metadata URI for a token
     * @param tokenId Token ID to update
     * @param ipfsHash New IPFS hash
     */
    function updateMetadata(
        uint256 tokenId,
        string memory ipfsHash
    ) external {
        require(
            _isAuthorized(_ownerOf(tokenId), msg.sender, tokenId),
            "CharacterNFT: Not authorized to update"
        );
        require(bytes(ipfsHash).length > 0, "CharacterNFT: IPFS hash required");
        
        _setTokenURI(tokenId, ipfsHash);
        
        emit MetadataUpdated(tokenId, ipfsHash);
    }
    
    /**
     * @dev Upgrades a character by adding experience points
     * Automatically calculates new level based on experience (level = floor(EXP / 100) + 1)
     * @param tokenId Token ID to upgrade
     * @param expAmount Amount of experience to add
     */
    function upgradeCharacter(
        uint256 tokenId,
        uint256 expAmount
    ) external whenNotPaused {
        require(
            _isAuthorized(_ownerOf(tokenId), msg.sender, tokenId),
            "CharacterNFT: Not authorized to upgrade"
        );
        require(expAmount > 0, "CharacterNFT: Experience amount must be greater than 0");
        
        uint256 oldLevel = _levels[tokenId];
        
        // Add experience
        _experience[tokenId] += expAmount;
        
        // Calculate new level: level = floor(EXP / 100) + 1
        uint256 newLevel = (_experience[tokenId] / 100) + 1;
        
        // Update level if it increased
        bool leveledUp = newLevel > oldLevel;
        if (leveledUp) {
            _levels[tokenId] = newLevel;
            emit CharacterLevelUp(tokenId, oldLevel, newLevel, _experience[tokenId]);
        }
        
        // Emit upgrade event
        emit CharacterUpgraded(tokenId, expAmount, oldLevel, newLevel, _experience[tokenId]);
    }
    
    /**
     * @dev Updates metadata and emits level up event (kept for backward compatibility)
     * @param tokenId Token ID to update
     * @param newLevel New level of the character
     * @param ipfsHash New IPFS hash
     */
    function levelUpCharacter(
        uint256 tokenId,
        uint256 newLevel,
        string memory ipfsHash
    ) external {
        require(
            _isAuthorized(_ownerOf(tokenId), msg.sender, tokenId),
            "CharacterNFT: Not authorized to update"
        );
        require(bytes(ipfsHash).length > 0, "CharacterNFT: IPFS hash required");
        require(newLevel > _levels[tokenId], "CharacterNFT: New level must be higher than current level");
        
        uint256 oldLevel = _levels[tokenId];
        _levels[tokenId] = newLevel;
        _setTokenURI(tokenId, ipfsHash);
        
        emit CharacterLevelUp(tokenId, oldLevel, newLevel, _experience[tokenId]);
    }
    
    /**
     * @dev Sets experience points for a character (admin function)
     * @param tokenId Token ID to update
     * @param amount Amount of experience to set
     */
    function setExperience(
        uint256 tokenId,
        uint256 amount
    ) external {
        require(
            msg.sender == authorizedMinter || msg.sender == owner(),
            "CharacterNFT: Not authorized to set experience"
        );
        
        uint256 oldLevel = _levels[tokenId];
        _experience[tokenId] = amount;
        
        // Calculate new level: level = floor(EXP / 100) + 1
        uint256 newLevel = (_experience[tokenId] / 100) + 1;
        
        // Update level if it changed
        if (newLevel != oldLevel) {
            _levels[tokenId] = newLevel;
            emit CharacterLevelUp(tokenId, oldLevel, newLevel, _experience[tokenId]);
        }
        
        // Emit upgrade event
        emit CharacterUpgraded(tokenId, amount, oldLevel, newLevel, _experience[tokenId]);
    }
    
    /**
     * @dev Gets the generation of a token
     * @param tokenId Token ID
     * @return Generation number
     */
    function getGeneration(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "CharacterNFT: Token does not exist");
        return _generations[tokenId];
    }
    
    /**
     * @dev Gets the class of a token
     * @param tokenId Token ID
     * @return Class name
     */
    function getClass(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "CharacterNFT: Token does not exist");
        return _classes[tokenId];
    }
    
    /**
     * @dev Gets the name of a token
     * @param tokenId Token ID
     * @return Character name
     */
    function getName(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "CharacterNFT: Token does not exist");
        return _names[tokenId];
    }
    
    /**
     * @dev Gets the level of a token
     * @param tokenId Token ID
     * @return Level number
     */
    function getLevel(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "CharacterNFT: Token does not exist");
        return _levels[tokenId];
    }
    
    /**
     * @dev Gets the experience points of a token
     * @param tokenId Token ID
     * @return Experience points
     */
    function getExperience(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "CharacterNFT: Token does not exist");
        return _experience[tokenId];
    }
    
    /**
     * @dev Gets the IPFS hash for a token
     * @param tokenId Token ID
     * @return IPFS hash
     */
    function getTokenURI(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "CharacterNFT: Token does not exist");
        return _tokenURIs[tokenId];
    }
    
    /**
     * @dev Override tokenURI to return IPFS hash
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();
        
        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(base, _tokenURI));
        }
        // If there is a baseURI but no tokenURI, concatenate the tokenID to the baseURI.
        return string(abi.encodePacked(base, Strings.toString(tokenId)));
    }
    
    /**
     * @dev Sets the token URI for a token
     */
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal {
        _tokenURIs[tokenId] = _tokenURI;
    }
    
    /**
     * @dev Returns the base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Pauses all token transfers and minting
     * Can only be called by the contract owner
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpauses all token transfers and minting
     * Can only be called by the contract owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Override supportsInterface to include ERC721Enumerable
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev Override _update to include pausable check
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override whenNotPaused returns (address) {
        return super._update(to, tokenId, auth);
    }
}
