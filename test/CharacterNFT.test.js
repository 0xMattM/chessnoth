const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CharacterNFT", function () {
  let characterNFT;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const CharacterNFT = await ethers.getContractFactory("CharacterNFT");
    characterNFT = await CharacterNFT.deploy(
      "Chessnoth Character",
      "CNFT",
      "ipfs://"
    );
    await characterNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await characterNFT.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await characterNFT.name()).to.equal("Chessnoth Character");
      expect(await characterNFT.symbol()).to.equal("CNFT");
    });
  });

  describe("Minting", function () {
    it("Should mint a character correctly", async function () {
      const tx = await characterNFT.mintCharacter(
        addr1.address,
        "QmTest123",
        1,
        "Warrior",
        "TestWarrior"
      );
      
      await expect(tx)
        .to.emit(characterNFT, "CharacterMinted")
        .withArgs(1, addr1.address, "Warrior", "TestWarrior", 1, "QmTest123");
      
      expect(await characterNFT.ownerOf(1)).to.equal(addr1.address);
      expect(await characterNFT.getClass(1)).to.equal("Warrior");
      expect(await characterNFT.getName(1)).to.equal("TestWarrior");
      expect(await characterNFT.getLevel(1)).to.equal(1);
      expect(await characterNFT.getExperience(1)).to.equal(0);
    });

    it("Should reject minting to zero address", async function () {
      await expect(
        characterNFT.mintCharacter(
          ethers.ZeroAddress,
          "QmTest123",
          1,
          "Warrior",
          "TestWarrior"
        )
      ).to.be.revertedWith("CharacterNFT: Cannot mint to zero address");
    });

    it("Should reject minting with empty IPFS hash", async function () {
      await expect(
        characterNFT.mintCharacter(
          addr1.address,
          "",
          1,
          "Warrior",
          "TestWarrior"
        )
      ).to.be.revertedWith("CharacterNFT: IPFS hash required");
    });

    it("Should reject minting with empty class", async function () {
      await expect(
        characterNFT.mintCharacter(
          addr1.address,
          "QmTest123",
          1,
          "",
          "TestWarrior"
        )
      ).to.be.revertedWith("CharacterNFT: Class required");
    });

    it("Should reject minting with empty name", async function () {
      await expect(
        characterNFT.mintCharacter(
          addr1.address,
          "QmTest123",
          1,
          "Warrior",
          ""
        )
      ).to.be.revertedWith("CharacterNFT: Name required");
    });

    it("Should increment token IDs correctly", async function () {
      await characterNFT.mintCharacter(
        addr1.address,
        "QmTest1",
        1,
        "Warrior",
        "Warrior1"
      );
      await characterNFT.mintCharacter(
        addr1.address,
        "QmTest2",
        1,
        "Mage",
        "Mage1"
      );
      
      expect(await characterNFT.ownerOf(1)).to.equal(addr1.address);
      expect(await characterNFT.ownerOf(2)).to.equal(addr1.address);
    });
  });

  describe("Upgrading", function () {
    beforeEach(async function () {
      await characterNFT.mintCharacter(
        addr1.address,
        "QmTest123",
        1,
        "Warrior",
        "TestWarrior"
      );
    });

    it("Should upgrade character and calculate level correctly", async function () {
      // Add 100 EXP -> should level up to 2
      await characterNFT.connect(addr1).upgradeCharacter(1, 100);
      
      expect(await characterNFT.getExperience(1)).to.equal(100);
      expect(await characterNFT.getLevel(1)).to.equal(2);
    });

    it("Should calculate level correctly for various EXP amounts", async function () {
      // 0 EXP = Level 1
      expect(await characterNFT.getLevel(1)).to.equal(1);
      
      // 50 EXP = Level 1
      await characterNFT.connect(addr1).upgradeCharacter(1, 50);
      expect(await characterNFT.getLevel(1)).to.equal(1);
      
      // 100 EXP total = Level 2
      await characterNFT.connect(addr1).upgradeCharacter(1, 50);
      expect(await characterNFT.getLevel(1)).to.equal(2);
      expect(await characterNFT.getExperience(1)).to.equal(100);
      
      // 250 EXP total = Level 3
      await characterNFT.connect(addr1).upgradeCharacter(1, 150);
      expect(await characterNFT.getLevel(1)).to.equal(3);
      expect(await characterNFT.getExperience(1)).to.equal(250);
      
      // 999 EXP total = Level 10
      await characterNFT.connect(addr1).upgradeCharacter(1, 749);
      expect(await characterNFT.getLevel(1)).to.equal(10);
      expect(await characterNFT.getExperience(1)).to.equal(999);
    });

    it("Should prevent unauthorized upgrades", async function () {
      await expect(
        characterNFT.connect(addr2).upgradeCharacter(1, 100)
      ).to.be.revertedWith("CharacterNFT: Not authorized to upgrade");
    });

    it("Should reject zero experience upgrade", async function () {
      await expect(
        characterNFT.connect(addr1).upgradeCharacter(1, 0)
      ).to.be.revertedWith("CharacterNFT: Experience amount must be greater than 0");
    });

    it("Should emit CharacterLevelUp event when leveling up", async function () {
      const tx = await characterNFT.connect(addr1).upgradeCharacter(1, 100);
      
      await expect(tx)
        .to.emit(characterNFT, "CharacterLevelUp")
        .withArgs(1, 1, 2, 100);
    });

    it("Should emit CharacterUpgraded event", async function () {
      const tx = await characterNFT.connect(addr1).upgradeCharacter(1, 100);
      
      await expect(tx)
        .to.emit(characterNFT, "CharacterUpgraded")
        .withArgs(1, 100, 1, 2, 100);
    });

    it("Should not emit CharacterLevelUp if level doesn't change", async function () {
      const tx = await characterNFT.connect(addr1).upgradeCharacter(1, 50);
      
      // Should not emit CharacterLevelUp (still level 1)
      await expect(tx).to.not.emit(characterNFT, "CharacterLevelUp");
      
      // But should emit CharacterUpgraded
      await expect(tx).to.emit(characterNFT, "CharacterUpgraded");
    });
  });

  describe("Getter Functions", function () {
    beforeEach(async function () {
      await characterNFT.mintCharacter(
        addr1.address,
        "QmTest123",
        5,
        "Mage",
        "TestMage"
      );
    });

    it("Should return correct generation", async function () {
      expect(await characterNFT.getGeneration(1)).to.equal(5);
    });

    it("Should return correct class", async function () {
      expect(await characterNFT.getClass(1)).to.equal("Mage");
    });

    it("Should return correct name", async function () {
      expect(await characterNFT.getName(1)).to.equal("TestMage");
    });

    it("Should return correct level", async function () {
      expect(await characterNFT.getLevel(1)).to.equal(1);
    });

    it("Should return correct experience", async function () {
      expect(await characterNFT.getExperience(1)).to.equal(0);
    });

    it("Should revert when querying non-existent token", async function () {
      await expect(
        characterNFT.getClass(999)
      ).to.be.revertedWith("CharacterNFT: Token does not exist");
    });
  });

  describe("Authorized Minter", function () {
    it("Should allow owner to add authorized minter", async function () {
      await characterNFT.addAuthorizedMinter(addr1.address);
      expect(await characterNFT.authorizedMinters(addr1.address)).to.be.true;
    });

    it("Should allow owner to add multiple authorized minters", async function () {
      await characterNFT.addAuthorizedMinter(addr1.address);
      await characterNFT.addAuthorizedMinter(addr2.address);
      expect(await characterNFT.authorizedMinters(addr1.address)).to.be.true;
      expect(await characterNFT.authorizedMinters(addr2.address)).to.be.true;
    });

    it("Should allow owner to remove authorized minter", async function () {
      await characterNFT.addAuthorizedMinter(addr1.address);
      await characterNFT.removeAuthorizedMinter(addr1.address);
      expect(await characterNFT.authorizedMinters(addr1.address)).to.be.false;
    });

    it("Should emit AuthorizedMinterAdded event", async function () {
      await expect(characterNFT.addAuthorizedMinter(addr1.address))
        .to.emit(characterNFT, "AuthorizedMinterAdded")
        .withArgs(addr1.address);
    });

    it("Should emit AuthorizedMinterRemoved event", async function () {
      await characterNFT.addAuthorizedMinter(addr1.address);
      await expect(characterNFT.removeAuthorizedMinter(addr1.address))
        .to.emit(characterNFT, "AuthorizedMinterRemoved")
        .withArgs(addr1.address);
    });

    it("Should reject adding zero address as minter", async function () {
      await expect(
        characterNFT.addAuthorizedMinter(ethers.ZeroAddress)
      ).to.be.revertedWith("CharacterNFT: Cannot add zero address");
    });

    it("Should allow authorized minter to set experience", async function () {
      await characterNFT.mintCharacter(
        addr1.address,
        "QmTest123",
        1,
        "Warrior",
        "TestWarrior"
      );
      
      await characterNFT.addAuthorizedMinter(addr2.address);
      await characterNFT.connect(addr2).setExperience(1, 200);
      
      expect(await characterNFT.getExperience(1)).to.equal(200);
      expect(await characterNFT.getLevel(1)).to.equal(3);
    });

    it("Should prevent non-authorized from setting experience", async function () {
      await characterNFT.mintCharacter(
        addr1.address,
        "QmTest123",
        1,
        "Warrior",
        "TestWarrior"
      );
      
      await expect(
        characterNFT.connect(addr2).setExperience(1, 200)
      ).to.be.revertedWith("CharacterNFT: Not authorized to set experience");
    });

    it("Should allow authorized minter to mint characters", async function () {
      await characterNFT.addAuthorizedMinter(addr2.address);
      const tx = await characterNFT.connect(addr2).mintCharacter(
        addr1.address,
        "QmTest123",
        1,
        "Warrior",
        "TestWarrior"
      );
      await expect(tx)
        .to.emit(characterNFT, "CharacterMinted")
        .withArgs(1, addr1.address, "Warrior", "TestWarrior", 1, "QmTest123");
    });

    it("Should prevent non-authorized from minting", async function () {
      await expect(
        characterNFT.connect(addr2).mintCharacter(
          addr1.address,
          "QmTest123",
          1,
          "Warrior",
          "TestWarrior"
        )
      ).to.be.revertedWith("CharacterNFT: Not authorized to mint");
    });
  });

  describe("ERC721 Functionality", function () {
    beforeEach(async function () {
      await characterNFT.mintCharacter(
        addr1.address,
        "QmTest123",
        1,
        "Warrior",
        "TestWarrior"
      );
    });

    it("Should return correct balance", async function () {
      expect(await characterNFT.balanceOf(addr1.address)).to.equal(1);
      
      await characterNFT.mintCharacter(
        addr1.address,
        "QmTest456",
        1,
        "Mage",
        "TestMage"
      );
      
      expect(await characterNFT.balanceOf(addr1.address)).to.equal(2);
    });

    it("Should allow token transfers", async function () {
      await characterNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 1);
      
      expect(await characterNFT.ownerOf(1)).to.equal(addr2.address);
      expect(await characterNFT.balanceOf(addr1.address)).to.equal(0);
      expect(await characterNFT.balanceOf(addr2.address)).to.equal(1);
    });

    it("Should enumerate tokens correctly", async function () {
      await characterNFT.mintCharacter(
        addr1.address,
        "QmTest456",
        1,
        "Mage",
        "TestMage"
      );
      
      const tokenId1 = await characterNFT.tokenOfOwnerByIndex(addr1.address, 0);
      const tokenId2 = await characterNFT.tokenOfOwnerByIndex(addr1.address, 1);
      
      expect(tokenId1).to.equal(1);
      expect(tokenId2).to.equal(2);
    });
  });
});

