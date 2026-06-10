"use client";

import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { arcTestnet, hardhat, inkMainnet, inkSepolia, supportedChains } from "@/lib/chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = [
  injected({ shimDisconnect: true }),
  ...(walletConnectProjectId
    ? [
        walletConnect({
          projectId: walletConnectProjectId,
          metadata: {
            name: "Faveri",
            description: "Deploy user-owned contracts and stablecoin settlement flows.",
            url: "https://localhost",
            icons: []
          }
        })
      ]
    : [])
];

export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors,
  ssr: true,
  transports: {
    [hardhat.id]: http(hardhat.rpcUrls.default.http[0]),
    [inkSepolia.id]: http(inkSepolia.rpcUrls.default.http[0]),
    [inkMainnet.id]: http(inkMainnet.rpcUrls.default.http[0]),
    [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0])
  }
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
