import { expect } from "chai";
import { ethers, network } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const parseEther = ethers.parseEther;
const parseUSDC = (value: string) => ethers.parseUnits(value, 6);

async function deployRegistry(): Promise<any> {
  const libraryNames = [
    "TipJarDeployer",
    "GuestbookDeployer",
    "BuilderBadgeDeployer",
    "SimpleERC20Deployer",
    "USDCTipJarDeployer",
    "USDCMiniEscrowDeployer"
  ];
  const libraries: Record<string, string> = {};

  for (const libraryName of libraryNames) {
    const Library = await ethers.getContractFactory(libraryName);
    const library = await Library.deploy();
    await library.waitForDeployment();
    libraries[libraryName] = await library.getAddress();
  }

  const Registry = await ethers.getContractFactory("InkLauncherRegistry", { libraries });
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  return registry as any;
}

async function launchedAddress(registry: any, txPromise: Promise<any>) {
  const tx = await txPromise;
  const receipt = await tx.wait();

  for (const log of receipt.logs) {
    try {
      const parsed = registry.interface.parseLog(log);
      if (parsed?.name === "ContractLaunched") {
        return parsed.args.deployedContract as string;
      }
    } catch {
      // Ignore logs from child contract construction.
    }
  }

  throw new Error("ContractLaunched event not found");
}

async function deployTipJar(registry: any, signer: any, minTip = parseEther("0.01")) {
  const address = await launchedAddress(
    registry,
    registry.connect(signer).deployTipJar("Ink Grants", "Public goods tips", minTip)
  );
  return ethers.getContractAt("TipJar", address, signer) as Promise<any>;
}

async function deployGuestbook(registry: any, signer: any, fee = parseEther("0.01"), maxLength = 24) {
  const address = await launchedAddress(
    registry,
    registry.connect(signer).deployGuestbook("Builder Wall", fee, maxLength)
  );
  return ethers.getContractAt("Guestbook", address, signer) as Promise<any>;
}

async function deployBadge(registry: any, signer: any, transferable: boolean) {
  const address = await launchedAddress(
    registry,
    registry.connect(signer).deployBuilderBadge("Ink Builder", "INKB", "ipfs://badge/", transferable)
  );
  return ethers.getContractAt("BuilderBadge", address, signer) as Promise<any>;
}

async function deployToken(registry: any, signer: any, mintable: boolean, initialSupply = parseEther("1000")) {
  const address = await launchedAddress(
    registry,
    registry.connect(signer).deploySimpleERC20("Builder Token", "BLD", initialSupply, mintable)
  );
  return ethers.getContractAt("SimpleERC20", address, signer) as Promise<any>;
}

async function deployEscrow(
  registry: any,
  signer: any,
  worker: string,
  reward = parseEther("1"),
  deadline?: number
) {
  const due = deadline ?? ((await time.latest()) + 3600);
  const address = await launchedAddress(
    registry,
    registry.connect(signer).deployMiniEscrow("Quest 1", "ipfs://quest", worker, due, { value: reward })
  );
  return ethers.getContractAt("MiniEscrow", address, signer) as Promise<any>;
}

async function deployMockUSDC() {
  const USDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await USDC.deploy();
  await usdc.waitForDeployment();
  return usdc as any;
}

async function deployUSDCTipJar(
  registry: any,
  signer: any,
  usdcAddress: string,
  minTip = parseUSDC("1")
) {
  const address = await launchedAddress(
    registry,
    registry.connect(signer).deployUSDCTipJar(usdcAddress, "Arc Creator Fund", "USDC tips on Arc", minTip)
  );
  return ethers.getContractAt("USDCTipJar", address, signer) as Promise<any>;
}

