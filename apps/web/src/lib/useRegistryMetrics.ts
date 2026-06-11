"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useChainId, usePublicClient } from "wagmi";
import { inkLauncherRegistryAbi } from "@/generated/contracts";
import type { SupportedChainId } from "@/lib/chains";
import { getRegistryAddress } from "@/lib/registry";
import { templates } from "@/lib/templates";

export type LaunchRecord = {
  deployer: Address;
  deployedContract: Address;
  templateId: number;
  templateName: string;
  metadata: string;
  timestamp: bigint;
};

type MetricsState = {
  total: bigint;
  usage: Record<number, bigint>;
  recent: LaunchRecord[];
  isLoading: boolean;
  error?: string;
  registryAddress?: Address;
};

function normalizeDeployment(raw: any): LaunchRecord {
  return {
    deployer: raw.deployer ?? raw[0],
    deployedContract: raw.deployedContract ?? raw[1],
    templateId: Number(raw.templateId ?? raw[2]),
    templateName: raw.templateName ?? raw[3],
    metadata: raw.metadata ?? raw[4],
    timestamp: BigInt(raw.timestamp ?? raw[5])
  };
}

export function useRegistryMetrics(limit = 8, chainIdOverride?: SupportedChainId) {
  const connectedChainId = useChainId();
  const chainId = (chainIdOverride ?? connectedChainId) as SupportedChainId;
  const publicClient = usePublicClient({ chainId });
  const registryAddress = getRegistryAddress(chainId);
  const [state, setState] = useState<MetricsState>({
    total: 0n,
    usage: {},
    recent: [],
    isLoading: false,
    registryAddress
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!publicClient || !registryAddress) {
        setState({
          total: 0n,
          usage: {},
          recent: [],
          isLoading: false,
          registryAddress
        });
        return;
      }

      setState((current) => ({ ...current, isLoading: true, error: undefined, registryAddress }));

      try {
        const total = (await publicClient.readContract({
          address: registryAddress,
          abi: inkLauncherRegistryAbi,
          functionName: "getDeploymentsCount"
        })) as bigint;

        const usagePairs = await Promise.all(
          templates.map(async ({ id: templateId }) => {
            const count = (await publicClient.readContract({
              address: registryAddress,
              abi: inkLauncherRegistryAbi,
              functionName: "getTemplateUsage",
              args: [templateId]
            })) as bigint;
            return [templateId, count] as const;
          })
        );

        const usage = Object.fromEntries(usagePairs) as Record<number, bigint>;

        const totalNumber = Number(total);
        const start = Math.max(totalNumber - limit, 0);
        const records = await Promise.all(
          Array.from({ length: totalNumber - start }, (_, index) =>
            publicClient.readContract({
              address: registryAddress,
              abi: inkLauncherRegistryAbi,
              functionName: "getDeployment",
              args: [BigInt(start + index)]
            })
          )
        );
        const recent = records.map(normalizeDeployment).reverse();

        if (!cancelled) {
          setState({ total, usage, recent, isLoading: false, registryAddress });
        }
      } catch (caught) {
        if (!cancelled) {
          setState({
            total: 0n,
            usage: {},
            recent: [],
            isLoading: false,
            error: caught instanceof Error ? caught.message : "Could not load registry metrics.",
            registryAddress
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [limit, publicClient, registryAddress]);

  return state;
}
