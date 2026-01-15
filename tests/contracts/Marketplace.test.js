const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", function () {
  let characterNFT;
  let chsToken;
  let marketplace;
  let owner;
  let seller;
  let buyer;
  let feeRecipient;

  const LISTING_PRICE = ethers.parseEther("1");
  const FEE_BASIS_POINTS = 250; // 2.5%

  beforeEach(async function () {
    [owner, seller, buyer, feeRecipient] = await ethers.getSigners();
    
    // Deploy CharacterNFT
    const CharacterNFT = await ethers.getContractFactory("CharacterNFT");
    characterNFT = await CharacterNFT.deploy(
      "Chessnoth Character",
      "CNFT",
      "ipfs://"
    );
    await characterNFT.waitForDeployment();
    
    // Deploy CHSToken
    const CHSToken = await ethers.getContractFactory("CHSToken");
    chsToken = await CHSToken.deploy(
      "Chessnoth Token",
      "CHS",
      ethers.parseEther("1000000"),
      ethers.parseEther("10000000")
    );
    await chsToken.waitForDeployment();
    
    // Deploy Marketplace
    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy(
      await characterNFT.getAddress(),
      await chsToken.getAddress(),
      FEE_BASIS_POINTS,
      feeRecipient.address
    );
    await marketplace.waitForDeployment();
    
    // Mint NFT to seller
    const mintPrice = await characterNFT.mintPrice();
    await characterNFT.connect(seller).mintCharacter(
      seller.address,
      "QmTest123",
      1,
      "Warrior",
      "TestWarrior",
      { value: mintPrice }
    );
    
    // Give buyer some CHS tokens
    await chsToken.addAuthorizedMinter(owner.address);
    await chsToken.mint(buyer.address, ethers.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await marketplace.owner()).to.equal(owner.address);
    });

    it("Should set correct contract addresses", async function () {
      expect(await marketplace.characterNFT()).to.equal(await characterNFT.getAddress());
      expect(await marketplace.chsToken()).to.equal(await chsToken.getAddress());
    });

    it("Should set correct fee", async function () {
      expect(await marketplace.feeBasisPoints()).to.equal(FEE_BASIS_POINTS);
    });

    it("Should set correct fee recipient", async function () {
      expect(await marketplace.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should reject deployment with zero CharacterNFT address", async function () {
      const Marketplace = await ethers.getContractFactory("Marketplace");
      await expect(
        Marketplace.deploy(
          ethers.ZeroAddress,
          await chsToken.getAddress(),
          FEE_BASIS_POINTS,
          feeRecipient.address
        )
      ).to.be.revertedWith("Marketplace: CharacterNFT address required");
    });

    it("Should reject deployment with zero fee recipient", async function () {
      const Marketplace = await ethers.getContractFactory("Marketplace");
      await expect(
        Marketplace.deploy(
          await characterNFT.getAddress(),
          await chsToken.getAddress(),
          FEE_BASIS_POINTS,
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("Marketplace: Fee recipient required");
    });

    it("Should reject deployment with fee > 10%", async function () {
      const Marketplace = await ethers.getContractFactory("Marketplace");
      await expect(
        Marketplace.deploy(
          await characterNFT.getAddress(),
          await chsToken.getAddress(),
          1001, // 10.01%
          feeRecipient.address
        )
      ).to.be.revertedWith("Marketplace: Fee cannot exceed 10%");
    });
  });

  describe("Listing NFTs", function () {
    it("Should list NFT for sale with native currency", async function () {
      // Approve marketplace
      await characterNFT.connect(seller).approve(await marketplace.getAddress(), 1);
      
      // List NFT
      const tx = await marketplace.connect(seller).listNFT(
        1,
        LISTING_PRICE,
        ethers.ZeroAddress // Native currency
      );
      
      await expect(tx)
        .to.emit(marketplace, "NFTListed")
        .withArgs(1, 1, seller.address, LISTING_PRICE, ethers.ZeroAddress);
      
      // Check listing
      const listing = await marketplace.getListing(1);
      expect(listing.tokenId).to.equal(1);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(LISTING_PRICE);
      expect(listing.paymentToken).to.equal(ethers.ZeroAddress);
      expect(listing.active).to.be.true;
      
      // NFT should be transferred to marketplace
      expect(await characterNFT.ownerOf(1)).to.equal(await marketplace.getAddress());
    });

    it("Should list NFT for sale with CHS token", async function () {
      await characterNFT.connect(seller).approve(await marketplace.getAddress(), 1);
      
      await marketplace.connect(seller).listNFT(
        1,
        LISTING_PRICE,
        await chsToken.getAddress()
      );
      
      const listing = await marketplace.getListing(1);
      expect(listing.paymentToken).to.equal(await chsToken.getAddress());
    });

    it("Should reject listing if not NFT owner", async function () {
      await expect(
        marketplace.connect(buyer).listNFT(
          1,
          LISTING_PRICE,
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("Marketplace: Not NFT owner");
    });

    it("Should reject listing with zero price", async function () {
      await characterNFT.connect(seller).approve(await marketplace.getAddress(), 1);
      
      await expect(
        marketplace.connect(seller).listNFT(
          1,
          0,
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("Marketplace: Price must be greater than 0");
    });

    it("Should reject listing with invalid payment token", async function () {
      await characterNFT.connect(seller).approve(await marketplace.getAddress(), 1);
      
      await expect(
        marketplace.connect(seller).listNFT(
          1,
          LISTING_PRICE,
          seller.address // Random address, not CHS token
        )
      ).to.be.revertedWith("Marketplace: Invalid payment token");
    });
  });

  describe("Buying NFTs with Native Currency", function () {
    beforeEach(async function () {
      await characterNFT.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
    });

    it("Should buy NFT with native currency", async function () {
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);
      
      const tx = await marketplace.connect(buyer).buyNFT(1, { value: LISTING_PRICE });
      
      await expect(tx)
        .to.emit(marketplace, "NFTSold")
        .withArgs(1, 1, seller.address, buyer.address, LISTING_PRICE, ethers.ZeroAddress);
      
      // Check NFT ownership
      expect(await characterNFT.ownerOf(1)).to.equal(buyer.address);
      
      // Check listing is inactive
      const listing = await marketplace.getListing(1);
      expect(listing.active).to.be.false;
      
      // Check balances
      const fee = (LISTING_PRICE * BigInt(FEE_BASIS_POINTS)) / 10000n;
      const sellerAmount = LISTING_PRICE - fee;
      
      expect(await ethers.provider.getBalance(seller.address)).to.equal(
        sellerBalanceBefore + sellerAmount
      );
      expect(await ethers.provider.getBalance(feeRecipient.address)).to.equal(
        feeRecipientBalanceBefore + fee
      );
    });

    it("Should refund excess payment", async function () {
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
      const excessAmount = ethers.parseEther("0.5");
      
      const tx = await marketplace.connect(buyer).buyNFT(1, { 
        value: LISTING_PRICE + excessAmount 
      });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // Buyer should only pay listing price + gas
      expect(await ethers.provider.getBalance(buyer.address)).to.be.closeTo(
        buyerBalanceBefore - LISTING_PRICE - gasUsed,
        ethers.parseEther("0.001") // Small tolerance for gas estimation
      );
    });

    it("Should reject buying with insufficient payment", async function () {
      await expect(
        marketplace.connect(buyer).buyNFT(1, { value: LISTING_PRICE - 1n })
      ).to.be.revertedWith("Marketplace: Insufficient payment");
    });

    it("Should reject buying inactive listing", async function () {
      await marketplace.connect(buyer).buyNFT(1, { value: LISTING_PRICE });
      
      await expect(
        marketplace.connect(seller).buyNFT(1, { value: LISTING_PRICE })
      ).to.be.revertedWith("Marketplace: Listing not active");
    });

    it("Should reject buying own listing", async function () {
      await expect(
        marketplace.connect(seller).buyNFT(1, { value: LISTING_PRICE })
      ).to.be.revertedWith("Marketplace: Cannot buy your own listing");
    });
  });

  describe("Buying NFTs with CHS Token", function () {
    beforeEach(async function () {
      await characterNFT.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).listNFT(
        1,
        LISTING_PRICE,
        await chsToken.getAddress()
      );
      
      // Approve marketplace to spend buyer's CHS
      await chsToken.connect(buyer).approve(await marketplace.getAddress(), LISTING_PRICE);
    });

    it("Should buy NFT with CHS tokens", async function () {
      const sellerBalanceBefore = await chsToken.balanceOf(seller.address);
      const feeRecipientBalanceBefore = await chsToken.balanceOf(feeRecipient.address);
      const buyerBalanceBefore = await chsToken.balanceOf(buyer.address);
      
      await marketplace.connect(buyer).buyNFT(1);
      
      // Check NFT ownership
      expect(await characterNFT.ownerOf(1)).to.equal(buyer.address);
      
      // Check CHS balances
      const fee = (LISTING_PRICE * BigInt(FEE_BASIS_POINTS)) / 10000n;
      const sellerAmount = LISTING_PRICE - fee;
      
      expect(await chsToken.balanceOf(seller.address)).to.equal(
        sellerBalanceBefore + sellerAmount
      );
      expect(await chsToken.balanceOf(feeRecipient.address)).to.equal(
        feeRecipientBalanceBefore + fee
      );
      expect(await chsToken.balanceOf(buyer.address)).to.equal(
        buyerBalanceBefore - LISTING_PRICE
      );
    });

    it("Should reject buying with insufficient CHS balance", async function () {
      // Burn most of buyer's tokens
      await chsToken.connect(buyer).burn(ethers.parseEther("999"));
      
      await expect(
        marketplace.connect(buyer).buyNFT(1)
      ).to.be.revertedWith("Marketplace: Insufficient CHS balance");
    });

    it("Should reject buying with insufficient CHS allowance", async function () {
      // Revoke approval
      await chsToken.connect(buyer).approve(await marketplace.getAddress(), 0);
      
      await expect(
        marketplace.connect(buyer).buyNFT(1)
      ).to.be.revertedWith("Marketplace: Insufficient CHS allowance");
    });

    it("Should reject sending native currency for CHS listing", async function () {
      await expect(
        marketplace.connect(buyer).buyNFT(1, { value: LISTING_PRICE })
      ).to.be.revertedWith("Marketplace: No native currency needed for token payment");
    });
  });

  describe("Cancelling Listings", function () {
    beforeEach(async function () {
      await characterNFT.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
    });

    it("Should cancel listing", async function () {
      const tx = await marketplace.connect(seller).cancelListing(1);
      
      await expect(tx)
        .to.emit(marketplace, "ListingCancelled")
        .withArgs(1, 1);
      
      // Check listing is inactive
      const listing = await marketplace.getListing(1);
      expect(listing.active).to.be.false;
      
      // NFT should be returned to seller
      expect(await characterNFT.ownerOf(1)).to.equal(seller.address);
    });

    it("Should reject cancelling if not seller", async function () {
      await expect(
        marketplace.connect(buyer).cancelListing(1)
      ).to.be.revertedWith("Marketplace: Not listing seller");
    });

    it("Should reject cancelling inactive listing", async function () {
      await marketplace.connect(seller).cancelListing(1);
      
      await expect(
        marketplace.connect(seller).cancelListing(1)
      ).to.be.revertedWith("Marketplace: Listing not active");
    });
  });

  describe("Fee Management", function () {
    it("Should allow owner to update fee", async function () {
      await marketplace.setFee(500); // 5%
      expect(await marketplace.feeBasisPoints()).to.equal(500);
    });

    it("Should emit FeeUpdated event", async function () {
      await expect(marketplace.setFee(500))
        .to.emit(marketplace, "FeeUpdated")
        .withArgs(FEE_BASIS_POINTS, 500);
    });

    it("Should reject fee > 10%", async function () {
      await expect(
        marketplace.setFee(1001)
      ).to.be.revertedWith("Marketplace: Fee cannot exceed 10%");
    });

    it("Should prevent non-owner from updating fee", async function () {
      await expect(
        marketplace.connect(seller).setFee(500)
      ).to.be.reverted;
    });
  });

  describe("Fee Recipient Management", function () {
    it("Should allow owner to update fee recipient", async function () {
      await marketplace.setFeeRecipient(buyer.address);
      expect(await marketplace.feeRecipient()).to.equal(buyer.address);
    });

    it("Should emit FeeRecipientUpdated event", async function () {
      await expect(marketplace.setFeeRecipient(buyer.address))
        .to.emit(marketplace, "FeeRecipientUpdated")
        .withArgs(feeRecipient.address, buyer.address);
    });

    it("Should reject zero address", async function () {
      await expect(
        marketplace.setFeeRecipient(ethers.ZeroAddress)
      ).to.be.revertedWith("Marketplace: Fee recipient cannot be zero address");
    });

    it("Should prevent non-owner from updating fee recipient", async function () {
      await expect(
        marketplace.connect(seller).setFeeRecipient(buyer.address)
      ).to.be.reverted;
    });
  });

  describe("Emergency Recovery", function () {
    it("Should allow owner to recover NFT not in active listing", async function () {
      // Mint another NFT and send directly to marketplace (simulating stuck NFT)
      await characterNFT.mintCharacter(
        owner.address,
        "QmTest456",
        1,
        "Mage",
        "TestMage"
      );
      await characterNFT.transferFrom(owner.address, await marketplace.getAddress(), 2);
      
      // Recover it
      await marketplace.emergencyRecoverNFT(2);
      expect(await characterNFT.ownerOf(2)).to.equal(owner.address);
    });

    it("Should reject recovering NFT in active listing", async function () {
      await characterNFT.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
      
      await expect(
        marketplace.emergencyRecoverNFT(1)
      ).to.be.revertedWith("Marketplace: NFT is in active listing");
    });

    it("Should prevent non-owner from recovering NFTs", async function () {
      await expect(
        marketplace.connect(seller).emergencyRecoverNFT(1)
      ).to.be.reverted;
    });
  });
});

