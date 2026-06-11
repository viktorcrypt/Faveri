"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import {
  builderBadgeAbi,
  guestbookAbi,
  miniEscrowAbi,
  tipJarAbi,
  usdcMiniEscrowAbi,
  usdcTipJarAbi
} from "@/generated/contracts";
import type { SupportedChainId } from "@/lib/chains";
import type { LaunchRecord } from "@/lib/useRegistryMetrics";

export type ChildContractActivity = {
  tips: bigint;
  messages: bigint;
  badgesMinted: bigint;
  escrowSteps: bigint;
  totalInteractions: bigint;
  byTemplate: Record<number, bigint>;
  escrowsSubmitted: number;
  escrowsApproved: number;
  escrowsClaimed: number;
  escrowsResolved: number;
  sampleSize: number;
  partialFailures: number;
  isLoading: boolean;
  error?: string;
};

const emptyActivity: ChildContractActivity = {
  tips: 0n,
  messages: 0n,
  badgesMinted: 0n,
  escrowSteps: 0n,
  totalInteractions: 0n,
  byTemplate: {},
  escrowsSubmitted: 0,
  escrowsApproved: 0,
  escrowsClaimed: 0,
  escrowsResolved: 0,
  sampleSize: 0,
  partialFailures: 0,
  isLoading: false
};

export function useChildContractActivity(records: LaunchRecord[], chainId?: number, templateIds?: number[]) {
  const publicClient = usePublicClient({ chainId: chainId as SupportedChainId | undefined });
  const templateKey = useMemo(() => templateIds?.join(",") ?? "all", [templateIds]);
  const scopedRecords = useMemo(() => {
    if (templateKey === "all") {
      return records;
    }

    const ids = new Set(templateKey.split(",").map(Number));
    return records.filter((record) => ids.has(record.templateId));
  }, [records, templateKey]);
  const [state, setState] = useState<ChildContractActivity>(emptyActivity);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!publicClient || scopedRecords.length === 0) {
        setState({ ...emptyActivity, sampleSize: scopedRecords.length });
        return;
      }

      setState((current) => ({ ...current, isLoading: true, error: undefined, sampleSize: scopedRecords.length }));

      try {
        const snapshots = await Promise.all(scopedRecords.map((record) => readActivitySnapshot(publicClient, record)));
        const next = snapshots.reduce(
          (acc, snapshot) => {
            if (!snapshot) {
              acc.partialFailures += 1;
              return acc;
            }

            acc.tips += snapshot.tips;
            acc.messages += snapshot.messages;
            acc.badgesMinted += snapshot.badgesMinted;
            acc.escrowSteps += snapshot.escrowSteps;
            acc.totalInteractions += snapshot.totalInteractions;
            acc.escrowsSubmitted += snapshot.escrowsSubmitted;
            acc.escrowsApproved += snapshot.escrowsApproved;
            acc.escrowsClaimed += snapshot.escrowsClaimed;
            acc.escrowsResolved += snapshot.escrowsResolved;
            acc.byTemplate[snapshot.templateId] = (acc.byTemplate[snapshot.templateId] ?? 0n) + snapshot.totalInteractions;
            return acc;
          },
          { ...emptyActivity, sampleSize: scopedRecords.length, isLoading: false }
        );

        if (!cancelled) {
          setState(next);
        }
      } catch (caught) {
        if (!cancelled) {
          setState({
            ...emptyActivity,
            sampleSize: scopedRecords.length,
            error: caught instanceof Error ? caught.message : "Could not read child contract activity."
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [publicClient, scopedRecords]);

  return state;
}

type ActivitySnapshot = {
  templateId: number;
  tips: bigint;
  messages: bigint;
  badgesMinted: bigint;
  escrowSteps: bigint;
  totalInteractions: bigint;
  escrowsSubmitted: number;
  escrowsApproved: number;
  escrowsClaimed: number;
  escrowsResolved: number;
};

async function readActivitySnapshot(publicClient: PublicClient, record: LaunchRecord): Promise<ActivitySnapshot | undefined> {
  try {
    if (record.templateId === 0) {
      const tips = await publicClient.readContract({
        address: record.deployedContract,
        abi: tipJarAbi,
        functionName: "tipsCount"
      });

      return countSnapshot(record.templateId, { tips: tips as bigint });
    }

    if (record.templateId === 5) {
      const tips = await publicClient.readContract({
        address: record.deployedContract,
        abi: usdcTipJarAbi,
        functionName: "tipsCount"
      });

      return countSnapshot(record.templateId, { tips: tips as bigint });
    }

    if (record.templateId === 1) {
      const messages = await publicClient.readContract({
        address: record.deployedContract,
        abi: guestbookAbi,
        functionName: "getMessagesCount"
      });

      return countSnapshot(record.templateId, { messages: messages as bigint });
    }

    if (record.templateId === 2) {
      const badgesMinted = await publicClient.readContract({
        address: record.deployedContract,
        abi: builderBadgeAbi,
        functionName: "totalMinted"
      });

      return countSnapshot(record.templateId, { badgesMinted: badgesMinted as bigint });
    }

    if (record.templateId === 4) {
      const status = await publicClient.readContract({
        address: record.deployedContract,
        abi: miniEscrowAbi,
        functionName: "status"
      });

      return escrowSnapshot(record.templateId, Number(status));
    }

    if (record.templateId === 6) {
      const status = await publicClient.readContract({
        address: record.deployedContract,
        abi: usdcMiniEscrowAbi,
        functionName: "status"
      });

      return escrowSnapshot(record.templateId, Number(status));
    }

    return countSnapshot(record.templateId, {});
  } catch {
    return undefined;
  }
}

function countSnapshot(templateId: number, values: Partial<Pick<ActivitySnapshot, "tips" | "messages" | "badgesMinted">>): ActivitySnapshot {
  const tips = values.tips ?? 0n;
  const messages = values.messages ?? 0n;
  const badgesMinted = values.badgesMinted ?? 0n;
  const totalInteractions = tips + messages + badgesMinted;

  return {
    templateId,
    tips,
    messages,
    badgesMinted,
    escrowSteps: 0n,
    totalInteractions,
    escrowsSubmitted: 0,
    escrowsApproved: 0,
    escrowsClaimed: 0,
    escrowsResolved: 0
  };
}

function escrowSnapshot(templateId: number, status: number): ActivitySnapshot {
  const escrowSteps = BigInt(escrowInteractionWeight(status));

  return {
    templateId,
    tips: 0n,
    messages: 0n,
    badgesMinted: 0n,
    escrowSteps,
    totalInteractions: escrowSteps,
    escrowsSubmitted: status >= 1 && status <= 3 ? 1 : 0,
    escrowsApproved: status === 2 || status === 3 ? 1 : 0,
    escrowsClaimed: status === 3 ? 1 : 0,
    escrowsResolved: status === 3 || status === 4 || status === 5 ? 1 : 0
  };
}

function escrowInteractionWeight(status: number) {
  if (status === 3) {
    return 3;
  }

  if (status === 2) {
    return 2;
  }

  if (status === 1 || status === 4 || status === 5) {
    return 1;
  }

  return 0;
}
