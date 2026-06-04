import { isAddress, type Address } from "viem";
import deployments from "@/generated/deployments.json";

type DeploymentMap = Record<string, { InkLauncherRegistry?: string; MockUSDC?: string }>;

const generatedDeployments = deployments as DeploymentMap;

function validAddress(value?: string): Address | undefined {
  if (value && isAddress(value)) {
    return value as Address;
  }

  return undefined;
}

export function getRegistryAddress(chainId?: number): Address | undefined {
  if (!chainId) {
    return undefined;
  }

  if (chainId === 31337) {
    return (
      validAddress(process.env.NEXT_PUBLIC_REGISTRY_ADDRESS_LOCALHOST) ??
      validAddress(generatedDeployments[String(chainId)]?.InkLauncherRegistry)
    );
  }

  if (chainId === 763373) {
    return (
      validAddress(process.env.NEXT_PUBLIC_REGISTRY_ADDRESS_INK_SEPOLIA) ??
      validAddress(generatedDeployments[String(chainId)]?.InkLauncherRegistry)
    );
  }

  if (chainId === 57073) {
    return (
      validAddress(process.env.NEXT_PUBLIC_REGISTRY_ADDRESS_INK_MAINNET) ??
      validAddress(generatedDeployments[String(chainId)]?.InkLauncherRegistry)
    );
  }

  if (chainId === 5042002) {
    return (
      validAddress(process.env.NEXT_PUBLIC_REGISTRY_ADDRESS_ARC_TESTNET) ??
      validAddress(generatedDeployments[String(chainId)]?.InkLauncherRegistry)
    );
  }

  return validAddress(generatedDeployments[String(chainId)]?.InkLauncherRegistry);
}

export function getUSDCAddress(chainId?: number): Address | undefined {
  if (!chainId) {
    return undefined;
  }

  if (chainId === 5042002) {
    return validAddress(
      process.env.NEXT_PUBLIC_USDC_ADDRESS_ARC_TESTNET ??
        "0x3600000000000000000000000000000000000000"
    );
  }

  if (chainId === 31337) {
    return (
      validAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS_LOCALHOST) ??
      validAddress(generatedDeployments[String(chainId)]?.MockUSDC)
    );
  }

  return undefined;
}

export function getGatewayWalletAddress(chainId?: number): Address | undefined {
  if (chainId === 5042002) {
    return validAddress(
      process.env.NEXT_PUBLIC_GATEWAY_WALLET_ADDRESS_ARC_TESTNET ??
        "0x0077777d7EBA4688BDeF3E311b846F25870A19B9"
    );
  }

  return undefined;
}

export function registrySetupMessage(chainId?: number) {
  if (chainId === 763373) {
    return "Deploy the registry first and set NEXT_PUBLIC_REGISTRY_ADDRESS_INK_SEPOLIA";
  }

  if (chainId === 57073) {
    return "Deploy the registry first and set NEXT_PUBLIC_REGISTRY_ADDRESS_INK_MAINNET";
  }

  if (chainId === 5042002) {
    return "Deploy the registry first and set NEXT_PUBLIC_REGISTRY_ADDRESS_ARC_TESTNET";
  }

  if (chainId === 31337) {
    return "Deploy the registry first and set NEXT_PUBLIC_REGISTRY_ADDRESS_LOCALHOST";
  }

  return "Deploy the registry first and set NEXT_PUBLIC_REGISTRY_ADDRESS_*";
}
