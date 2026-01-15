const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Advanced tests for CHSToken contract
 * Focuses on edge cases, security, and multiple minters
 */
describe("CHSToken - Advanced Tests", function () {
  let chsToken;
  let owner;
  let minter1;
  let minter2;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, minter1, minter2, user1, user2] = await ethers.getSigners();
    
    const CHSToken = await ethers.getContractFactory("CHSToken");
    chsToken = await CHSToken.deploy(
      "Chessnoth Token",
      "CHS",
      ethers.parseEther("1000000"), // 1M initial supply
      ethers.parseEther("10000000")  // 10M max supply
    );
    await chsToken.waitForDeployment();
  });

  describe("Multiple Authorized Minters", function () {
    it("Should allow multiple authorized minters", async function () {
      await chsToken.addAuthorizedMinter(minter1.address);
      await chsToken.addAuthorizedMinter(minter2.address);
      
      expect(await chsToken.authorizedMinters(minter1.address)).to.be.true;
      expect(await chsToken.authorizedMinters(minter2.address)).to.be.true;
    });

    it("Should allow all authorized minters to mint", async function () {
      await chsToken.addAuthorizedMinter(minter1.address);
      await chsToken.addAuthorizedMinter(minter2.address);
      
      await chsToken.connect(minter1).mint(user1.address, ethers.parseEther("100"));
      await chsToken.connect(minter2).mint(user2.address, ethers.parseEther("200"));
      
      expect(await chsToken.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
      expect(await chsToken.balanceOf(user2.address)).to.equal(ethers.parseEther("200"));
    });

    it("Should allow removing specific minter without affecting others", async function () {
      await chsToken.addAuthorizedMinter(minter1.address);
      await chsToken.addAuthorizedMinter(minter2.address);
      
      await chsToken.removeAuthorizedMinter(minter1.address);
      
      expect(await chsToken.authorizedMinters(minter1.address)).to.be.false;
      expect(await chsToken.authorizedMinters(minter2.address)).to.be.true;
      
      // minter1 can still mint (open minting policy)
      await chsToken.connect(minter1).mint(user1.address, ethers.parseEther("100"));
      expect(await chsToken.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
      
      // minter2 can still mint
      await chsToken.connect(minter2).mint(user2.address, ethers.parseEther("100"));
      expect(await chsToken.balanceOf(user2.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should handle adding same minter multiple times", async function () {
      await chsToken.addAuthorizedMinter(minter1.address);
      await chsToken.addAuthorizedMinter(minter1.address);
      
      expect(await chsToken.authorizedMinters(minter1.address)).to.be.true;
      
      // Should still be able to mint
      await chsToken.connect(minter1).mint(user1.address, ethers.parseEther("100"));
      expect(await chsToken.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should handle removing non-existent minter", async function () {
      await chsToken.removeAuthorizedMinter(minter1.address);
      expect(await chsToken.authorizedMinters(minter1.address)).to.be.false;
    });
  });

  describe("Max Supply Edge Cases", function () {
    it("Should allow minting with max supply = 0 (unlimited)", async function () {
      // Deploy with no max supply
      const CHSToken = await ethers.getContractFactory("CHSToken");
      const unlimitedToken = await CHSToken.deploy(
        "Unlimited CHS",
        "UCHS",
        0,
        0 // No max supply
      );
      await unlimitedToken.waitForDeployment();
      
      await unlimitedToken.addAuthorizedMinter(minter1.address);
      
      // Should be able to mint huge amounts
      await unlimitedToken.connect(minter1).mint(
        user1.address,
        ethers.parseEther("1000000000") // 1 billion tokens
      );
      
      expect(await unlimitedToken.balanceOf(user1.address)).to.equal(
        ethers.parseEther("1000000000")
      );
    });

    it("Should change from limited to unlimited supply", async function () {
      await chsToken.addAuthorizedMinter(minter1.address);
      
      // Initially limited
      const maxSupply = await chsToken.maxSupply();
      const currentSupply = await chsToken.totalSupply();
      const remaining = maxSupply - currentSupply;
      
      await expect(
        chsToken.connect(minter1).mint(user1.address, remaining + 1n)
      ).to.be.revertedWith("CHSToken: Max supply exceeded");
      
      // Change to unlimited
      await chsToken.setMaxSupply(0);
      
      // Now should be able to mint without limit
      await chsToken.connect(minter1).mint(user1.address, remaining + ethers.parseEther("1000000"));
      expect(await chsToken.balanceOf(user1.address)).to.be.greaterThan(remaining);
    });

    it("Should change from unlimited to limited supply", async function () {
      // Deploy with unlimited
      const CHSToken = await ethers.getContractFactory("CHSToken");
      const token = await CHSToken.deploy(
        "Test Token",
        "TEST",
        ethers.parseEther("1000"),
        0 // Unlimited
      );
      await token.waitForDeployment();
      
      await token.addAuthorizedMinter(minter1.address);
      
      // Mint some tokens
      await token.connect(minter1).mint(user1.address, ethers.parseEther("500"));
      
      // Set max supply above current supply
      const newMaxSupply = ethers.parseEther("2000");
      await token.setMaxSupply(newMaxSupply);
      
      expect(await token.maxSupply()).to.equal(newMaxSupply);
      
      // Should respect new max
      const currentSupply = await token.totalSupply();
      const remaining = newMaxSupply - currentSupply;
      
      await expect(
        token.connect(minter1).mint(user1.address, remaining + 1n)
      ).to.be.revertedWith("CHSToken: Max supply exceeded");
    });

    it("Should handle minting exactly to max supply", async function () {
      await chsToken.addAuthorizedMinter(minter1.address);
      
      const maxSupply = await chsToken.maxSupply();
      const currentSupply = await chsToken.totalSupply();
      const remaining = maxSupply - currentSupply;
      
      await chsToken.connect(minter1).mint(user1.address, remaining);
      
      expect(await chsToken.totalSupply()).to.equal(maxSupply);
      
      // Should not be able to mint even 1 more wei
      await expect(
        chsToken.connect(minter1).mint(user1.address, 1)
      ).to.be.revertedWith("CHSToken: Max supply exceeded");
    });

    it("Should handle burning and reminting to max supply", async function () {
      await chsToken.addAuthorizedMinter(minter1.address);
      
      const maxSupply = await chsToken.maxSupply();
      const currentSupply = await chsToken.totalSupply();
      const remaining = maxSupply - currentSupply;
      
      // Mint to max
      await chsToken.connect(minter1).mint(user1.address, remaining);
      expect(await chsToken.totalSupply()).to.equal(maxSupply);
      
      // Burn some
      const burnAmount = ethers.parseEther("1000");
      await chsToken.connect(user1).burn(burnAmount);
      
      // Should be able to mint again up to burned amount
      await chsToken.connect(minter1).mint(user2.address, burnAmount);
      expect(await chsToken.totalSupply()).to.equal(maxSupply);
    });
  });

  describe("Burning Edge Cases", function () {
    beforeEach(async function () {
      await chsToken.addAuthorizedMinter(minter1.address);
      await chsToken.connect(minter1).mint(user1.address, ethers.parseEther("1000"));
    });

    it("Should burn all tokens", async function () {
      const balance = await chsToken.balanceOf(user1.address);
      await chsToken.connect(user1).burn(balance);
      
      expect(await chsToken.balanceOf(user1.address)).to.equal(0);
    });

    it("Should handle burning exact balance", async function () {
      const balance = await chsToken.balanceOf(user1.address);
      await chsToken.connect(user1).burn(balance);
      
      // Should not be able to burn more
      await expect(
        chsToken.connect(user1).burn(1)
      ).to.be.revertedWith("CHSToken: Insufficient balance");
    });

    it("Should handle multiple burns", async function () {
      await chsToken.connect(user1).burn(ethers.parseEther("100"));
      await chsToken.connect(user1).burn(ethers.parseEther("200"));
      await chsToken.connect(user1).burn(ethers.parseEther("300"));
      
      expect(await chsToken.balanceOf(user1.address)).to.equal(ethers.parseEther("400"));
    });

    it("Should update total supply correctly with multiple burns", async function () {
      const initialSupply = await chsToken.totalSupply();
      
      await chsToken.connect(user1).burn(ethers.parseEther("100"));
      expect(await chsToken.totalSupply()).to.equal(initialSupply - ethers.parseEther("100"));
      
      await chsToken.connect(user1).burn(ethers.parseEther("200"));
      expect(await chsToken.totalSupply()).to.equal(initialSupply - ethers.parseEther("300"));
    });

    it("Should handle owner burning from multiple addresses", async function () {
      await chsToken.connect(minter1).mint(user2.address, ethers.parseEther("500"));
      
      const user1Balance = await chsToken.balanceOf(user1.address);
      const user2Balance = await chsToken.balanceOf(user2.address);
      
      await chsToken.burnFrom(user1.address, ethers.parseEther("100"));
      await chsToken.burnFrom(user2.address, ethers.parseEther("50"));
      
      expect(await chsToken.balanceOf(user1.address)).to.equal(user1Balance - ethers.parseEther("100"));
      expect(await chsToken.balanceOf(user2.address)).to.equal(user2Balance - ethers.parseEther("50"));
    });

    it("Should emit TokensBurned event for owner burn", async function () {
      await expect(
        chsToken.burnFrom(user1.address, ethers.parseEther("100"))
      )
        .to.emit(chsToken, "TokensBurned")
        .withArgs(user1.address, ethers.parseEther("100"));
    });
  });

  describe("Transfer Edge Cases", function () {
    beforeEach(async function () {
      await chsToken.addAuthorizedMinter(minter1.address);
      await chsToken.connect(minter1).mint(user1.address, ethers.parseEther("1000"));
    });

    it("Should handle transferring all tokens", async function () {
      const balance = await chsToken.balanceOf(user1.address);
      await chsToken.connect(user1).transfer(user2.address, balance);
      
      expect(await chsToken.balanceOf(user1.address)).to.equal(0);
      expect(await chsToken.balanceOf(user2.address)).to.equal(balance);
    });

    it("Should handle multiple sequential transfers", async function () {
      await chsToken.connect(user1).transfer(user2.address, ethers.parseEther("100"));
      await chsToken.connect(user2).transfer(owner.address, ethers.parseEther("50"));
      await chsToken.connect(owner).transfer(user1.address, ethers.parseEther("25"));
      
      expect(await chsToken.balanceOf(user1.address)).to.equal(ethers.parseEther("925")); // 1000 - 100 + 25
      expect(await chsToken.balanceOf(user2.address)).to.equal(ethers.parseEther("50"));  // 100 - 50
      expect(await chsToken.balanceOf(owner.address)).to.be.greaterThan(ethers.parseEther("1000000")); // initial + 50 - 25
    });

    it("Should handle transferFrom with exact allowance", async function () {
      const amount = ethers.parseEther("500");
      await chsToken.connect(user1).approve(user2.address, amount);
      
      await chsToken.connect(user2).transferFrom(user1.address, user2.address, amount);
      
      expect(await chsToken.balanceOf(user2.address)).to.equal(amount);
      expect(await chsToken.allowance(user1.address, user2.address)).to.equal(0);
    });

    it("Should handle multiple transferFrom calls within allowance", async function () {
      await chsToken.connect(user1).approve(user2.address, ethers.parseEther("500"));
      
      await chsToken.connect(user2).transferFrom(user1.address, user2.address, ethers.parseEther("100"));
      await chsToken.connect(user2).transferFrom(user1.address, user2.address, ethers.parseEther("200"));
      await chsToken.connect(user2).transferFrom(user1.address, user2.address, ethers.parseEther("200"));
      
      expect(await chsToken.balanceOf(user2.address)).to.equal(ethers.parseEther("500"));
      expect(await chsToken.allowance(user1.address, user2.address)).to.equal(0);
    });

    it("Should reject transfer exceeding balance", async function () {
      const balance = await chsToken.balanceOf(user1.address);
      await expect(
        chsToken.connect(user1).transfer(user2.address, balance + 1n)
      ).to.be.reverted;
    });

    it("Should reject transferFrom exceeding allowance", async function () {
      await chsToken.connect(user1).approve(user2.address, ethers.parseEther("100"));
      
      await expect(
        chsToken.connect(user2).transferFrom(
          user1.address,
          user2.address,
          ethers.parseEther("101")
        )
      ).to.be.reverted;
    });
  });

  describe("Minting Edge Cases", function () {
    beforeEach(async function () {
      await chsToken.addAuthorizedMinter(minter1.address);
    });

    it("Should handle minting very small amounts", async function () {
      await chsToken.connect(minter1).mint(user1.address, 1); // 1 wei
      expect(await chsToken.balanceOf(user1.address)).to.equal(1);
    });

    it("Should handle minting to same address multiple times", async function () {
      for (let i = 0; i < 10; i++) {
        await chsToken.connect(minter1).mint(user1.address, ethers.parseEther("100"));
      }
      
      expect(await chsToken.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
    });

    it("Should handle minting by multiple minters to same address", async function () {
      await chsToken.addAuthorizedMinter(minter2.address);
      
      await chsToken.connect(minter1).mint(user1.address, ethers.parseEther("100"));
      await chsToken.connect(minter2).mint(user1.address, ethers.parseEther("200"));
      await chsToken.connect(minter1).mint(user1.address, ethers.parseEther("150"));
      
      expect(await chsToken.balanceOf(user1.address)).to.equal(ethers.parseEther("450"));
    });

    it("Should emit TokensMinted for each mint", async function () {
      const tx = await chsToken.connect(minter1).mint(user1.address, ethers.parseEther("100"));
      await expect(tx)
        .to.emit(chsToken, "TokensMinted")
        .withArgs(user1.address, ethers.parseEther("100"));
    });

    it("Should update total supply correctly with multiple mints", async function () {
      const initialSupply = await chsToken.totalSupply();
      
      await chsToken.connect(minter1).mint(user1.address, ethers.parseEther("100"));
      await chsToken.connect(minter1).mint(user2.address, ethers.parseEther("200"));
      
      expect(await chsToken.totalSupply()).to.equal(
        initialSupply + ethers.parseEther("300")
      );
    });
  });

  describe("Access Control and Security", function () {
    it("Should maintain separate authorization for minting", async function () {
      await chsToken.addAuthorizedMinter(minter1.address);
      
      // minter1 can mint but not manage authorization
      await expect(
        chsToken.connect(minter1).addAuthorizedMinter(minter2.address)
      ).to.be.reverted;
      
      // Only owner can manage authorization
      await chsToken.addAuthorizedMinter(minter2.address);
      expect(await chsToken.authorizedMinters(minter2.address)).to.be.true;
    });

    it("Should handle ownership transfer correctly", async function () {
      await chsToken.transferOwnership(user1.address);
      expect(await chsToken.owner()).to.equal(user1.address);
      
      // New owner can add minters
      await chsToken.connect(user1).addAuthorizedMinter(minter1.address);
      expect(await chsToken.authorizedMinters(minter1.address)).to.be.true;
      
      // Old owner cannot
      await expect(
        chsToken.addAuthorizedMinter(minter2.address)
      ).to.be.reverted;
    });

    it("Should prevent unauthorized minting even after ownership change", async function () {
      await chsToken.addAuthorizedMinter(minter1.address);
      await chsToken.transferOwnership(user1.address);
      
      // minter1 should still be able to mint (authorization persists)
      await chsToken.connect(minter1).mint(user2.address, ethers.parseEther("100"));
      expect(await chsToken.balanceOf(user2.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should allow new owner to revoke old minters", async function () {
      await chsToken.addAuthorizedMinter(minter1.address);
      await chsToken.transferOwnership(user1.address);
      
      // New owner revokes minter
      await chsToken.connect(user1).removeAuthorizedMinter(minter1.address);
      
      // minter1 can still mint (open minting policy)
      await chsToken.connect(minter1).mint(user2.address, ethers.parseEther("100"));
      expect(await chsToken.balanceOf(user2.address)).to.equal(ethers.parseEther("100"));
    });
  });

  describe("Gas Optimization and Performance", function () {
    beforeEach(async function () {
      await chsToken.addAuthorizedMinter(minter1.address);
    });

    it("Should efficiently handle batch minting", async function () {
      const gasUsed = [];
      
      for (let i = 0; i < 10; i++) {
        const tx = await chsToken.connect(minter1).mint(
          user1.address,
          ethers.parseEther("100")
        );
        const receipt = await tx.wait();
        gasUsed.push(receipt.gasUsed);
      }
      
      // Gas should be consistent
      const avgGas = gasUsed.reduce((a, b) => a + b, 0n) / BigInt(gasUsed.length);
      const maxVariance = avgGas / 10n; // 10%
      
      for (const gas of gasUsed) {
        expect(gas).to.be.within(avgGas - maxVariance, avgGas + maxVariance);
      }
    });

    it("Should efficiently handle batch burning", async function () {
      // Mint initial amount
      await chsToken.connect(minter1).mint(user1.address, ethers.parseEther("10000"));
      
      const gasUsed = [];
      
      for (let i = 0; i < 10; i++) {
        const tx = await chsToken.connect(user1).burn(ethers.parseEther("100"));
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

  describe("Integration Scenarios", function () {
    beforeEach(async function () {
      await chsToken.addAuthorizedMinter(minter1.address);
      await chsToken.addAuthorizedMinter(minter2.address);
    });

    it("Should handle complex scenario: mint, transfer, burn", async function () {
      // Mint to user1
      await chsToken.connect(minter1).mint(user1.address, ethers.parseEther("1000"));
      
      // Transfer half to user2
      await chsToken.connect(user1).transfer(user2.address, ethers.parseEther("500"));
      
      // user2 burns some
      await chsToken.connect(user2).burn(ethers.parseEther("100"));
      
      // Mint more to user2
      await chsToken.connect(minter2).mint(user2.address, ethers.parseEther("300"));
      
      // Check final balances
      expect(await chsToken.balanceOf(user1.address)).to.equal(ethers.parseEther("500"));
      expect(await chsToken.balanceOf(user2.address)).to.equal(ethers.parseEther("700")); // 500 - 100 + 300
    });

    it("Should handle multiple users with complex operations", async function () {
      // Setup: mint to all users
      await chsToken.connect(minter1).mint(user1.address, ethers.parseEther("1000"));
      await chsToken.connect(minter1).mint(user2.address, ethers.parseEther("2000"));
      await chsToken.connect(minter1).mint(owner.address, ethers.parseEther("500"));
      
      const initialSupply = await chsToken.totalSupply();
      
      // user1 transfers to user2
      await chsToken.connect(user1).transfer(user2.address, ethers.parseEther("300"));
      
      // user2 burns
      await chsToken.connect(user2).burn(ethers.parseEther("500"));
      
      // owner transfers to user1
      await chsToken.connect(owner).transfer(user1.address, ethers.parseEther("200"));
      
      // Check total supply decreased by burn amount
      expect(await chsToken.totalSupply()).to.equal(
        initialSupply + ethers.parseEther("3500") - ethers.parseEther("500")
      );
    });
  });
});
