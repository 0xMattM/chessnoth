const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CHSToken", function () {
  let chsToken;
  let owner;
  let minter;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, minter, user1, user2] = await ethers.getSigners();
    
    const CHSToken = await ethers.getContractFactory("CHSToken");
    chsToken = await CHSToken.deploy(
      "Chessnoth Token",
      "CHS",
      ethers.parseEther("1000000"), // 1M initial supply
      ethers.parseEther("10000000")  // 10M max supply
    );
    await chsToken.waitForDeployment();
    
    // Add minter
    await chsToken.addAuthorizedMinter(minter.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await chsToken.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await chsToken.name()).to.equal("Chessnoth Token");
      expect(await chsToken.symbol()).to.equal("CHS");
    });

    it("Should mint initial supply to owner", async function () {
      expect(await chsToken.balanceOf(owner.address)).to.equal(
        ethers.parseEther("1000000")
      );
    });

    it("Should set correct max supply", async function () {
      expect(await chsToken.maxSupply()).to.equal(
        ethers.parseEther("10000000")
      );
    });
  });

  describe("Authorized Minters", function () {
    it("Should allow owner to add authorized minter", async function () {
      await chsToken.addAuthorizedMinter(user1.address);
      expect(await chsToken.authorizedMinters(user1.address)).to.be.true;
    });

    it("Should emit AuthorizedMinterAdded event", async function () {
      await expect(chsToken.addAuthorizedMinter(user1.address))
        .to.emit(chsToken, "AuthorizedMinterAdded")
        .withArgs(user1.address);
    });

    it("Should allow owner to remove authorized minter", async function () {
      await chsToken.removeAuthorizedMinter(minter.address);
      expect(await chsToken.authorizedMinters(minter.address)).to.be.false;
    });

    it("Should emit AuthorizedMinterRemoved event", async function () {
      await expect(chsToken.removeAuthorizedMinter(minter.address))
        .to.emit(chsToken, "AuthorizedMinterRemoved")
        .withArgs(minter.address);
    });

    it("Should reject adding zero address as minter", async function () {
      await expect(
        chsToken.addAuthorizedMinter(ethers.ZeroAddress)
      ).to.be.revertedWith("CHSToken: Cannot add zero address");
    });

    it("Should reject non-owner adding minter", async function () {
      await expect(
        chsToken.connect(user1).addAuthorizedMinter(user2.address)
      ).to.be.reverted;
    });
  });

  describe("Minting", function () {
    it("Should allow authorized minter to mint", async function () {
      await chsToken.connect(minter).mint(user1.address, ethers.parseEther("100"));
      expect(await chsToken.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should emit TokensMinted event", async function () {
      await expect(
        chsToken.connect(minter).mint(user1.address, ethers.parseEther("100"))
      )
        .to.emit(chsToken, "TokensMinted")
        .withArgs(user1.address, ethers.parseEther("100"));
    });

    it("Should prevent unauthorized minting", async function () {
      await expect(
        chsToken.connect(user1).mint(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("CHSToken: Not authorized to mint");
    });

    it("Should reject minting to zero address", async function () {
      await expect(
        chsToken.connect(minter).mint(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWith("CHSToken: Cannot mint to zero address");
    });

    it("Should reject minting zero amount", async function () {
      await expect(
        chsToken.connect(minter).mint(user1.address, 0)
      ).to.be.revertedWith("CHSToken: Amount must be greater than 0");
    });

    it("Should respect max supply", async function () {
      const maxSupply = await chsToken.maxSupply();
      const currentSupply = await chsToken.totalSupply();
      const remaining = maxSupply - currentSupply;
      
      await expect(
        chsToken.connect(minter).mint(user1.address, remaining + 1n)
      ).to.be.revertedWith("CHSToken: Max supply exceeded");
    });

    it("Should allow minting up to max supply", async function () {
      const maxSupply = await chsToken.maxSupply();
      const currentSupply = await chsToken.totalSupply();
      const remaining = maxSupply - currentSupply;
      
      await chsToken.connect(minter).mint(user1.address, remaining);
      expect(await chsToken.totalSupply()).to.equal(maxSupply);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await chsToken.connect(minter).mint(user1.address, ethers.parseEther("100"));
    });

    it("Should allow users to burn their tokens", async function () {
      await chsToken.connect(user1).burn(ethers.parseEther("50"));
      expect(await chsToken.balanceOf(user1.address)).to.equal(ethers.parseEther("50"));
    });

    it("Should emit TokensBurned event", async function () {
      await expect(
        chsToken.connect(user1).burn(ethers.parseEther("50"))
      )
        .to.emit(chsToken, "TokensBurned")
        .withArgs(user1.address, ethers.parseEther("50"));
    });

    it("Should prevent burning zero amount", async function () {
      await expect(
        chsToken.connect(user1).burn(0)
      ).to.be.revertedWith("CHSToken: Amount must be greater than 0");
    });

    it("Should prevent burning more than balance", async function () {
      await expect(
        chsToken.connect(user1).burn(ethers.parseEther("200"))
      ).to.be.revertedWith("CHSToken: Insufficient balance");
    });

    it("Should decrease total supply when burning", async function () {
      const initialSupply = await chsToken.totalSupply();
      await chsToken.connect(user1).burn(ethers.parseEther("50"));
      expect(await chsToken.totalSupply()).to.equal(
        initialSupply - ethers.parseEther("50")
      );
    });
  });

  describe("Owner Burning", function () {
    beforeEach(async function () {
      await chsToken.connect(minter).mint(user1.address, ethers.parseEther("100"));
    });

    it("Should allow owner to burn from any address", async function () {
      await chsToken.burnFrom(user1.address, ethers.parseEther("50"));
      expect(await chsToken.balanceOf(user1.address)).to.equal(ethers.parseEther("50"));
    });

    it("Should prevent non-owner from burning from other addresses", async function () {
      await expect(
        chsToken.connect(user2).burnFrom(user1.address, ethers.parseEther("50"))
      ).to.be.reverted;
    });
  });

  describe("Max Supply Management", function () {
    it("Should allow owner to update max supply", async function () {
      await chsToken.setMaxSupply(ethers.parseEther("20000000"));
      expect(await chsToken.maxSupply()).to.equal(ethers.parseEther("20000000"));
    });

    it("Should allow setting max supply to zero (unlimited)", async function () {
      await chsToken.setMaxSupply(0);
      expect(await chsToken.maxSupply()).to.equal(0);
      
      // Should allow minting without limit
      await chsToken.connect(minter).mint(user1.address, ethers.parseEther("50000000"));
      expect(await chsToken.balanceOf(user1.address)).to.equal(ethers.parseEther("50000000"));
    });

    it("Should reject setting max supply below current supply", async function () {
      const currentSupply = await chsToken.totalSupply();
      await expect(
        chsToken.setMaxSupply(currentSupply - 1n)
      ).to.be.revertedWith("CHSToken: Max supply must be >= current supply");
    });

    it("Should prevent non-owner from setting max supply", async function () {
      await expect(
        chsToken.connect(user1).setMaxSupply(ethers.parseEther("20000000"))
      ).to.be.reverted;
    });
  });

  describe("ERC20 Functionality", function () {
    beforeEach(async function () {
      await chsToken.connect(minter).mint(user1.address, ethers.parseEther("100"));
    });

    it("Should allow token transfers", async function () {
      await chsToken.connect(user1).transfer(user2.address, ethers.parseEther("50"));
      
      expect(await chsToken.balanceOf(user1.address)).to.equal(ethers.parseEther("50"));
      expect(await chsToken.balanceOf(user2.address)).to.equal(ethers.parseEther("50"));
    });

    it("Should allow approve and transferFrom", async function () {
      await chsToken.connect(user1).approve(user2.address, ethers.parseEther("50"));
      expect(await chsToken.allowance(user1.address, user2.address)).to.equal(
        ethers.parseEther("50")
      );
      
      await chsToken.connect(user2).transferFrom(
        user1.address,
        user2.address,
        ethers.parseEther("50")
      );
      
      expect(await chsToken.balanceOf(user2.address)).to.equal(ethers.parseEther("50"));
    });

    it("Should return correct total supply", async function () {
      const initialSupply = ethers.parseEther("1000000");
      const minted = ethers.parseEther("100");
      expect(await chsToken.totalSupply()).to.equal(initialSupply + minted);
    });
  });
});

