"use client";

import { useEffect, useState } from "react";
import { parseAbiItem, type Address } from "viem";
import { useChainId, usePublicClient } from "wagmi";
import { inkLauncherRegistryAbi } from "@/generated/contracts";
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

const launchEvent = parseAbiItem(
  "event ContractLaunched(address indexed deployer,address indexed deployedContract,uint8 indexed templateId,string templateName,string metadata,uint256 timestamp)"
);

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

export function useRegistryMetrics(limit = 8) {
  const chainId = useChainId();
  const publicClient = usePublicClient();
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

        let recent: LaunchRecord[] = [];

        try {
          const logs = await publicClient.getLogs({
            address: registryAddress,
            event: launchEvent,
            fromBlock: 0n,
            toBlock: "latest"
          });

          recent = logs
            .slice(-limit)
            .map((log) => ({
              deployer: log.args.deployer as Address,
              deployedContract: log.args.deployedContract as Address,
              templateId: Number(log.args.templateId),
              templateName: log.args.templateName ?? "",
              metadata: log.args.metadata ?? "",
              timestamp: BigInt(log.args.timestamp ?? 0)
            }))
            .reverse();
        } catch {
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
          recent = records.map(normalizeDeployment).reverse();
        }

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
