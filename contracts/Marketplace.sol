// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Marketplace
 * @dev Marketplace for trading Character NFTs
 * Supports payments in CHS tokens or native currency (MNT)
 */
contract Marketplace is Ownable, ReentrancyGuard {
    // Reference to CharacterNFT contract
    IERC721 public characterNFT;
    
    // Reference to CHSToken contract (can be address(0) if not set)
    IERC20 public chsToken;
    
    // Listing structure
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        address paymentToken; // address(0) for native currency (MNT), CHS address for CHS tokens
        bool active;
        uint256 createdAt;
    }
    
    // Mapping from listing ID to Listing
    mapping(uint256 => Listing) public listings;
    
    // Counter for listing IDs
    uint256 private _listingIdCounter;
    
    // Marketplace fee (in basis points, e.g., 250 = 2.5%)
    uint256 public feeBasisPoints;
    
    // Fee recipient address
    address public feeRecipient;
    
    // Events
    event NFTListed(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price,
        address paymentToken
    );
    
    event NFTSold(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        address buyer,
        uint256 price,
        address paymentToken
    );
    
    event ListingCancelled(uint256 indexed listingId, uint256 indexed tokenId);
    
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    
    /**
     * @dev Constructor
     * @param _characterNFT Address of CharacterNFT contract
     * @param _chsToken Address of CHSToken contract (can be address(0))
     * @param _feeBasisPoints Marketplace fee in basis points (e.g., 250 = 2.5%)
     * @param _feeRecipient Address to receive marketplace fees
     */
    constructor(
        address _characterNFT,
        address _chsToken,
        uint256 _feeBasisPoints,
        address _feeRecipient
    ) Ownable(msg.sender) {
        require(_characterNFT != address(0), "Marketplace: CharacterNFT address required");
        require(_feeRecipient != address(0), "Marketplace: Fee recipient required");
        require(_feeBasisPoints <= 1000, "Marketplace: Fee cannot exceed 10%");
        
        characterNFT = IERC721(_characterNFT);
        chsToken = IERC20(_chsToken);
        feeBasisPoints = _feeBasisPoints;
        feeRecipient = _feeRecipient;
        _listingIdCounter = 1;
    }
    
    /**
     * @dev Lists an NFT for sale
     * @param tokenId Token ID to list
     * @param price Price in payment token
     * @param paymentToken Address of payment token (address(0) for native currency)
     */
    function listNFT(
        uint256 tokenId,
        uint256 price,
        address paymentToken
    ) external nonReentrant {
        require(characterNFT.ownerOf(tokenId) == msg.sender, "Marketplace: Not NFT owner");
        require(price > 0, "Marketplace: Price must be greater than 0");
        require(
            paymentToken == address(0) || paymentToken == address(chsToken),
            "Marketplace: Invalid payment token"
        );
        
        // Transfer NFT to marketplace (contract holds it until sold)
        characterNFT.transferFrom(msg.sender, address(this), tokenId);
        
        // Create listing
        uint256 listingId = _listingIdCounter;
        _listingIdCounter++;
        
        listings[listingId] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            paymentToken: paymentToken,
            active: true,
            createdAt: block.timestamp
        });
        
        emit NFTListed(listingId, tokenId, msg.sender, price, paymentToken);
    }
    
    /**
     * @dev Buys an NFT from a listing
     * @param listingId Listing ID to purchase
     */
    function buyNFT(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Marketplace: Listing not active");
        require(listing.seller != msg.sender, "Marketplace: Cannot buy your own listing");
        
        // Calculate fees
        uint256 feeAmount = (listing.price * feeBasisPoints) / 10000;
        uint256 sellerAmount = listing.price - feeAmount;
        
        // Handle payment
        if (listing.paymentToken == address(0)) {
            // Native currency (MNT)
            require(msg.value >= listing.price, "Marketplace: Insufficient payment");
            
            // Transfer to seller
            (bool sellerSuccess, ) = payable(listing.seller).call{value: sellerAmount}("");
            require(sellerSuccess, "Marketplace: Failed to transfer to seller");
            
            // Transfer fee to fee recipient
            if (feeAmount > 0) {
                (bool feeSuccess, ) = payable(feeRecipient).call{value: feeAmount}("");
                require(feeSuccess, "Marketplace: Failed to transfer fee");
            }
            
            // Refund excess
            if (msg.value > listing.price) {
                (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - listing.price}("");
                require(refundSuccess, "Marketplace: Failed to refund excess");
            }
        } else {
            // CHS token payment
            require(msg.value == 0, "Marketplace: No native currency needed for token payment");
            require(chsToken.balanceOf(msg.sender) >= listing.price, "Marketplace: Insufficient CHS balance");
            require(chsToken.allowance(msg.sender, address(this)) >= listing.price, "Marketplace: Insufficient CHS allowance");
            
            // Transfer CHS from buyer to seller
            require(chsToken.transferFrom(msg.sender, listing.seller, sellerAmount), "Marketplace: Failed to transfer CHS to seller");
            
            // Transfer fee to fee recipient
            if (feeAmount > 0) {
                require(chsToken.transferFrom(msg.sender, feeRecipient, feeAmount), "Marketplace: Failed to transfer CHS fee");
            }
        }
        
        // Transfer NFT to buyer
        characterNFT.transferFrom(address(this), msg.sender, listing.tokenId);
        
        // Mark listing as inactive
        listing.active = false;
        
        emit NFTSold(listingId, listing.tokenId, listing.seller, msg.sender, listing.price, listing.paymentToken);
    }
    
    /**
     * @dev Cancels an active listing
     * @param listingId Listing ID to cancel
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Marketplace: Listing not active");
        require(listing.seller == msg.sender, "Marketplace: Not listing seller");
        
        // Transfer NFT back to seller
        characterNFT.transferFrom(address(this), msg.sender, listing.tokenId);
        
        // Mark listing as inactive
        listing.active = false;
        
        emit ListingCancelled(listingId, listing.tokenId);
    }
    
    /**
     * @dev Gets listing details
     * @param listingId Listing ID
     * @return Listing struct
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }
    
    /**
     * @dev Sets marketplace fee (owner only)
     * @param _feeBasisPoints New fee in basis points
     */
    function setFee(uint256 _feeBasisPoints) external onlyOwner {
        require(_feeBasisPoints <= 1000, "Marketplace: Fee cannot exceed 10%");
        uint256 oldFee = feeBasisPoints;
        feeBasisPoints = _feeBasisPoints;
        emit FeeUpdated(oldFee, _feeBasisPoints);
    }
    
    /**
     * @dev Sets fee recipient address (owner only)
     * @param _feeRecipient New fee recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Marketplace: Fee recipient cannot be zero address");
        address oldRecipient = feeRecipient;
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(oldRecipient, _feeRecipient);
    }
    
    /**
     * @dev Sets CHS token address (owner only)
     * @param _chsToken New CHS token address
     */
    function setCHSToken(address _chsToken) external onlyOwner {
        chsToken = IERC20(_chsToken);
    }
    
    /**
     * @dev Emergency function to recover NFTs stuck in contract (owner only)
     * @param tokenId Token ID to recover
     */
    function emergencyRecoverNFT(uint256 tokenId) external onlyOwner {
        // Only recover if not in an active listing
        bool inActiveListing = false;
        for (uint256 i = 1; i < _listingIdCounter; i++) {
            if (listings[i].tokenId == tokenId && listings[i].active) {
                inActiveListing = true;
                break;
            }
        }
        require(!inActiveListing, "Marketplace: NFT is in active listing");
        
        characterNFT.transferFrom(address(this), owner(), tokenId);
    }
}

