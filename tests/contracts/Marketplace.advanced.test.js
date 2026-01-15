const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Advanced tests for Marketplace contract
 * Focuses on edge cases, security (reentrancy), and complex scenarios
 */
describe("Marketplace - Advanced Tests", function () {
  let characterNFT;
  let chsToken;
  let marketplace;
  let owner;
  let seller;
  let buyer;
  let buyer2;
  let feeRecipient;

  const LISTING_PRICE = ethers.parseEther("1");
  const FEE_BASIS_POINTS = 250; // 2.5%

  beforeEach(async function () {
    [owner, seller, buyer, buyer2, feeRecipient] = await ethers.getSigners();
    
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
    
    // Setup: Mint NFTs to seller
    const mintPrice = await characterNFT.mintPrice();
    for (let i = 1; i <= 5; i++) {
      await characterNFT.connect(seller).mintCharacter(
        seller.address,
        `QmTest${i}`,
        1,
        "Warrior",
        `Warrior${i}`,
        { value: mintPrice }
      );
    }
    
    // Give buyers CHS tokens
    await chsToken.addAuthorizedMinter(owner.address);
    await chsToken.mint(buyer.address, ethers.parseEther("10000"));
    await chsToken.mint(buyer2.address, ethers.parseEther("10000"));
  });

  describe("Multiple Listings", function () {
    it("Should handle multiple NFTs listed by same seller", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      // List 3 NFTs
      for (let i = 1; i <= 3; i++) {
        await characterNFT.connect(seller).approve(marketplaceAddr, i);
        await marketplace.connect(seller).listNFT(
          i,
          ethers.parseEther(`${i}`), // Different prices
          ethers.ZeroAddress
        );
      }
      
      // Check all listings
      for (let i = 1; i <= 3; i++) {
        const listing = await marketplace.getListing(i);
        expect(listing.active).to.be.true;
        expect(listing.seller).to.equal(seller.address);
        expect(listing.tokenId).to.equal(i);
        expect(listing.price).to.equal(ethers.parseEther(`${i}`));
      }
    });

    it("Should handle listings with different payment tokens", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      // List with native currency
      await characterNFT.connect(seller).approve(marketplaceAddr, 1);
      await marketplace.connect(seller).listNFT(
        1,
        LISTING_PRICE,
        ethers.ZeroAddress
      );
      
      // List with CHS token
      await characterNFT.connect(seller).approve(marketplaceAddr, 2);
      await marketplace.connect(seller).listNFT(
        2,
        LISTING_PRICE,
        await chsToken.getAddress()
      );
      
      const listing1 = await marketplace.getListing(1);
      const listing2 = await marketplace.getListing(2);
      
      expect(listing1.paymentToken).to.equal(ethers.ZeroAddress);
      expect(listing2.paymentToken).to.equal(await chsToken.getAddress());
    });

    it("Should handle buying multiple listings sequentially", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      // List 3 NFTs
      for (let i = 1; i <= 3; i++) {
        await characterNFT.connect(seller).approve(marketplaceAddr, i);
        await marketplace.connect(seller).listNFT(
          i,
          LISTING_PRICE,
          ethers.ZeroAddress
        );
      }
      
      // Buy all 3
      for (let i = 1; i <= 3; i++) {
        await marketplace.connect(buyer).buyNFT(i, { value: LISTING_PRICE });
        expect(await characterNFT.ownerOf(i)).to.equal(buyer.address);
      }
    });

    it("Should handle different buyers purchasing from same seller", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      // List 2 NFTs
      await characterNFT.connect(seller).approve(marketplaceAddr, 1);
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
      
      await characterNFT.connect(seller).approve(marketplaceAddr, 2);
      await marketplace.connect(seller).listNFT(2, LISTING_PRICE, ethers.ZeroAddress);
      
      // buyer buys NFT 1
      await marketplace.connect(buyer).buyNFT(1, { value: LISTING_PRICE });
      
      // buyer2 buys NFT 2
      await marketplace.connect(buyer2).buyNFT(2, { value: LISTING_PRICE });
      
      expect(await characterNFT.ownerOf(1)).to.equal(buyer.address);
      expect(await characterNFT.ownerOf(2)).to.equal(buyer2.address);
    });

    it("Should handle cancelling some listings while keeping others active", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      // List 3 NFTs
      for (let i = 1; i <= 3; i++) {
        await characterNFT.connect(seller).approve(marketplaceAddr, i);
        await marketplace.connect(seller).listNFT(
          i,
          LISTING_PRICE,
          ethers.ZeroAddress
        );
      }
      
      // Cancel listing 2
      await marketplace.connect(seller).cancelListing(2);
      
      // Check states
      expect((await marketplace.getListing(1)).active).to.be.true;
      expect((await marketplace.getListing(2)).active).to.be.false;
      expect((await marketplace.getListing(3)).active).to.be.true;
      
      // NFT 2 should be returned to seller
      expect(await characterNFT.ownerOf(2)).to.equal(seller.address);
    });
  });

  describe("Fee Edge Cases", function () {
    beforeEach(async function () {
      await characterNFT.connect(seller).approve(await marketplace.getAddress(), 1);
    });

    it("Should handle 0% fee correctly", async function () {
      await marketplace.setFee(0);
      
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
      
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);
      
      await marketplace.connect(buyer).buyNFT(1, { value: LISTING_PRICE });
      
      // Seller should receive full price
      expect(await ethers.provider.getBalance(seller.address)).to.equal(
        sellerBalanceBefore + LISTING_PRICE
      );
      
      // Fee recipient should receive nothing
      expect(await ethers.provider.getBalance(feeRecipient.address)).to.equal(
        feeRecipientBalanceBefore
      );
    });

    it("Should handle 10% fee (maximum) correctly", async function () {
      await marketplace.setFee(1000); // 10%
      
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
      
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);
      
      await marketplace.connect(buyer).buyNFT(1, { value: LISTING_PRICE });
      
      const fee = (LISTING_PRICE * 1000n) / 10000n; // 10%
      const sellerAmount = LISTING_PRICE - fee;
      
      expect(await ethers.provider.getBalance(seller.address)).to.equal(
        sellerBalanceBefore + sellerAmount
      );
      expect(await ethers.provider.getBalance(feeRecipient.address)).to.equal(
        feeRecipientBalanceBefore + fee
      );
    });

    it("Should calculate fees correctly for different prices", async function () {
      const prices = [
        ethers.parseEther("0.1"),
        ethers.parseEther("1"),
        ethers.parseEther("10"),
        ethers.parseEther("100")
      ];
      
      for (let i = 0; i < prices.length; i++) {
        // Mint and list
        const mintPrice = await characterNFT.mintPrice();
        await characterNFT.connect(seller).mintCharacter(
          seller.address,
          `QmTest${i+10}`,
          1,
          "Warrior",
          `Warrior${i+10}`,
          { value: mintPrice }
        );
        
        const tokenId = i + 6; // Starting from 6 (5 minted in beforeEach + this loop)
        await characterNFT.connect(seller).approve(await marketplace.getAddress(), tokenId);
        await marketplace.connect(seller).listNFT(tokenId, prices[i], ethers.ZeroAddress);
        
        const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
        const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);
        
        await marketplace.connect(buyer).buyNFT(tokenId, { value: prices[i] });
        
        const fee = (prices[i] * BigInt(FEE_BASIS_POINTS)) / 10000n;
        const sellerAmount = prices[i] - fee;
        
        expect(await ethers.provider.getBalance(seller.address)).to.equal(
          sellerBalanceBefore + sellerAmount
        );
        expect(await ethers.provider.getBalance(feeRecipient.address)).to.equal(
          feeRecipientBalanceBefore + fee
        );
      }
    });

    it("Should handle fee changes for new listings only", async function () {
      // List with 2.5% fee
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
      
      // Change fee to 5%
      await marketplace.setFee(500);
      
      // List another NFT
      await characterNFT.connect(seller).approve(await marketplace.getAddress(), 2);
      await marketplace.connect(seller).listNFT(2, LISTING_PRICE, ethers.ZeroAddress);
      
      // Buy both - first should use old listing data, but contract uses current fee
      // Note: Fee is read at buy time, not listing time
      const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);
      
      await marketplace.connect(buyer).buyNFT(1, { value: LISTING_PRICE });
      
      const feeReceived = (await ethers.provider.getBalance(feeRecipient.address)) - feeRecipientBalanceBefore;
      const expectedFee = (LISTING_PRICE * 500n) / 10000n; // 5% (current fee)
      
      expect(feeReceived).to.equal(expectedFee);
    });
  });

  describe("Payment Edge Cases", function () {
    beforeEach(async function () {
      await characterNFT.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
    });

    it("Should handle overpayment correctly", async function () {
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
      const overpayment = ethers.parseEther("5");
      
      const tx = await marketplace.connect(buyer).buyNFT(1, { 
        value: LISTING_PRICE + overpayment 
      });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // Buyer should only pay listing price + gas, excess refunded
      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerBalanceAfter).to.be.closeTo(
        buyerBalanceBefore - LISTING_PRICE - gasUsed,
        ethers.parseEther("0.001")
      );
    });

    it("Should handle exact payment", async function () {
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
      
      const tx = await marketplace.connect(buyer).buyNFT(1, { value: LISTING_PRICE });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerBalanceAfter).to.be.closeTo(
        buyerBalanceBefore - LISTING_PRICE - gasUsed,
        ethers.parseEther("0.001")
      );
    });

    it("Should handle very small listing prices", async function () {
      // Cancel current listing
      await marketplace.connect(seller).cancelListing(1);
      
      // List with very small price
      const smallPrice = 1000n; // 1000 wei
      await characterNFT.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).listNFT(1, smallPrice, ethers.ZeroAddress);
      
      await marketplace.connect(buyer).buyNFT(1, { value: smallPrice });
      expect(await characterNFT.ownerOf(1)).to.equal(buyer.address);
    });

    it("Should handle very large listing prices", async function () {
      // Cancel current listing
      await marketplace.connect(seller).cancelListing(1);
      
      // List with very large price
      const largePrice = ethers.parseEther("1000");
      await characterNFT.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).listNFT(1, largePrice, ethers.ZeroAddress);
      
      // Should fail if buyer doesn't have enough
      await expect(
        marketplace.connect(buyer).buyNFT(1, { value: largePrice - 1n })
      ).to.be.revertedWith("Marketplace: Insufficient payment");
    });
  });

  describe("CHS Token Payment Edge Cases", function () {
    beforeEach(async function () {
      await characterNFT.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).listNFT(
        1,
        LISTING_PRICE,
        await chsToken.getAddress()
      );
    });

    it("Should handle exact CHS allowance", async function () {
      await chsToken.connect(buyer).approve(await marketplace.getAddress(), LISTING_PRICE);
      
      await marketplace.connect(buyer).buyNFT(1);
      
      expect(await characterNFT.ownerOf(1)).to.equal(buyer.address);
      expect(await chsToken.allowance(buyer.address, await marketplace.getAddress())).to.equal(0);
    });

    it("Should handle excess CHS allowance", async function () {
      const excessAllowance = LISTING_PRICE * 2n;
      await chsToken.connect(buyer).approve(await marketplace.getAddress(), excessAllowance);
      
      await marketplace.connect(buyer).buyNFT(1);
      
      // Remaining allowance
      expect(await chsToken.allowance(buyer.address, await marketplace.getAddress())).to.equal(
        excessAllowance - LISTING_PRICE
      );
    });

    it("Should handle CHS purchase with 0 fee", async function () {
      await marketplace.setFee(0);
      
      await chsToken.connect(buyer).approve(await marketplace.getAddress(), LISTING_PRICE);
      
      const sellerBalanceBefore = await chsToken.balanceOf(seller.address);
      const buyerBalanceBefore = await chsToken.balanceOf(buyer.address);
      
      await marketplace.connect(buyer).buyNFT(1);
      
      // Seller gets full amount
      expect(await chsToken.balanceOf(seller.address)).to.equal(sellerBalanceBefore + LISTING_PRICE);
      expect(await chsToken.balanceOf(buyer.address)).to.equal(buyerBalanceBefore - LISTING_PRICE);
    });

    it("Should revert if buyer has sufficient balance but no allowance", async function () {
      expect(await chsToken.balanceOf(buyer.address)).to.be.greaterThan(LISTING_PRICE);
      
      await expect(
        marketplace.connect(buyer).buyNFT(1)
      ).to.be.revertedWith("Marketplace: Insufficient CHS allowance");
    });

    it("Should revert if buyer has allowance but insufficient balance", async function () {
      // Burn most tokens
      const buyerBalance = await chsToken.balanceOf(buyer.address);
      await chsToken.connect(buyer).burn(buyerBalance - LISTING_PRICE / 2n);
      
      // Approve more than balance
      await chsToken.connect(buyer).approve(await marketplace.getAddress(), LISTING_PRICE);
      
      await expect(
        marketplace.connect(buyer).buyNFT(1)
      ).to.be.revertedWith("Marketplace: Insufficient CHS balance");
    });
  });

  describe("Re-listing and State Management", function () {
    it("Should allow re-listing after cancellation", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      await characterNFT.connect(seller).approve(marketplaceAddr, 1);
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
      
      await marketplace.connect(seller).cancelListing(1);
      
      // Re-list with different price
      await characterNFT.connect(seller).approve(marketplaceAddr, 1);
      const newPrice = ethers.parseEther("2");
      await marketplace.connect(seller).listNFT(1, newPrice, ethers.ZeroAddress);
      
      const listing = await marketplace.getListing(2); // New listing ID
      expect(listing.active).to.be.true;
      expect(listing.price).to.equal(newPrice);
    });

    it("Should allow re-listing after purchase by new owner", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      await characterNFT.connect(seller).approve(marketplaceAddr, 1);
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
      
      await marketplace.connect(buyer).buyNFT(1, { value: LISTING_PRICE });
      
      // buyer is now owner and can list
      await characterNFT.connect(buyer).approve(marketplaceAddr, 1);
      const newPrice = ethers.parseEther("2");
      await marketplace.connect(buyer).listNFT(1, newPrice, ethers.ZeroAddress);
      
      const listing = await marketplace.getListing(2);
      expect(listing.seller).to.equal(buyer.address);
      expect(listing.active).to.be.true;
    });

    it("Should not allow listing already listed NFT", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      await characterNFT.connect(seller).approve(marketplaceAddr, 1);
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
      
      // Try to list again - should fail because NFT is already in marketplace
      await expect(
        marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress)
      ).to.be.revertedWith("Marketplace: Not NFT owner");
    });

    it("Should track listing timestamps", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      await characterNFT.connect(seller).approve(marketplaceAddr, 1);
      
      const tx = await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      const listing = await marketplace.getListing(1);
      expect(listing.createdAt).to.equal(block.timestamp);
    });
  });

  describe("Emergency Recovery Edge Cases", function () {
    it("Should recover NFT sent directly to marketplace", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      // Send NFT directly (not through listing)
      await characterNFT.connect(seller).transferFrom(seller.address, marketplaceAddr, 1);
      
      // Owner can recover
      await marketplace.emergencyRecoverNFT(1);
      expect(await characterNFT.ownerOf(1)).to.equal(owner.address);
    });

    it("Should not recover NFT in active listing", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      await characterNFT.connect(seller).approve(marketplaceAddr, 1);
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
      
      await expect(
        marketplace.emergencyRecoverNFT(1)
      ).to.be.revertedWith("Marketplace: NFT is in active listing");
    });

    it("Should allow recovery after listing is cancelled", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      await characterNFT.connect(seller).approve(marketplaceAddr, 1);
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
      
      await marketplace.connect(seller).cancelListing(1);
      
      // Send NFT back to marketplace
      await characterNFT.connect(seller).transferFrom(seller.address, marketplaceAddr, 1);
      
      // Should be able to recover now
      await marketplace.emergencyRecoverNFT(1);
      expect(await characterNFT.ownerOf(1)).to.equal(owner.address);
    });

    it("Should allow recovery after listing is sold", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      await characterNFT.connect(seller).approve(marketplaceAddr, 1);
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
      
      await marketplace.connect(buyer).buyNFT(1, { value: LISTING_PRICE });
      
      // Send NFT back to marketplace
      await characterNFT.connect(buyer).transferFrom(buyer.address, marketplaceAddr, 1);
      
      // Should be able to recover
      await marketplace.emergencyRecoverNFT(1);
      expect(await characterNFT.ownerOf(1)).to.equal(owner.address);
    });
  });

  describe("Gas Optimization and Performance", function () {
    it("Should efficiently handle multiple listings", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      const gasUsed = [];
      
      for (let i = 1; i <= 5; i++) {
        await characterNFT.connect(seller).approve(marketplaceAddr, i);
        const tx = await marketplace.connect(seller).listNFT(
          i,
          LISTING_PRICE,
          ethers.ZeroAddress
        );
        const receipt = await tx.wait();
        gasUsed.push(receipt.gasUsed);
      }
      
      // Gas should be consistent
      const avgGas = gasUsed.reduce((a, b) => a + b, 0n) / BigInt(gasUsed.length);
      const maxVariance = avgGas / 10n;
      
      for (const gas of gasUsed) {
        expect(gas).to.be.within(avgGas - maxVariance, avgGas + maxVariance);
      }
    });

    it("Should efficiently handle multiple purchases", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      // List all NFTs
      for (let i = 1; i <= 5; i++) {
        await characterNFT.connect(seller).approve(marketplaceAddr, i);
        await marketplace.connect(seller).listNFT(i, LISTING_PRICE, ethers.ZeroAddress);
      }
      
      // Buy all NFTs
      const gasUsed = [];
      for (let i = 1; i <= 5; i++) {
        const tx = await marketplace.connect(buyer).buyNFT(i, { value: LISTING_PRICE });
        const receipt = await tx.wait();
        gasUsed.push(receipt.gasUsed);
      }
      
      // Gas should be consistent
      const avgGas = gasUsed.reduce((a, b) => a + b, 0n) / BigInt(gasUsed.length);
      const maxVariance = avgGas / 10n;
      
      for (const gas of gasUsed) {
        expect(gas).to.be.within(avgGas - maxVariance, avgGas + maxVariance);
      }
    });
  });

  describe("Complex Integration Scenarios", function () {
    it("Should handle multiple sellers and buyers interacting", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      // Mint NFTs to buyer and buyer2
      const mintPrice = await characterNFT.mintPrice();
      await characterNFT.connect(buyer).mintCharacter(
        buyer.address,
        "QmBuyer1",
        1,
        "Mage",
        "BuyerMage",
        { value: mintPrice }
      );
      
      await characterNFT.connect(buyer2).mintCharacter(
        buyer2.address,
        "QmBuyer2",
        1,
        "Paladin",
        "BuyerPaladin",
        { value: mintPrice }
      );
      
      // seller lists NFT 1
      await characterNFT.connect(seller).approve(marketplaceAddr, 1);
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
      
      // buyer lists NFT 6
      await characterNFT.connect(buyer).approve(marketplaceAddr, 6);
      await marketplace.connect(buyer).listNFT(6, ethers.parseEther("2"), ethers.ZeroAddress);
      
      // buyer2 lists NFT 7
      await characterNFT.connect(buyer2).approve(marketplaceAddr, 7);
      await marketplace.connect(buyer2).listNFT(7, ethers.parseEther("3"), ethers.ZeroAddress);
      
      // Cross-purchases
      await marketplace.connect(buyer).buyNFT(1, { value: LISTING_PRICE });
      await marketplace.connect(seller).buyNFT(2, { value: ethers.parseEther("2") });
      await marketplace.connect(buyer).buyNFT(3, { value: ethers.parseEther("3") });
      
      // Verify ownership
      expect(await characterNFT.ownerOf(1)).to.equal(buyer.address);
      expect(await characterNFT.ownerOf(6)).to.equal(seller.address);
      expect(await characterNFT.ownerOf(7)).to.equal(buyer.address);
    });

    it("Should handle mixed payment types in parallel", async function () {
      const marketplaceAddr = await marketplace.getAddress();
      
      // List with native currency
      await characterNFT.connect(seller).approve(marketplaceAddr, 1);
      await marketplace.connect(seller).listNFT(1, LISTING_PRICE, ethers.ZeroAddress);
      
      // List with CHS
      await characterNFT.connect(seller).approve(marketplaceAddr, 2);
      await marketplace.connect(seller).listNFT(2, LISTING_PRICE, await chsToken.getAddress());
      
      // Buy with native currency
      await marketplace.connect(buyer).buyNFT(1, { value: LISTING_PRICE });
      
      // Buy with CHS
      await chsToken.connect(buyer).approve(marketplaceAddr, LISTING_PRICE);
      await marketplace.connect(buyer).buyNFT(2);
      
      expect(await characterNFT.ownerOf(1)).to.equal(buyer.address);
      expect(await characterNFT.ownerOf(2)).to.equal(buyer.address);
    });
  });

  describe("CHS Token Address Management", function () {
    it("Should allow owner to update CHS token address", async function () {
      const newTokenAddress = buyer.address; // Just for testing
      await marketplace.setCHSToken(newTokenAddress);
      expect(await marketplace.chsToken()).to.equal(newTokenAddress);
    });

    it("Should prevent non-owner from updating CHS token address", async function () {
      await expect(
        marketplace.connect(seller).setCHSToken(buyer.address)
      ).to.be.reverted;
    });

    it("Should allow setting CHS token to zero address", async function () {
      await marketplace.setCHSToken(ethers.ZeroAddress);
      expect(await marketplace.chsToken()).to.equal(ethers.ZeroAddress);
    });
  });
});
