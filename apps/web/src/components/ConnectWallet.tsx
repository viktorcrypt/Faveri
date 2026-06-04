"use client";

import { Cable, CheckCircle2, LogOut, Network } from "lucide-react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { primaryInkChain, supportedChains } from "@/lib/chains";
import { shortAddress } from "@/lib/format";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const chain = supportedChains.find((item) => item.id === chainId);

  if (!isConnected) {
    return (
      <div className="flex flex-wrap gap-2">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            className="button-primary rounded-full px-4 py-2 transition-transform hover:scale-105 active:scale-95"
            disabled={isPending}
            onClick={() => connect({ connector })}
            type="button"
          >
            <Cable className="h-4 w-4" aria-hidden="true" />
            {connector.name === "Injected" ? "Connect Wallet" : connector.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="liquid-glass inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-[#171714]">
        <CheckCircle2 className="h-4 w-4 text-[#4e8f65]" aria-hidden="true" />
        {shortAddress(address)}
      </span>
      <span className="liquid-glass inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-[#55584f]">
        <Network className="h-4 w-4 text-[#4e8f65]" aria-hidden="true" />
        {chain?.name ?? `Chain ${chainId}`}
      </span>
      {!chain && (
        <button
          className="button-secondary rounded-full"
          disabled={isSwitching}
          onClick={() => switchChain({ chainId: primaryInkChain.id })}
          type="button"
        >
          Switch to Ink
        </button>
      )}
      <button className="liquid-glass inline-flex items-center justify-center rounded-full px-3 py-2 text-[#171714] transition-transform hover:scale-105 active:scale-95" onClick={() => disconnect()} type="button">
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

