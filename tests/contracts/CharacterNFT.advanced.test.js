const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Advanced tests for CharacterNFT contract
 * Focuses on edge cases, security, and pausable functionality
 */
describe("CharacterNFT - Advanced Tests", function () {
  let characterNFT;
  let owner;
  let addr1;
  let addr2;
  let addr3;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    const CharacterNFT = await ethers.getContractFactory("CharacterNFT");
    characterNFT = await CharacterNFT.deploy(
      "Chessnoth Character",
      "CNFT",
      "ipfs://"
    );
    await characterNFT.waitForDeployment();
  });

  describe("Mint Price and Payment", function () {
    it("Should have correct initial mint price", async function () {
      expect(await characterNFT.mintPrice()).to.equal(ethers.parseEther("5"));
    });

    it("Should allow owner to update mint price", async function () {
      const newPrice = ethers.parseEther("10");
      await characterNFT.setMintPrice(newPrice);
      expect(await characterNFT.mintPrice()).to.equal(newPrice);
    });

    it("Should prevent non-owner from updating mint price", async function () {
      await expect(
        characterNFT.connect(addr1).setMintPrice(ethers.parseEther("10"))
      ).to.be.reverted;
    });

    it("Should require payment for minting", async function () {
      const mintPrice = await characterNFT.mintPrice();
      
      await expect(
        characterNFT.connect(addr1).mintCharacter(
          addr1.address,
          "QmTest123",
          1,
          "Warrior",
          "TestWarrior",
          { value: mintPrice - 1n }
        )
      ).to.be.revertedWith("CharacterNFT: Insufficient payment");
    });

    it("Should mint successfully with exact payment", async function () {
      const mintPrice = await characterNFT.mintPrice();
      
      await characterNFT.connect(addr1).mintCharacter(
        addr1.address,
        "QmTest123",
        1,
        "Warrior",
        "TestWarrior",
        { value: mintPrice }
      );
      
      expect(await characterNFT.ownerOf(1)).to.equal(addr1.address);
    });

    it("Should mint successfully with overpayment", async function () {
      const mintPrice = await characterNFT.mintPrice();
      
      await characterNFT.connect(addr1).mintCharacter(
        addr1.address,
        "QmTest123",
        1,
        "Warrior",
        "TestWarrior",
        { value: mintPrice + ethers.parseEther("1") }
      );
      
      expect(await characterNFT.ownerOf(1)).to.equal(addr1.address);
    });

    it("Should transfer payment to owner", async function () {
      const mintPrice = await characterNFT.mintPrice();
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      await characterNFT.connect(addr1).mintCharacter(
        addr1.address,
        "QmTest123",
        1,
        "Warrior",
        "TestWarrior",
        { value: mintPrice }
      );
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + mintPrice);
    });

    it("Should handle multiple mints with payments", async function () {
      const mintPrice = await characterNFT.mintPrice();
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      await characterNFT.connect(addr1).mintCharacter(
        addr1.address,
        "QmTest1",
        1,
        "Warrior",
        "Warrior1",
        { value: mintPrice }
      );
      
      await characterNFT.connect(addr2).mintCharacter(
        addr2.address,
        "QmTest2",
        1,
        "Mage",
        "Mage1",
        { value: mintPrice }
      );
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + mintPrice * 2n);
    });
  });

  describe("Pausable Functionality", function () {
    it("Should allow owner to pause", async function () {
      await characterNFT.pause();
      expect(await characterNFT.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await characterNFT.pause();
      await characterNFT.unpause();
      expect(await characterNFT.paused()).to.be.false;
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(
        characterNFT.connect(addr1).pause()
      ).to.be.reverted;
    });

    it("Should prevent minting when paused", async function () {
      const mintPrice = await characterNFT.mintPrice();
      await characterNFT.pause();
      
      await expect(
        characterNFT.connect(addr1).mintCharacter(
          addr1.address,
          "QmTest123",
          1,
          "Warrior",
          "TestWarrior",
          { value: mintPrice }
        )
      ).to.be.reverted;
    });

    it("Should prevent upgrading when paused", async function () {
      const mintPrice = await characterNFT.mintPrice();
      await characterNFT.connect(addr1).mintCharacter(
        addr1.address,
        "QmTest123",
        1,
        "Warrior",
        "TestWarrior",
        { value: mintPrice }
      );
      
      await characterNFT.pause();
      
      await expect(
        characterNFT.connect(addr1).upgradeCharacter(1, 100)
      ).to.be.reverted;
    });

    it("Should prevent transfers when paused", async function () {
      const mintPrice = await characterNFT.mintPrice();
      await characterNFT.connect(addr1).mintCharacter(
        addr1.address,
        "QmTest123",
        1,
        "Warrior",
        "TestWarrior",
        { value: mintPrice }
      );
      
      await characterNFT.pause();
      
      await expect(
        characterNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 1)
      ).to.be.reverted;
    });

    it("Should allow operations after unpause", async function () {
      const mintPrice = await characterNFT.mintPrice();
      await characterNFT.pause();
      await characterNFT.unpause();
      
      await characterNFT.connect(addr1).mintCharacter(
        addr1.address,
        "QmTest123",
        1,
        "Warrior",
        "TestWarrior",
        { value: mintPrice }
      );
      
      expect(await characterNFT.ownerOf(1)).to.equal(addr1.address);
    });
  });

  describe("Level Calculation Edge Cases", function () {
    beforeEach(async function () {
      const mintPrice = await characterNFT.mintPrice();
      await characterNFT.connect(addr1).mintCharacter(
        addr1.address,
        "QmTest123",
        1,
        "Warrior",
        "TestWarrior",
        { value: mintPrice }
      );
    });

    it("Should handle level 1 at 0 EXP", async function () {
      expect(await characterNFT.getLevel(1)).to.equal(1);
      expect(await characterNFT.getExperience(1)).to.equal(0);
    });

    it("Should handle level 1 at 99 EXP", async function () {
      await characterNFT.connect(addr1).upgradeCharacter(1, 99);
      expect(await characterNFT.getLevel(1)).to.equal(1);
      expect(await characterNFT.getExperience(1)).to.equal(99);
    });

    it("Should handle exact level threshold (100 EXP = Level 2)", async function () {
      await characterNFT.connect(addr1).upgradeCharacter(1, 100);
      expect(await characterNFT.getLevel(1)).to.equal(2);
      expect(await characterNFT.getExperience(1)).to.equal(100);
    });

    it("Should handle large EXP amounts", async function () {
      await characterNFT.connect(addr1).upgradeCharacter(1, 10000);
      expect(await characterNFT.getLevel(1)).to.equal(101); // floor(10000/100) + 1
      expect(await characterNFT.getExperience(1)).to.equal(10000);
    });

    it("Should handle very large EXP (stress test)", async function () {
      const largeExp = 1000000; // 1 million EXP
      await characterNFT.connect(addr1).upgradeCharacter(1, largeExp);
      expect(await characterNFT.getLevel(1)).to.equal(10001); // floor(1000000/100) + 1
      expect(await characterNFT.getExperience(1)).to.equal(largeExp);
    });

    it("Should handle multiple small upgrades correctly", async function () {
      // Add 1 EXP at a time until level up
      for (let i = 0; i < 100; i++) {
        await characterNFT.connect(addr1).upgradeCharacter(1, 1);
      }
      expect(await characterNFT.getLevel(1)).to.equal(2);
      expect(await characterNFT.getExperience(1)).to.equal(100);
    });

    it("Should handle upgrades across multiple levels", async function () {
      await characterNFT.connect(addr1).upgradeCharacter(1, 50);  // Level 1, 50 EXP
      expect(await characterNFT.getLevel(1)).to.equal(1);
      
      await characterNFT.connect(addr1).upgradeCharacter(1, 100); // Level 2, 150 EXP
      expect(await characterNFT.getLevel(1)).to.equal(2);
      
      await characterNFT.connect(addr1).upgradeCharacter(1, 200); // Level 4, 350 EXP
      expect(await characterNFT.getLevel(1)).to.equal(4);
      expect(await characterNFT.getExperience(1)).to.equal(350);
    });
  });

  describe("SetExperience Function", function () {
    beforeEach(async function () {
      const mintPrice = await characterNFT.mintPrice();
      await characterNFT.connect(addr1).mintCharacter(
        addr1.address,
        "QmTest123",
        1,
        "Warrior",
        "TestWarrior",
        { value: mintPrice }
      );
    });

    it("Should allow owner to set experience", async function () {
      await characterNFT.setExperience(1, 500);
      expect(await characterNFT.getExperience(1)).to.equal(500);
      expect(await characterNFT.getLevel(1)).to.equal(6); // floor(500/100) + 1
    });

    it("Should allow authorized minter to set experience", async function () {
      await characterNFT.addAuthorizedMinter(addr2.address);
      await characterNFT.connect(addr2).setExperience(1, 300);
      expect(await characterNFT.getExperience(1)).to.equal(300);
      expect(await characterNFT.getLevel(1)).to.equal(4);
    });

    it("Should allow token owner to set experience", async function () {
      await characterNFT.connect(addr1).setExperience(1, 200);
      expect(await characterNFT.getExperience(1)).to.equal(200);
      expect(await characterNFT.getLevel(1)).to.equal(3);
    });

    it("Should prevent unauthorized addresses from setting experience", async function () {
      await expect(
        characterNFT.connect(addr2).setExperience(1, 200)
      ).to.be.revertedWith("CharacterNFT: Not authorized to set experience");
    });

    it("Should emit CharacterLevelUp when level changes", async function () {
      const tx = await characterNFT.setExperience(1, 200);
      await expect(tx)
        .to.emit(characterNFT, "CharacterLevelUp")
        .withArgs(1, 1, 3, 200);
    });

    it("Should emit CharacterUpgraded event", async function () {
      const tx = await characterNFT.setExperience(1, 200);
      await expect(tx)
        .to.emit(characterNFT, "CharacterUpgraded")
        .withArgs(1, 200, 1, 3, 200);
    });

    it("Should handle setting experience to 0", async function () {
      await characterNFT.connect(addr1).upgradeCharacter(1, 500);
      await characterNFT.setExperience(1, 0);
      expect(await characterNFT.getExperience(1)).to.equal(0);
      expect(await characterNFT.getLevel(1)).to.equal(1);
    });

    it("Should handle decreasing experience", async function () {
      await characterNFT.connect(addr1).upgradeCharacter(1, 500); // Level 6
      await characterNFT.setExperience(1, 200); // Level 3
      expect(await characterNFT.getExperience(1)).to.equal(200);
      expect(await characterNFT.getLevel(1)).to.equal(3);
    });
  });

  describe("Multiple NFT Operations", function () {
    it("Should handle minting multiple NFTs to same address", async function () {
      const mintPrice = await characterNFT.mintPrice();
      
      await characterNFT.connect(addr1).mintCharacter(
        addr1.address,
        "QmTest1",
        1,
        "Warrior",
        "Warrior1",
        { value: mintPrice }
      );
      
      await characterNFT.connect(addr1).mintCharacter(
        addr1.address,
        "QmTest2",
        1,
        "Mage",
        "Mage1",
        { value: mintPrice }
      );
      
      await characterNFT.connect(addr1).mintCharacter(
        addr1.address,
        "QmTest3",
        1,
        "Paladin",
        "Paladin1",
        { value: mintPrice }
      );
      
      expect(await characterNFT.balanceOf(addr1.address)).to.equal(3);
      expect(await characterNFT.getClass(1)).to.equal("Warrior");
      expect(await characterNFT.getClass(2)).to.equal("Mage");
      expect(await characterNFT.getClass(3)).to.equal("Paladin");
    });

    it("Should handle upgrading multiple NFTs", async function () {
      const mintPrice = await characterNFT.mintPrice();
      
      await characterNFT.connect(addr1).mintCharacter(
        addr1.address,
        "QmTest1",
        1,
        "Warrior",
        "Warrior1",
        { value: mintPrice }
      );
      
      await characterNFT.connect(addr1).mintCharacter(
        addr1.address,
        "QmTest2",
        1,
        "Mage",
        "Mage1",
        { value: mintPrice }
      );
      
      await characterNFT.connect(addr1).upgradeCharacter(1, 200);
      await characterNFT.connect(addr1).upgradeCharacter(2, 500);
      
      expect(await characterNFT.getLevel(1)).to.equal(3);
      expect(await characterNFT.getLevel(2)).to.equal(6);
    });

    it("Should enumerate all tokens correctly", async function () {
      const mintPrice = await characterNFT.mintPrice();
      
      for (let i = 0; i < 5; i++) {
        await characterNFT.connect(addr1).mintCharacter(
          addr1.address,
          `QmTest${i}`,
          1,
          "Warrior",
          `Warrior${i}`,
          { value: mintPrice }
        );
      }
      
      expect(await characterNFT.balanceOf(addr1.address)).to.equal(5);
      
      const tokens = [];
      for (let i = 0; i < 5; i++) {
        tokens.push(await characterNFT.tokenOfOwnerByIndex(addr1.address, i));
      }
      
      expect(tokens).to.deep.equal([1n, 2n, 3n, 4n, 5n]);
    });
  });

  describe("Metadata Management", function () {
    beforeEach(async function () {
      const mintPrice = await characterNFT.mintPrice();
      await characterNFT.connect(addr1).mintCharacter(
        addr1.address,
        "QmTest123",
        1,
        "Warrior",
        "TestWarrior",
        { value: mintPrice }
      );
    });

    it("Should allow owner to update metadata", async function () {
      await characterNFT.connect(addr1).updateMetadata(1, "QmNewHash");
      expect(await characterNFT.getTokenURI(1)).to.equal("QmNewHash");
    });

    it("Should emit MetadataUpdated event", async function () {
      const tx = await characterNFT.connect(addr1).updateMetadata(1, "QmNewHash");
      await expect(tx)
        .to.emit(characterNFT, "MetadataUpdated")
        .withArgs(1, "QmNewHash");
    });

    it("Should prevent non-owner from updating metadata", async function () {
      await expect(
        characterNFT.connect(addr2).updateMetadata(1, "QmNewHash")
      ).to.be.revertedWith("CharacterNFT: Not authorized to update");
    });

    it("Should reject empty IPFS hash", async function () {
      await expect(
        characterNFT.connect(addr1).updateMetadata(1, "")
      ).to.be.revertedWith("CharacterNFT: IPFS hash required");
    });

    it("Should return correct tokenURI", async function () {
      const uri = await characterNFT.tokenURI(1);
      expect(uri).to.equal("ipfs://QmTest123");
    });

    it("Should allow owner to update baseURI", async function () {
      await characterNFT.setBaseURI("https://api.chessnoth.com/metadata/");
      const uri = await characterNFT.tokenURI(1);
      expect(uri).to.equal("https://api.chessnoth.com/metadata/QmTest123");
    });
  });

  describe("Security and Access Control", function () {
    it("Should prevent non-owner from adding authorized minters", async function () {
      await expect(
        characterNFT.connect(addr1).addAuthorizedMinter(addr2.address)
      ).to.be.reverted;
    });

    it("Should prevent non-owner from removing authorized minters", async function () {
      await characterNFT.addAuthorizedMinter(addr2.address);
      await expect(
        characterNFT.connect(addr1).removeAuthorizedMinter(addr2.address)
      ).to.be.reverted;
    });

    it("Should prevent non-owner from setting base URI", async function () {
      await expect(
        characterNFT.connect(addr1).setBaseURI("https://example.com/")
      ).to.be.reverted;
    });

    it("Should prevent non-owner from setting mint price", async function () {
      await expect(
        characterNFT.connect(addr1).setMintPrice(ethers.parseEther("10"))
      ).to.be.reverted;
    });

    it("Should handle ownership transfer", async function () {
      await characterNFT.transferOwnership(addr1.address);
      expect(await characterNFT.owner()).to.equal(addr1.address);
    });
  });

  describe("Gas Optimization Checks", function () {
    it("Should efficiently handle batch minting", async function () {
      const mintPrice = await characterNFT.mintPrice();
      const count = 10;
      
      const gasUsed = [];
      for (let i = 0; i < count; i++) {
        const tx = await characterNFT.connect(addr1).mintCharacter(
          addr1.address,
          `QmTest${i}`,
          1,
          "Warrior",
          `Warrior${i}`,
          { value: mintPrice }
        );
        const receipt = await tx.wait();
        gasUsed.push(receipt.gasUsed);
      }
      
      // Gas should be relatively consistent (within 10% variance)
      const avgGas = gasUsed.reduce((a, b) => a + b, 0n) / BigInt(count);
      const maxVariance = avgGas / 10n; // 10%
      
      for (const gas of gasUsed) {
        expect(gas).to.be.within(avgGas - maxVariance, avgGas + maxVariance);
      }
    });

    it("Should efficiently handle batch upgrades", async function () {
      const mintPrice = await characterNFT.mintPrice();
      
      // Mint 5 NFTs
      for (let i = 0; i < 5; i++) {
        await characterNFT.connect(addr1).mintCharacter(
          addr1.address,
          `QmTest${i}`,
          1,
          "Warrior",
          `Warrior${i}`,
          { value: mintPrice }
        );
      }
      
      // Upgrade all
      const gasUsed = [];
      for (let i = 1; i <= 5; i++) {
        const tx = await characterNFT.connect(addr1).upgradeCharacter(i, 100);
        const receipt = await tx.wait();
        gasUsed.push(receipt.gasUsed);
      }
      
      // All upgrades should use similar gas
      const avgGas = gasUsed.reduce((a, b) => a + b, 0n) / BigInt(gasUsed.length);
      const maxVariance = avgGas / 10n;
      
      for (const gas of gasUsed) {
        expect(gas).to.be.within(avgGas - maxVariance, avgGas + maxVariance);
      }
    });
  });
});