async function deployUSDCMiniEscrow(
  registry: any,
  signer: any,
  usdc: any,
  worker: string,
  reward = parseUSDC("25"),
  deadline?: number
) {
  const registryAddress = await registry.getAddress();
  const due = deadline ?? ((await time.latest()) + 3600);
  await usdc.connect(signer).approve(registryAddress, reward);
  const address = await launchedAddress(
    registry,
    registry.connect(signer).deployUSDCMiniEscrow(
      await usdc.getAddress(),
      "USDC milestone",
      "ipfs://usdc-quest",
      worker,
      due,
      reward
    )
  );
  return ethers.getContractAt("USDCMiniEscrow", address, signer) as Promise<any>;
}

describe("Ink Contract Launcher", function () {
  it("registry deploys each template successfully and records usage", async function () {
    const [deployer, worker] = await ethers.getSigners();
    const registry = await deployRegistry();

    await deployTipJar(registry, deployer);
    await deployGuestbook(registry, deployer);
    await deployBadge(registry, deployer, false);
    await deployToken(registry, deployer, true);
    await deployEscrow(registry, deployer, worker.address);

    const usdc = await deployMockUSDC();
    await deployUSDCTipJar(registry, deployer, await usdc.getAddress());
    await usdc.mint(deployer.address, parseUSDC("25"));
    await deployUSDCMiniEscrow(registry, deployer, usdc, worker.address);

    expect(await registry.getDeploymentsCount()).to.equal(7n);

    for (const templateId of [0, 1, 2, 3, 4, 5, 6]) {
      expect(await registry.getTemplateUsage(templateId)).to.equal(1n);
    }

    const deployment = await registry.getDeployment(0);
    expect(deployment.deployer).to.equal(deployer.address);
    expect(deployment.templateId).to.equal(0);
    expect(deployment.templateName).to.equal("TipJar");
  });

  it("sets owner or creator to the caller, never the registry", async function () {
    const [deployer, worker] = await ethers.getSigners();
    const registry = await deployRegistry();
    const registryAddress = await registry.getAddress();

    const tipJar = await deployTipJar(registry, deployer);
    const guestbook = await deployGuestbook(registry, deployer);
    const badge = await deployBadge(registry, deployer, false);
    const token = await deployToken(registry, deployer, true);
    const escrow = await deployEscrow(registry, deployer, worker.address);
    const usdc = await deployMockUSDC();
    await usdc.mint(deployer.address, parseUSDC("25"));
    const usdcTipJar = await deployUSDCTipJar(registry, deployer, await usdc.getAddress());
    const usdcEscrow = await deployUSDCMiniEscrow(registry, deployer, usdc, worker.address);

    expect(await tipJar.owner()).to.equal(deployer.address);
    expect(await guestbook.owner()).to.equal(deployer.address);
    expect(await badge.owner()).to.equal(deployer.address);
    expect(await token.owner()).to.equal(deployer.address);
    expect(await escrow.creator()).to.equal(deployer.address);
    expect(await usdcTipJar.owner()).to.equal(deployer.address);
    expect(await usdcEscrow.creator()).to.equal(deployer.address);

    expect(await tipJar.owner()).to.not.equal(registryAddress);
    expect(await guestbook.owner()).to.not.equal(registryAddress);
    expect(await badge.owner()).to.not.equal(registryAddress);
    expect(await token.owner()).to.not.equal(registryAddress);
    expect(await escrow.creator()).to.not.equal(registryAddress);
    expect(await usdcTipJar.owner()).to.not.equal(registryAddress);
    expect(await usdcEscrow.creator()).to.not.equal(registryAddress);
  });

  describe("TipJar", function () {
    it("rejects tips below minTip and accepts valid tips", async function () {
      const [owner, tipper] = await ethers.getSigners();
      const registry = await deployRegistry();
      const tipJar = await deployTipJar(registry, owner, parseEther("0.05"));

      await expect(tipJar.connect(tipper).tip("tiny", { value: parseEther("0.01") }))
        .to.be.revertedWith("TipJar: tip below minimum");

      await expect(tipJar.connect(tipper).tip("keep building", { value: parseEther("0.05") }))
        .to.emit(tipJar, "TipReceived")
        .withArgs(tipper.address, parseEther("0.05"), "keep building", anyValue);

      expect(await tipJar.totalTips()).to.equal(parseEther("0.05"));
      expect(await tipJar.tipsCount()).to.equal(1n);
    });

    it("allows only owner to withdraw", async function () {
      const [owner, tipper, other] = await ethers.getSigners();
      const registry = await deployRegistry();
      const tipJar = await deployTipJar(registry, owner, parseEther("0.01"));
      await tipJar.connect(tipper).tip("ship it", { value: parseEther("0.1") });

      await expect(tipJar.connect(other).withdraw(other.address))
        .to.be.revertedWithCustomError(tipJar, "OwnableUnauthorizedAccount")
        .withArgs(other.address);

      await expect(tipJar.connect(owner).withdraw(owner.address))
        .to.emit(tipJar, "Withdrawn")
        .withArgs(owner.address, parseEther("0.1"));

      expect(await ethers.provider.getBalance(await tipJar.getAddress())).to.equal(0n);
    });
  });

  describe("Guestbook", function () {
    it("validates message length and fee, then stores messages", async function () {
      const [owner, author] = await ethers.getSigners();
      const registry = await deployRegistry();
      const guestbook = await deployGuestbook(registry, owner, parseEther("0.02"), 10);

      await expect(guestbook.connect(author).postMessage("", { value: parseEther("0.02") }))
        .to.be.revertedWith("Guestbook: empty message");
      await expect(guestbook.connect(author).postMessage("this message is too long", { value: parseEther("0.02") }))
        .to.be.revertedWith("Guestbook: message too long");
      await expect(guestbook.connect(author).postMessage("hello", { value: parseEther("0.01") }))
        .to.be.revertedWith("Guestbook: fee too low");

      await expect(guestbook.connect(author).postMessage("hello", { value: parseEther("0.02") }))
        .to.emit(guestbook, "MessagePosted");

      expect(await guestbook.getMessagesCount()).to.equal(1n);
      const message = await guestbook.getMessage(0);
      expect(message.author).to.equal(author.address);
      expect(message.content).to.equal("hello");
      expect(message.value).to.equal(parseEther("0.02"));
    });

    it("allows only owner to withdraw", async function () {
      const [owner, author, other] = await ethers.getSigners();
      const registry = await deployRegistry();
      const guestbook = await deployGuestbook(registry, owner, parseEther("0.02"), 32);
      await guestbook.connect(author).postMessage("hello", { value: parseEther("0.02") });

      await expect(guestbook.connect(other).withdraw(other.address))
        .to.be.revertedWithCustomError(guestbook, "OwnableUnauthorizedAccount")
        .withArgs(other.address);

      await expect(guestbook.connect(owner).withdraw(owner.address))
        .to.emit(guestbook, "Withdrawn")
        .withArgs(owner.address, parseEther("0.02"));
    });
  });

  describe("BuilderBadge", function () {
    it("allows only owner to mint", async function () {
      const [owner, other] = await ethers.getSigners();
      const registry = await deployRegistry();
      const badge = await deployBadge(registry, owner, false);

      await expect(badge.connect(other).mint(other.address))
        .to.be.revertedWithCustomError(badge, "OwnableUnauthorizedAccount")
        .withArgs(other.address);

      await expect(badge.connect(owner).mint(other.address))
        .to.emit(badge, "BadgeMinted")
        .withArgs(other.address, 1n);
      expect(await badge.totalMinted()).to.equal(1n);
    });

    it("blocks transfers in non-transferable mode", async function () {
      const [owner, holder, recipient] = await ethers.getSigners();
      const registry = await deployRegistry();
      const badge = await deployBadge(registry, owner, false);
      await badge.connect(owner).mint(holder.address);

      await expect(badge.connect(holder).transferFrom(holder.address, recipient.address, 1))
        .to.be.revertedWithCustomError(badge, "NonTransferableBadge");
    });

    it("allows transfers in transferable mode", async function () {
      const [owner, holder, recipient] = await ethers.getSigners();
      const registry = await deployRegistry();
      const badge = await deployBadge(registry, owner, true);
      await badge.connect(owner).mint(holder.address);

      await badge.connect(holder).transferFrom(holder.address, recipient.address, 1);
      expect(await badge.ownerOf(1)).to.equal(recipient.address);
    });
  });

  describe("SimpleERC20", function () {
    it("mints initial supply to user", async function () {
      const [owner] = await ethers.getSigners();
      const registry = await deployRegistry();
      const token = await deployToken(registry, owner, true, parseEther("123"));

      expect(await token.balanceOf(owner.address)).to.equal(parseEther("123"));
      expect(await token.totalSupply()).to.equal(parseEther("123"));
    });

    it("allows owner mint when mintable", async function () {
      const [owner, recipient] = await ethers.getSigners();
      const registry = await deployRegistry();
      const token = await deployToken(registry, owner, true, parseEther("100"));

      await token.connect(owner).mint(recipient.address, parseEther("25"));
      expect(await token.balanceOf(recipient.address)).to.equal(parseEther("25"));
    });

    it("rejects mint for fixed-supply tokens", async function () {
      const [owner, recipient] = await ethers.getSigners();
      const registry = await deployRegistry();
      const token = await deployToken(registry, owner, false, parseEther("100"));

      await expect(token.connect(owner).mint(recipient.address, parseEther("25")))
        .to.be.revertedWithCustomError(token, "MintingDisabled");
    });
  });

  describe("MiniEscrow", function () {
    it("locks reward, accepts proof, approval, and worker claim", async function () {
      const [creator, worker] = await ethers.getSigners();
      const registry = await deployRegistry();
      const reward = parseEther("1");
      const escrow = await deployEscrow(registry, creator, worker.address, reward);

      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(reward);

      await expect(escrow.connect(worker).submitProof("ipfs://proof"))
        .to.emit(escrow, "ProofSubmitted")
        .withArgs(worker.address, "ipfs://proof");

      await expect(escrow.connect(creator).approve())
        .to.emit(escrow, "Approved")
        .withArgs(creator.address, worker.address);

      await expect(escrow.connect(worker).claim())
        .to.emit(escrow, "Claimed")
        .withArgs(worker.address, reward);

      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0n);
      const summary = await escrow.getSummary();
      expect(summary.currentStatus).to.equal(3n);
    });

    it("allows creator to cancel before submission", async function () {
      const [creator, worker] = await ethers.getSigners();
      const registry = await deployRegistry();
      const reward = parseEther("0.5");
      const escrow = await deployEscrow(registry, creator, worker.address, reward);

      await expect(escrow.connect(creator).cancelBeforeSubmission())
        .to.emit(escrow, "Cancelled")
        .withArgs(creator.address, reward);

      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0n);
    });

    it("allows creator to refund after deadline if no submission or approval exists", async function () {
      const [creator, worker] = await ethers.getSigners();
      const registry = await deployRegistry();
      const reward = parseEther("0.5");
      const deadline = (await time.latest()) + 60;
      const escrow = await deployEscrow(registry, creator, worker.address, reward, deadline);

      await time.increaseTo(deadline + 1);

      await expect(escrow.connect(creator).refundAfterDeadline())
        .to.emit(escrow, "Refunded")
        .withArgs(creator.address, reward);

      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0n);
    });

    it("rejects wrong worker in fixed worker mode", async function () {
      const [creator, worker, other] = await ethers.getSigners();
      const registry = await deployRegistry();
      const escrow = await deployEscrow(registry, creator, worker.address, parseEther("1"));

      await expect(escrow.connect(other).submitProof("ipfs://proof"))
        .to.be.revertedWith("MiniEscrow: wrong worker");
    });
  });

  describe("USDCTipJar", function () {
    it("uses USDC allowances, rejects tiny tips, and lets only owner withdraw", async function () {
      const [owner, tipper, other] = await ethers.getSigners();
      const registry = await deployRegistry();
      const usdc = await deployMockUSDC();
      const tipJar = await deployUSDCTipJar(registry, owner, await usdc.getAddress(), parseUSDC("5"));
      const tipJarAddress = await tipJar.getAddress();

      await usdc.mint(tipper.address, parseUSDC("20"));
      await usdc.connect(tipper).approve(tipJarAddress, parseUSDC("20"));

      await expect(tipJar.connect(tipper).tip(parseUSDC("1"), "too small"))
        .to.be.revertedWith("USDCTipJar: tip below minimum");

      await expect(tipJar.connect(tipper).tip(parseUSDC("5"), "stablecoin support"))
        .to.emit(tipJar, "TipReceived")
        .withArgs(tipper.address, parseUSDC("5"), "stablecoin support", anyValue);

      expect(await usdc.balanceOf(tipJarAddress)).to.equal(parseUSDC("5"));
      expect(await tipJar.totalTips()).to.equal(parseUSDC("5"));
      expect(await tipJar.tipsCount()).to.equal(1n);

      await expect(tipJar.connect(other).withdraw(other.address))
        .to.be.revertedWithCustomError(tipJar, "OwnableUnauthorizedAccount")
        .withArgs(other.address);

      await expect(tipJar.connect(owner).withdraw(owner.address))
        .to.emit(tipJar, "Withdrawn")
        .withArgs(owner.address, parseUSDC("5"));

      expect(await usdc.balanceOf(tipJarAddress)).to.equal(0n);
    });
  });

  describe("USDCMiniEscrow", function () {
    it("locks approved USDC on creation, then settles to the worker after approval", async function () {
      const [creator, worker] = await ethers.getSigners();
      const registry = await deployRegistry();
      const usdc = await deployMockUSDC();
      const reward = parseUSDC("50");
      await usdc.mint(creator.address, reward);

      const escrow = await deployUSDCMiniEscrow(registry, creator, usdc, worker.address, reward);
      const escrowAddress = await escrow.getAddress();

      expect(await usdc.balanceOf(escrowAddress)).to.equal(reward);

      await expect(escrow.connect(worker).submitProof("ipfs://usdc-proof"))
        .to.emit(escrow, "ProofSubmitted")
        .withArgs(worker.address, "ipfs://usdc-proof");

      await expect(escrow.connect(creator).approve())
        .to.emit(escrow, "Approved")
        .withArgs(creator.address, worker.address);

      await expect(escrow.connect(worker).claim())
        .to.emit(escrow, "Claimed")
        .withArgs(worker.address, reward);

      expect(await usdc.balanceOf(worker.address)).to.equal(reward);
      expect(await usdc.balanceOf(escrowAddress)).to.equal(0n);
    });

    it("allows creator to cancel before submission", async function () {
      const [creator, worker] = await ethers.getSigners();
      const registry = await deployRegistry();
      const usdc = await deployMockUSDC();
      const reward = parseUSDC("12.5");
      await usdc.mint(creator.address, reward);

      const escrow = await deployUSDCMiniEscrow(registry, creator, usdc, worker.address, reward);

      await expect(escrow.connect(creator).cancelBeforeSubmission())
        .to.emit(escrow, "Cancelled")
        .withArgs(creator.address, reward);

      expect(await usdc.balanceOf(creator.address)).to.equal(reward);
    });

    it("allows creator to refund after deadline if no submission exists", async function () {
      const [creator, worker] = await ethers.getSigners();
      const registry = await deployRegistry();
      const usdc = await deployMockUSDC();
      const reward = parseUSDC("15");
      const deadline = (await time.latest()) + 60;
      await usdc.mint(creator.address, reward);

      const escrow = await deployUSDCMiniEscrow(registry, creator, usdc, worker.address, reward, deadline);
      await time.increaseTo(deadline + 1);

      await expect(escrow.connect(creator).refundAfterDeadline())
        .to.emit(escrow, "Refunded")
        .withArgs(creator.address, reward);

      expect(await usdc.balanceOf(creator.address)).to.equal(reward);
    });

    it("rejects wrong worker in fixed worker mode", async function () {
      const [creator, worker, other] = await ethers.getSigners();
      const registry = await deployRegistry();
      const usdc = await deployMockUSDC();
      await usdc.mint(creator.address, parseUSDC("10"));
      const escrow = await deployUSDCMiniEscrow(registry, creator, usdc, worker.address, parseUSDC("10"));

      await expect(escrow.connect(other).submitProof("ipfs://proof"))
        .to.be.revertedWith("USDCMiniEscrow: wrong worker");
    });
  });

  it("registry address cannot manage child contracts", async function () {
    const [deployer, worker] = await ethers.getSigners();
    const registry = await deployRegistry();
    const registryAddress = await registry.getAddress();

    const tipJar = await deployTipJar(registry, deployer, parseEther("0.01"));
    const guestbook = await deployGuestbook(registry, deployer, parseEther("0.01"), 32);
    const badge = await deployBadge(registry, deployer, false);
    const token = await deployToken(registry, deployer, true, parseEther("100"));
    const escrow = await deployEscrow(registry, deployer, worker.address, parseEther("1"));
    const usdc = await deployMockUSDC();
    await usdc.mint(deployer.address, parseUSDC("100"));
    const usdcTipJar = await deployUSDCTipJar(registry, deployer, await usdc.getAddress(), parseUSDC("1"));
    const usdcEscrow = await deployUSDCMiniEscrow(registry, deployer, usdc, worker.address, parseUSDC("10"));

    await tipJar.connect(worker).tip("funds", { value: parseEther("0.02") });
    await guestbook.connect(worker).postMessage("hello", { value: parseEther("0.01") });
    await escrow.connect(worker).submitProof("ipfs://proof");
    await usdc.connect(worker).approve(await usdcTipJar.getAddress(), parseUSDC("1"));
    await usdc.mint(worker.address, parseUSDC("1"));
    await usdcTipJar.connect(worker).tip(parseUSDC("1"), "usdc");
    await usdcEscrow.connect(worker).submitProof("ipfs://usdc-proof");

    await network.provider.send("hardhat_setBalance", [registryAddress, "0x56BC75E2D63100000"]);
    await network.provider.send("hardhat_impersonateAccount", [registryAddress]);
    const registrySigner = await ethers.getSigner(registryAddress);

    await expect(tipJar.connect(registrySigner).withdraw(registryAddress))
      .to.be.revertedWithCustomError(tipJar, "OwnableUnauthorizedAccount")
      .withArgs(registryAddress);
    await expect(guestbook.connect(registrySigner).withdraw(registryAddress))
      .to.be.revertedWithCustomError(guestbook, "OwnableUnauthorizedAccount")
      .withArgs(registryAddress);
    await expect(badge.connect(registrySigner).mint(worker.address))
      .to.be.revertedWithCustomError(badge, "OwnableUnauthorizedAccount")
      .withArgs(registryAddress);
    await expect(token.connect(registrySigner).mint(worker.address, parseEther("1")))
      .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
      .withArgs(registryAddress);
    await expect(escrow.connect(registrySigner).approve())
      .to.be.revertedWith("MiniEscrow: only creator");
    await expect(usdcTipJar.connect(registrySigner).withdraw(registryAddress))
      .to.be.revertedWithCustomError(usdcTipJar, "OwnableUnauthorizedAccount")
      .withArgs(registryAddress);
    await expect(usdcEscrow.connect(registrySigner).approve())
      .to.be.revertedWith("USDCMiniEscrow: only creator");

    await network.provider.send("hardhat_stopImpersonatingAccount", [registryAddress]);
  });
});

const anyValue = () => true;
