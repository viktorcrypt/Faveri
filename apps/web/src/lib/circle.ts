import type { Abi, Address } from "viem";
import { arcTestnet } from "@/lib/chains";
import { getGatewayWalletAddress, getUSDCAddress } from "@/lib/registry";

export const ARC_TESTNET_USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;
export const ARC_TESTNET_GATEWAY_WALLET_ADDRESS = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as const;
export const ARC_GATEWAY_DOMAIN = 26;
export const USDC_DECIMALS = 6;

export const erc20Abi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }]
  }
] as const satisfies Abi;

export const gatewayWalletAbi = [
  {
    type: "function",
    name: "availableBalance",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "depositor", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "value", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "domain",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint32" }]
  },
  {
    type: "function",
    name: "isTokenSupported",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "totalBalance",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "depositor", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "withdrawableBalance",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "depositor", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "withdrawingBalance",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "depositor", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const satisfies Abi;

export function isArcTestnet(chainId?: number) {
  return chainId === arcTestnet.id;
}

export function resolveUSDCAddress(chainId?: number): Address | undefined {
  return getUSDCAddress(chainId);
}

export function resolveGatewayWalletAddress(chainId?: number): Address | undefined {
  return getGatewayWalletAddress(chainId);
}
