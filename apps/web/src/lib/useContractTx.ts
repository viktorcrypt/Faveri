"use client";

import { useCallback, useState } from "react";
import type { Abi, Address, Hash } from "viem";
import { useChainId, usePublicClient, useWriteContract } from "wagmi";

type TxRequest = {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
};

export function useContractTx() {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [hash, setHash] = useState<Hash>();
  const [error, setError] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  const runTx = useCallback(
    async (request: TxRequest) => {
      if (!publicClient) {
        throw new Error("No public client for the current chain.");
      }

      setError(undefined);
      setIsPending(true);

      try {
        const txHash = await writeContractAsync({
          ...request,
          chainId
        });
        setHash(txHash);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { hash: txHash, receipt };
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Transaction failed.";
        setError(message);
        throw caught;
      } finally {
        setIsPending(false);
      }
    },
    [chainId, publicClient, writeContractAsync]
  );

  return { runTx, hash, error, isPending, setError };
}
