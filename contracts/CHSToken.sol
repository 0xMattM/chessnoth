// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CHSToken
 * @dev ERC20 token for Chessnoth game rewards and marketplace transactions
 * CHS (Chessnoth) tokens are earned through combat and can be used to:
 * - Purchase items
 * - Trade NFTs on the marketplace
 * - Upgrade characters (future feature)
 */
contract CHSToken is ERC20, Ownable, ReentrancyGuard {
    // Mapping of authorized minters (game contracts, backend, etc.)
    mapping(address => bool) public authorizedMinters;
    
    // Maximum supply (if needed, can be set to 0 for unlimited)
    uint256 public maxSupply;
    
    // Events
    event AuthorizedMinterAdded(address indexed minter);
    event AuthorizedMinterRemoved(address indexed minter);
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event MaxSupplyUpdated(uint256 oldMaxSupply, uint256 newMaxSupply);
    
    /**
     * @dev Constructor
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply to mint to owner
     * @param _maxSupply Maximum supply (0 for unlimited)
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 _maxSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        maxSupply = _maxSupply;
        
        // Mint initial supply to owner if provided
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }
    
    /**
     * @dev Adds an authorized minter address
     * @param minter Address that can mint tokens
     */
    function addAuthorizedMinter(address minter) external onlyOwner {
        require(minter != address(0), "CHSToken: Cannot add zero address");
        authorizedMinters[minter] = true;
        emit AuthorizedMinterAdded(minter);
    }
    
    /**
     * @dev Removes an authorized minter address
     * @param minter Address to remove from authorized minters
     */
    function removeAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit AuthorizedMinterRemoved(minter);
    }
    
    /**
     * @dev Mints tokens to a specified address
     * Anyone can call this function to mint tokens
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        require(to != address(0), "CHSToken: Cannot mint to zero address");
        require(amount > 0, "CHSToken: Amount must be greater than 0");
        
        // Check max supply if set
        if (maxSupply > 0) {
            require(totalSupply() + amount <= maxSupply, "CHSToken: Max supply exceeded");
        }
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    /**
     * @dev Burns tokens from the caller's balance
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        require(amount > 0, "CHSToken: Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "CHSToken: Insufficient balance");
        
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
    
    /**
     * @dev Burns tokens from a specified address (owner only)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) external onlyOwner {
        require(amount > 0, "CHSToken: Amount must be greater than 0");
        require(balanceOf(from) >= amount, "CHSToken: Insufficient balance");
        
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }
    
    /**
     * @dev Sets the maximum supply (owner only)
     * @param newMaxSupply New maximum supply (0 for unlimited)
     */
    function setMaxSupply(uint256 newMaxSupply) external onlyOwner {
        require(newMaxSupply == 0 || newMaxSupply >= totalSupply(), "CHSToken: Max supply must be >= current supply");
        uint256 oldMaxSupply = maxSupply;
        maxSupply = newMaxSupply;
        emit MaxSupplyUpdated(oldMaxSupply, newMaxSupply);
    }
}

