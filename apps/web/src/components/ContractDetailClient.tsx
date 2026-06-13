"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Coins,
  ExternalLink,
  FileText,
  HandCoins,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldCheck,
  TriangleAlert
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatEther, isAddress, parseEther, parseUnits, type Abi, type Address } from "viem";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import {
  builderBadgeAbi,
  guestbookAbi,
  miniEscrowAbi,
  simpleERC20Abi,
  tipJarAbi,
  usdcMiniEscrowAbi,
  usdcTipJarAbi
} from "@/generated/contracts";
import { TemplateArt, templateVisuals } from "@/components/TemplateArt";
import { explorerLink } from "@/lib/chains";
import { erc20Abi, USDC_DECIMALS } from "@/lib/circle";
import { asAddress, escrowStatusLabels, formatDate, formatEth, formatToken, sameAddress, shortAddress } from "@/lib/format";
import { templateBySlug, type TemplateSlug } from "@/lib/templates";
import { useContractTx } from "@/lib/useContractTx";

type ContractData = Record<string, unknown> & {
  messages?: Array<{ author: Address; content: string; value: bigint; timestamp: bigint }>;
};

type RunTemplateAction = (
  functionName: string,
  args?: readonly unknown[],
  value?: bigint,
  targetAddress?: Address,
  targetAbi?: Abi
) => Promise<void>;

const templateAbi: Record<TemplateSlug, Abi> = {
  tipjar: tipJarAbi,
  guestbook: guestbookAbi,
  "builder-badge": builderBadgeAbi,
  "simple-erc20": simpleERC20Abi,
  "mini-escrow": miniEscrowAbi,
  "usdc-tipjar": usdcTipJarAbi,
  "usdc-mini-escrow": usdcMiniEscrowAbi
};

