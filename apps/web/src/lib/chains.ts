import { defineChain } from "viem";

export const hardhat = defineChain({
  id: 31337,
  name: "Hardhat Localhost",
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] }
  },
  testnet: true
});

export const inkSepolia = defineChain({
  id: 763373,
  name: "Ink Sepolia",
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: {
    default: { http: ["https://rpc-gel-sepolia.inkonchain.com"] }
  },
  blockExplorers: {
    default: {
      name: "Ink Sepolia Explorer",
      url: "https://explorer-sepolia.inkonchain.com"
    }
  },
  testnet: true
});

export const inkMainnet = defineChain({
  id: 57073,
  name: "Ink",
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: {
    default: { http: ["https://rpc-gel.inkonchain.com"] }
  },
  blockExplorers: {
    default: {
      name: "Ink Explorer",
      url: "https://explorer.inkonchain.com"
    }
  }
});

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { decimals: 18, name: "USD Coin", symbol: "USDC" },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] }
  },
  blockExplorers: {
    default: {
      name: "ArcScan Testnet",
      url: "https://testnet.arcscan.app"
    }
  },
  testnet: true
});

export const primaryInkChain = inkMainnet;
export const primaryArcChain = arcTestnet;

export const supportedChains = [hardhat, inkMainnet, inkSepolia, arcTestnet] as const;

export function explorerLink(chainId: number, value: string, type: "address" | "tx" = "address") {
  const chain = supportedChains.find((item) => item.id === chainId);
  const baseUrl = chain?.blockExplorers?.default.url;

  if (!baseUrl) {
    return undefined;
  }

  return `${baseUrl}/${type}/${value}`;
}
