import "@nomicfoundation/hardhat-toolbox";
import { config as loadEnv } from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";

loadEnv({ path: "../../.env" });
loadEnv({ path: ".env" });

const privateKey = process.env.PRIVATE_KEY;
const inkMainnetRpcUrl =
  process.env.INK_MAINNET_RPC_URL ?? "https://rpc-gel.inkonchain.com";
const inkSepoliaRpcUrl =
  process.env.INK_SEPOLIA_RPC_URL ?? "https://rpc-gel-sepolia.inkonchain.com";
const arcTestnetRpcUrl =
  process.env.ARC_TESTNET_RPC_URL ?? "https://rpc.testnet.arc.network";

const accounts = privateKey ? [privateKey] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 20
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    inkMainnet: {
      url: inkMainnetRpcUrl,
      chainId: 57073,
      accounts
    },
    inkSepolia: {
      url: inkSepoliaRpcUrl,
      chainId: 763373,
      accounts
    },
    arcTestnet: {
      url: arcTestnetRpcUrl,
      chainId: 5042002,
      accounts
    }
  }
};

export default config;