export function ContractDetailClient({ contractAddress, template }: { contractAddress: string; template: TemplateSlug }) {
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const selectedTemplate = templateBySlug[template] ?? templateBySlug.tipjar;
  const visual = templateVisuals[template] ?? templateVisuals.tipjar;
  const abi = templateAbi[template] ?? tipJarAbi;
  const validAddress = isAddress(contractAddress);
  const typedAddress = validAddress ? (contractAddress as Address) : undefined;
  const { runTx, error: txError, hash, isPending, setError } = useContractTx();
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<ContractData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  const ownerLike = useMemo(() => {
    if (template === "mini-escrow" || template === "usdc-mini-escrow") {
      return data.creator as string | undefined;
    }

    return data.owner as string | undefined;
  }, [data.creator, data.owner, template]);
  const isOwner = sameAddress(address, ownerLike);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!publicClient || !typedAddress) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(undefined);

      try {
        const next = await readTemplateData(publicClient, typedAddress, template, abi);
        if (!cancelled) {
          setData(next);
          setIsLoading(false);
        }
      } catch (caught) {
        if (!cancelled) {
          setLoadError(caught instanceof Error ? caught.message : "Could not read contract data.");
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [abi, publicClient, refreshKey, template, typedAddress]);

  async function runAction(
    functionName: string,
    args: readonly unknown[] = [],
    value?: bigint,
    targetAddress: Address = typedAddress as Address,
    targetAbi: Abi = abi
  ) {
    if (!typedAddress) {
      setError("Invalid contract address.");
      return;
    }

    await runTx({ address: targetAddress, abi: targetAbi, functionName, args, value });
    setRefreshKey((current) => current + 1);
  }

  if (!validAddress || !typedAddress) {
    return (
      <div className="panel p-6">
        <TriangleAlert className="h-5 w-5 text-[#a8752f]" aria-hidden="true" />
        <p className="mt-3 font-semibold text-[#171714]">Invalid contract address</p>
        <p className="mt-2 text-sm text-[#686b63]">Open a contract page with a valid EVM address.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link className="button-secondary" href={selectedTemplate.mode === "arc" ? "/arc" : "/ink"}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to {selectedTemplate.mode === "arc" ? "Arc" : "Ink"} rail
        </Link>
        <button className="button-secondary" disabled={isLoading} onClick={() => setRefreshKey((current) => current + 1)} type="button">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="panel reveal-in overflow-hidden p-4 [--index:0] md:p-5">
          <div className={`art-panel ${visual.artClass} relative aspect-[16/9] min-h-[260px] overflow-hidden rounded-[20px] border border-[#171714]/10`}>
            <TemplateArt slug={template} large />
            <div className="absolute left-4 top-4 rounded-md border border-[#171714]/10 bg-[#081011]/50 px-3 py-1 font-mono text-xs uppercase tracking-[0.14em] text-[#dce6d6] backdrop-blur">
              {visual.proof}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#081011] via-[#081011]/[0.72] to-transparent p-5">
              <p className="text-sm font-semibold text-[#b7f0bf]">{selectedTemplate.title}</p>
              <h1 className="mt-2 max-w-3xl break-words text-4xl font-semibold leading-none tracking-[-0.045em] text-[#fbfaf4] md:text-5xl">
                {selectedTemplate.contractName}
              </h1>
            </div>
          </div>
          <div className="grid gap-4 px-1 pt-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#777a72]">Contract address</p>
              <p className="mt-2 break-all font-mono text-sm leading-6 text-[#55584f]">{typedAddress}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {explorerLink(chainId, typedAddress) && (
                <a className="button-secondary" href={explorerLink(chainId, typedAddress)} rel="noreferrer" target="_blank">
                  Explorer
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
              {hash && explorerLink(chainId, hash, "tx") && (
                <a className="button-secondary" href={explorerLink(chainId, hash, "tx")} rel="noreferrer" target="_blank">
                  Last transaction
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>

        <aside className="panel reveal-in p-5 [--index:1]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#171714]">
            <ShieldCheck className="h-4 w-4 text-[#4e8f65]" aria-hidden="true" />
            Control model
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <SummaryRow label={template === "mini-escrow" || template === "usdc-mini-escrow" ? "Creator" : "Contract owner"} value={ownerLike ? shortAddress(ownerLike) : "Loading"} />
            <SummaryRow label="Connected wallet" value={address ? shortAddress(address) : "Not connected"} />
            <SummaryRow label="Launcher control" value="No admin access" />
            <SummaryRow label="Upgradeability" value="Not upgradeable" />
            <SummaryRow label="Registry data" value="public deployment metadata only" />
          </dl>
          <div className="mt-4 rounded-md border border-[#171714]/10 bg-white/[0.65] p-3 text-sm leading-6 text-[#55584f]">
            {isOwner ? "Owner actions are enabled for the connected wallet." : "Owner-only actions stay disabled unless the owner wallet is connected."}
          </div>
        </aside>
      </section>

      {(loadError || txError) && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-800">
          {loadError ?? txError}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="skeleton h-32 rounded-lg" />
          <div className="skeleton h-32 rounded-lg" />
          <div className="skeleton h-32 rounded-lg" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <TemplateReadout template={template} data={data} />
          <TemplateActions
            address={address}
            contractAddress={typedAddress}
            data={data}
            isOwner={isOwner}
            isPending={isPending}
            runAction={runAction}
            template={template}
          />
        </div>
      )}
    </div>
  );
}

async function readTemplateData(publicClient: any, address: Address, template: TemplateSlug, abi: Abi): Promise<ContractData> {
  if (template === "tipjar") {
    const [owner, projectName, description, minTip, totalTips, tipsCount] = await Promise.all([
      publicClient.readContract({ address, abi, functionName: "owner" }),
      publicClient.readContract({ address, abi, functionName: "projectName" }),
      publicClient.readContract({ address, abi, functionName: "description" }),
      publicClient.readContract({ address, abi, functionName: "minTip" }),
      publicClient.readContract({ address, abi, functionName: "totalTips" }),
      publicClient.readContract({ address, abi, functionName: "tipsCount" })
    ]);
    return { owner, projectName, description, minTip, totalTips, tipsCount };
  }

  if (template === "usdc-tipjar") {
    const [owner, usdcToken, projectName, description, minTip, totalTips, tipsCount] = await Promise.all([
      publicClient.readContract({ address, abi, functionName: "owner" }),
      publicClient.readContract({ address, abi, functionName: "usdcToken" }),
      publicClient.readContract({ address, abi, functionName: "projectName" }),
      publicClient.readContract({ address, abi, functionName: "description" }),
      publicClient.readContract({ address, abi, functionName: "minTip" }),
      publicClient.readContract({ address, abi, functionName: "totalTips" }),
      publicClient.readContract({ address, abi, functionName: "tipsCount" })
    ]);
    return { owner, usdcToken, projectName, description, minTip, totalTips, tipsCount };
  }

  if (template === "guestbook") {
    const [owner, wallName, messageFee, maxMessageLength, count] = await Promise.all([
      publicClient.readContract({ address, abi, functionName: "owner" }),
      publicClient.readContract({ address, abi, functionName: "wallName" }),
      publicClient.readContract({ address, abi, functionName: "messageFee" }),
      publicClient.readContract({ address, abi, functionName: "maxMessageLength" }),
      publicClient.readContract({ address, abi, functionName: "getMessagesCount" })
    ]);
    const total = Number(count);
    const start = Math.max(0, total - 5);
    const messages = await Promise.all(
      Array.from({ length: total - start }, (_, index) =>
        publicClient.readContract({ address, abi, functionName: "getMessage", args: [BigInt(start + index)] })
      )
    );
    return {
      owner,
      wallName,
      messageFee,
      maxMessageLength,
      messagesCount: count,
      messages: messages
        .map((message: any) => ({
          author: message.author ?? message[0],
          content: message.content ?? message[1],
          value: BigInt(message.value ?? message[2]),
          timestamp: BigInt(message.timestamp ?? message[3])
        }))
        .reverse()
    };
  }

  if (template === "builder-badge") {
    const [owner, name, symbol, transferable, totalMinted] = await Promise.all([
      publicClient.readContract({ address, abi, functionName: "owner" }),
      publicClient.readContract({ address, abi, functionName: "name" }),
      publicClient.readContract({ address, abi, functionName: "symbol" }),
      publicClient.readContract({ address, abi, functionName: "transferable" }),
      publicClient.readContract({ address, abi, functionName: "totalMinted" })
    ]);
    return { owner, name, symbol, transferable, totalMinted };
  }

  if (template === "simple-erc20") {
    const [owner, name, symbol, totalSupply, decimals, mintable] = await Promise.all([
      publicClient.readContract({ address, abi, functionName: "owner" }),
      publicClient.readContract({ address, abi, functionName: "name" }),
      publicClient.readContract({ address, abi, functionName: "symbol" }),
      publicClient.readContract({ address, abi, functionName: "totalSupply" }),
      publicClient.readContract({ address, abi, functionName: "decimals" }),
      publicClient.readContract({ address, abi, functionName: "mintable" })
    ]);
    return { owner, name, symbol, totalSupply, decimals, mintable };
  }

  if (template === "usdc-mini-escrow") {
    const summary = await publicClient.readContract({ address, abi, functionName: "getSummary" });
    return {
      creator: summary.escrowCreator ?? summary[0],
      usdcToken: summary.tokenAddress ?? summary[1],
      title: summary.escrowTitle ?? summary[2],
      metadataURI: summary.escrowMetadataURI ?? summary[3],
      worker: summary.fixedWorker ?? summary[4],
      selectedWorker: summary.currentWorker ?? summary[5],
      reward: BigInt(summary.escrowReward ?? summary[6]),
      deadline: BigInt(summary.escrowDeadline ?? summary[7]),
      proofURI: summary.currentProofURI ?? summary[8],
      status: Number(summary.currentStatus ?? summary[9])
    };
  }

  const summary = await publicClient.readContract({ address, abi, functionName: "getSummary" });
  return {
    creator: summary.escrowCreator ?? summary[0],
    title: summary.escrowTitle ?? summary[1],
    metadataURI: summary.escrowMetadataURI ?? summary[2],
    worker: summary.fixedWorker ?? summary[3],
    selectedWorker: summary.currentWorker ?? summary[4],
    reward: BigInt(summary.escrowReward ?? summary[5]),
    deadline: BigInt(summary.escrowDeadline ?? summary[6]),
    proofURI: summary.currentProofURI ?? summary[7],
    status: Number(summary.currentStatus ?? summary[8])
  };
}

function TemplateReadout({ template, data }: { template: TemplateSlug; data: ContractData }) {
  if (template === "tipjar") {
    return (
      <ReadoutPanel icon={HandCoins} title={String(data.projectName ?? "Tip Jar")}>
        <InfoLine label="Description" value={String(data.description ?? "")} />
        <InfoLine label="Minimum tip" value={formatEth(data.minTip as bigint)} />
        <InfoLine label="Total tips" value={formatEth(data.totalTips as bigint)} />
        <InfoLine label="Tips count" value={String(data.tipsCount ?? "0")} />
      </ReadoutPanel>
    );
  }

  if (template === "usdc-tipjar") {
    return (
      <ReadoutPanel icon={HandCoins} title={String(data.projectName ?? "USDC Tip Jar")}>
        <InfoLine label="Description" value={String(data.description ?? "")} />
        <InfoLine label="USDC token" value={data.usdcToken ? shortAddress(String(data.usdcToken)) : "Unknown"} />
        <InfoLine label="Minimum tip" value={`${formatToken(data.minTip as bigint, USDC_DECIMALS)} USDC`} />
        <InfoLine label="Total tips" value={`${formatToken(data.totalTips as bigint, USDC_DECIMALS)} USDC`} />
        <InfoLine label="Tips count" value={String(data.tipsCount ?? "0")} />
      </ReadoutPanel>
    );
  }

  if (template === "guestbook") {
    return (
      <ReadoutPanel icon={MessageSquareText} title={String(data.wallName ?? "Guestbook")}>
        <InfoLine label="Message fee" value={formatEth(data.messageFee as bigint)} />
        <InfoLine label="Max length" value={String(data.maxMessageLength ?? "0")} />
        <InfoLine label="Messages" value={String(data.messagesCount ?? "0")} />
        <div className="mt-5 space-y-3">
          {(data.messages ?? []).length === 0 ? (
            <div className="rounded-md border border-dashed border-[#171714]/[0.15] p-4 text-sm text-[#686b63]">No messages yet.</div>
          ) : (
            data.messages?.map((message, index) => (
              <div key={`${message.author}-${message.timestamp.toString()}-${index}`} className="rounded-md border border-[#171714]/10 bg-white/[0.65] p-3">
                <p className="text-sm text-[#171714]">{message.content}</p>
                <p className="mt-2 text-xs text-[#777a72]">
                  {shortAddress(message.author)} / {formatEth(message.value)} / {formatDate(message.timestamp)}
                </p>
              </div>
            ))
          )}
        </div>
      </ReadoutPanel>
    );
  }

  if (template === "builder-badge") {
    return (
      <ReadoutPanel icon={BadgeCheck} title={String(data.name ?? "Builder Badge")}>
        <InfoLine label="Symbol" value={String(data.symbol ?? "")} />
        <InfoLine label="Transferability" value={data.transferable ? "Transferable" : "Soulbound after mint"} />
        <InfoLine label="Total minted" value={String(data.totalMinted ?? "0")} />
      </ReadoutPanel>
    );
  }

  if (template === "simple-erc20") {
    const decimals = Number(data.decimals ?? 18);
    return (
      <ReadoutPanel icon={Coins} title={String(data.name ?? "Simple ERC20")}>
        <InfoLine label="Symbol" value={String(data.symbol ?? "")} />
        <InfoLine label="Total supply" value={formatToken(data.totalSupply as bigint, decimals)} />
        <InfoLine label="Supply policy" value={data.mintable ? "Owner mintable" : "Fixed supply"} />
      </ReadoutPanel>
    );
  }

  const status = Number(data.status ?? 0);
  const isUSDC = template === "usdc-mini-escrow";
  return (
    <ReadoutPanel icon={LockKeyhole} title={String(data.title ?? (isUSDC ? "USDC Mini Escrow" : "Mini Escrow"))}>
      <InfoLine label="Metadata URI" value={String(data.metadataURI ?? "")} />
      {isUSDC && <InfoLine label="USDC token" value={data.usdcToken ? shortAddress(String(data.usdcToken)) : "Unknown"} />}
      <InfoLine label="Fixed worker" value={data.worker && String(data.worker) !== "0x0000000000000000000000000000000000000000" ? shortAddress(String(data.worker)) : "Open submission"} />
      <InfoLine label="Selected worker" value={data.selectedWorker && String(data.selectedWorker) !== "0x0000000000000000000000000000000000000000" ? shortAddress(String(data.selectedWorker)) : "None"} />
      <InfoLine label="Reward" value={isUSDC ? `${formatToken(data.reward as bigint, USDC_DECIMALS)} USDC` : formatEth(data.reward as bigint)} />
      <InfoLine label="Deadline" value={formatDate(data.deadline as bigint)} />
      <InfoLine label="Status" value={escrowStatusLabels[status] ?? "Unknown"} />
      <InfoLine label="Proof URI" value={String(data.proofURI ?? "None")} />
    </ReadoutPanel>
  );
}

function TemplateActions({
  address,
  contractAddress,
  data,
  isOwner,
  isPending,
  runAction,
  template
}: {
  address?: Address;
  contractAddress: Address;
  data: ContractData;
  isOwner: boolean;
  isPending: boolean;
  runAction: RunTemplateAction;
  template: TemplateSlug;
}) {
  if (template === "tipjar") {
    return <TipJarActions address={address} data={data} disabled={isPending} isOwner={isOwner} runAction={runAction} />;
  }

  if (template === "usdc-tipjar") {
    return <USDCTipJarActions address={address} contractAddress={contractAddress} data={data} disabled={isPending} isOwner={isOwner} runAction={runAction} />;
  }

  if (template === "guestbook") {
    return <GuestbookActions address={address} data={data} disabled={isPending} isOwner={isOwner} runAction={runAction} />;
  }

  if (template === "builder-badge") {
    return <BadgeActions disabled={isPending || !isOwner} runAction={runAction} />;
  }

  if (template === "simple-erc20") {
    return <TokenActions data={data} disabled={isPending || !isOwner || !data.mintable} runAction={runAction} />;
  }

  return <EscrowActions address={address} data={data} disabled={isPending} isCreator={isOwner} runAction={runAction} usdc={template === "usdc-mini-escrow"} />;
}

function TipJarActions({
  address,
  data,
  disabled,
  isOwner,
  runAction
}: {
  address?: Address;
  data: ContractData;
  disabled: boolean;
  isOwner: boolean;
  runAction: RunTemplateAction;
}) {
  const [message, setMessage] = useState("Thanks for the Ink tooling");
  const [amount, setAmount] = useState("0.001");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [minTip, setMinTip] = useState("");

  return (
    <ActionPanel title="TipJar actions">
      <Field label="Tip message" value={message} onChange={setMessage} />
      <Field label="Tip amount in ETH" value={amount} onChange={setAmount} />
      <button className="button-primary" disabled={disabled} onClick={() => runAction("tip", [message], parseEther(amount || "0"))} type="button">
        <Send className="h-4 w-4" aria-hidden="true" />
        Send tip
      </button>

      <Divider />
      <Field label="Withdraw recipient" helper="Blank uses the connected owner wallet." value={withdrawTo} onChange={setWithdrawTo} />
      <button
        className="button-secondary"
        disabled={disabled || !isOwner || !address}
        onClick={() => runAction("withdraw", [asAddress(withdrawTo || address)])}
        type="button"
      >
        Owner withdraw
      </button>

      <Divider />
      <Field label="Project name" value={projectName} onChange={setProjectName} />
      <Field label="Description" value={description} onChange={setDescription} />
      <button
        className="button-secondary"
        disabled={disabled || !isOwner}
        onClick={() => runAction("setMetadata", [projectName || data.projectName, description || data.description])}
        type="button"
      >
        Edit metadata
      </button>
      <Field label="Minimum tip in ETH" value={minTip} onChange={setMinTip} />
      <button className="button-secondary" disabled={disabled || !isOwner} onClick={() => runAction("setMinTip", [parseEther(minTip || "0")])} type="button">
        Update min tip
      </button>
    </ActionPanel>
  );
}

function USDCTipJarActions({
  address,
  contractAddress,
  data,
  disabled,
  isOwner,
  runAction
}: {
  address?: Address;
  contractAddress: Address;
  data: ContractData;
  disabled: boolean;
  isOwner: boolean;
  runAction: RunTemplateAction;
}) {
  const [message, setMessage] = useState("USDC support for shipped work");
  const [amount, setAmount] = useState("1");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [minTip, setMinTip] = useState("");
  const usdcToken = data.usdcToken as Address | undefined;

  async function sendUSDCTip() {
    const parsed = parseUnits(amount || "0", USDC_DECIMALS);
    if (!usdcToken) {
      return;
    }

    await runAction("approve", [contractAddress, parsed], undefined, usdcToken, erc20Abi);
    await runAction("tip", [parsed, message]);
  }

  return (
    <ActionPanel title="USDCTipJar actions">
      <Field label="Tip message" value={message} onChange={setMessage} />
      <Field label="Tip amount in USDC" value={amount} onChange={setAmount} />
      <p className="text-xs leading-5 text-[#777c73]">USDC tips use two wallet confirmations: approve this contract, then send the tip.</p>
      <button className="button-primary" disabled={disabled || !usdcToken} onClick={sendUSDCTip} type="button">
        <Send className="h-4 w-4" aria-hidden="true" />
        Approve USDC, then send tip
      </button>

      <Divider />
      <Field label="Withdraw recipient" helper="Blank uses the connected owner wallet." value={withdrawTo} onChange={setWithdrawTo} />
      <button
        className="button-secondary"
        disabled={disabled || !isOwner || !address}
        onClick={() => runAction("withdraw", [asAddress(withdrawTo || address)])}
        type="button"
      >
        Owner withdraw USDC
      </button>

      <Divider />
      <Field label="Project name" value={projectName} onChange={setProjectName} />
      <Field label="Description" value={description} onChange={setDescription} />
      <button
        className="button-secondary"
        disabled={disabled || !isOwner}
        onClick={() => runAction("setMetadata", [projectName || data.projectName, description || data.description])}
        type="button"
      >
        Edit metadata
      </button>
      <Field label="Minimum tip in USDC" value={minTip} onChange={setMinTip} />
      <button className="button-secondary" disabled={disabled || !isOwner} onClick={() => runAction("setMinTip", [parseUnits(minTip || "0", USDC_DECIMALS)])} type="button">
        Update min tip
      </button>
    </ActionPanel>
  );
}

function GuestbookActions({
  address,
  data,
  disabled,
  isOwner,
  runAction
}: {
  address?: Address;
  data: ContractData;
  disabled: boolean;
  isOwner: boolean;
  runAction: RunTemplateAction;
}) {
  const [content, setContent] = useState("Shipping useful tools on Ink");
  const [fee, setFee] = useState(() => formatEther((data.messageFee as bigint | undefined) ?? 0n));
  const [withdrawTo, setWithdrawTo] = useState("");
  const [wallName, setWallName] = useState("");

  return (
    <ActionPanel title="Guestbook actions">
      <Field label="Message" value={content} onChange={setContent} textarea />
      <Field label="Fee in ETH" value={fee} onChange={setFee} />
      <button className="button-primary" disabled={disabled} onClick={() => runAction("postMessage", [content], parseEther(fee || "0"))} type="button">
        Post message
      </button>

      <Divider />
      <Field label="Withdraw recipient" helper="Blank uses the connected owner wallet." value={withdrawTo} onChange={setWithdrawTo} />
      <button
        className="button-secondary"
        disabled={disabled || !isOwner || !address}
        onClick={() => runAction("withdraw", [asAddress(withdrawTo || address)])}
        type="button"
      >
        Owner withdraw
      </button>
      <Field label="Wall name" value={wallName} onChange={setWallName} />
      <button className="button-secondary" disabled={disabled || !isOwner} onClick={() => runAction("setWallName", [wallName || data.wallName])} type="button">
        Rename wall
      </button>
      <button className="button-secondary" disabled={disabled || !isOwner} onClick={() => runAction("setMessageFee", [parseEther(fee || "0")])} type="button">
        Update message fee
      </button>
    </ActionPanel>
  );
}

function BadgeActions({
  disabled,
  runAction
}: {
  disabled: boolean;
  runAction: RunTemplateAction;
}) {
  const [recipient, setRecipient] = useState("");
  const [baseURI, setBaseURI] = useState("");

  return (
    <ActionPanel title="BuilderBadge actions">
      <Field label="Recipient address" value={recipient} onChange={setRecipient} />
      <button className="button-primary" disabled={disabled || !isAddress(recipient)} onClick={() => runAction("mint", [recipient as Address])} type="button">
        Mint badge
      </button>
      <Divider />
      <Field label="New base URI" value={baseURI} onChange={setBaseURI} />
      <button className="button-secondary" disabled={disabled || !baseURI} onClick={() => runAction("setBaseURI", [baseURI])} type="button">
        Update base URI
      </button>
    </ActionPanel>
  );
}

function TokenActions({
  data,
  disabled,
  runAction
}: {
  data: ContractData;
  disabled: boolean;
  runAction: RunTemplateAction;
}) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("1000");
  const decimals = Number(data.decimals ?? 18);

  return (
    <ActionPanel title="SimpleERC20 actions">
      <div className={`rounded-md border p-3 text-sm ${data.mintable ? "border-[#4e8f65]/25 bg-[#4e8f65]/10 text-[#31593f]" : "border-[#a8752f]/20 bg-[#fff2ce]/70 text-[#6d4b13]"}`}>
        {data.mintable ? "This token is owner-mintable." : "This token is fixed supply. mint() will revert."}
      </div>
      <Field label="Mint recipient" value={recipient} onChange={setRecipient} />
      <Field label="Mint amount" value={amount} onChange={setAmount} />
      <button
        className="button-primary"
        disabled={disabled || !isAddress(recipient)}
        onClick={() => runAction("mint", [recipient as Address, parseUnits(amount || "0", decimals)])}
        type="button"
      >
        Mint tokens
      </button>
    </ActionPanel>
  );
}

function EscrowActions({
  address,
  data,
  disabled,
  isCreator,
  runAction,
  usdc = false
}: {
  address?: Address;
  data: ContractData;
  disabled: boolean;
  isCreator: boolean;
  runAction: RunTemplateAction;
  usdc?: boolean;
}) {
  const [proofURI, setProofURI] = useState("ipfs://proof");
  const status = Number(data.status ?? 0);
  const selectedWorker = String(data.selectedWorker ?? "");
  const canClaim = sameAddress(address, selectedWorker) && status === 2;

  return (
    <ActionPanel title={usdc ? "USDCMiniEscrow actions" : "MiniEscrow actions"}>
      <Field label="Proof URI" value={proofURI} onChange={setProofURI} />
      <button className="button-primary" disabled={disabled || status !== 0 || !proofURI} onClick={() => runAction("submitProof", [proofURI])} type="button">
        Submit proof
      </button>
      <Divider />
      <button className="button-secondary" disabled={disabled || !isCreator || status !== 1} onClick={() => runAction("approve")} type="button">
        Creator approve
      </button>
      <button className="button-primary" disabled={disabled || !canClaim} onClick={() => runAction("claim")} type="button">
        Worker claim
      </button>
      <Divider />
      <button className="button-danger" disabled={disabled || !isCreator || status !== 0} onClick={() => runAction("cancelBeforeSubmission")} type="button">
        Cancel before submission
      </button>
      <button className="button-danger" disabled={disabled || !isCreator || status !== 0} onClick={() => runAction("refundAfterDeadline")} type="button">
        Refund after deadline
      </button>
    </ActionPanel>
  );
}

function ReadoutPanel({
  children,
  icon: Icon,
  title
}: {
  children: React.ReactNode;
  icon: typeof FileText;
  title: string;
}) {
  return (
    <section className="panel overflow-hidden p-5">
      <div className="flex items-center gap-3 border-b border-[#171714]/10 pb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-[#171714]/10 bg-white/[0.65]">
          <Icon className="h-5 w-5 text-[#4e8f65]" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[#777a72]">Contract state</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[#171714]">{title}</h2>
        </div>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function ActionPanel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="panel p-5">
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#171714]">{title}</h2>
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#171714]/10 pb-3 text-sm last:border-0 last:pb-0">
      <dt className="text-[#777a72]">{label}</dt>
      <dd className="max-w-[62%] break-words text-right text-[#171714]">{value}</dd>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#171714]/10 pb-3 last:border-0 last:pb-0">
      <dt className="text-[#777a72]">{label}</dt>
      <dd className="text-right text-[#171714]">{value}</dd>
    </div>
  );
}

function Field({
  helper,
  label,
  onChange,
  textarea = false,
  value
}: {
  helper?: string;
  label: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  value: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {textarea ? (
        <textarea className="field min-h-24 resize-y" value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="field" value={value} onChange={(event) => onChange(event.target.value)} />
      )}
      {helper && <span className="mt-1 block text-xs text-[#777a72]">{helper}</span>}
    </label>
  );
}

function Divider() {
  return <div className="h-px bg-[#171714]/10" />;
}



