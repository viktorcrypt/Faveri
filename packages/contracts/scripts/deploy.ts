import fs from "node:fs";
import path from "node:path";
import { ethers, network } from "hardhat";

const deployerLibraries = [
  "TipJarDeployer",
  "GuestbookDeployer",
  "BuilderBadgeDeployer",
  "SimpleERC20Deployer",
  "USDCTipJarDeployer",
  "USDCMiniEscrowDeployer"
] as const;

async function main() {
  const libraries: Record<string, string> = {};

  for (const libraryName of deployerLibraries) {
    const Library = await ethers.getContractFactory(libraryName);
    const library = await Library.deploy();
    await library.waitForDeployment();
    libraries[libraryName] = await library.getAddress();
    console.log(`${libraryName} deployed to ${libraries[libraryName]}`);
  }

  const Registry = await ethers.getContractFactory("InkLauncherRegistry", {
    libraries
  });
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  let mockUSDCAddress: string | undefined;

  if (chainId === 31337) {
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    mockUSDCAddress = await mockUSDC.getAddress();
    const [deployer] = await ethers.getSigners();
    await mockUSDC.mint(deployer.address, ethers.parseUnits("1000000", 6));
    console.log(`MockUSDC deployed to ${mockUSDCAddress}`);
  }

  const rootDir = path.resolve(__dirname, "../../..");
  const outputDir = path.resolve(rootDir, "apps/web/src/generated");
  const outputPath = path.join(outputDir, "deployments.json");

  fs.mkdirSync(outputDir, { recursive: true });

  const existing = fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, "utf8"))
    : {};

  existing[String(chainId)] = {
    network: network.name,
    InkLauncherRegistry: address,
    ...(mockUSDCAddress ? { MockUSDC: mockUSDCAddress } : {}),
    libraries
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(existing, null, 2)}\n`);

  console.log(`InkLauncherRegistry deployed to ${address}`);
  console.log(`Network: ${network.name} (${chainId})`);
  console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
