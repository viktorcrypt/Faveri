"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Bolt,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Route,
  ShieldCheck,
  TriangleAlert,
  WalletCards
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decodeEventLog, isAddress, parseEther, parseUnits, zeroAddress, type Address, type Hash } from "viem";
import { useAccount, useChainId, usePublicClient, useSwitchChain } from "wagmi";
import { TemplateArt, templateVisuals } from "@/components/TemplateArt";
import { inkLauncherRegistryAbi } from "@/generated/contracts";
import { arcTestnet, explorerLink, primaryInkChain } from "@/lib/chains";
import {
  ARC_GATEWAY_DOMAIN,
  erc20Abi,
  gatewayWalletAbi,
  isArcTestnet,
  resolveGatewayWalletAddress,
  resolveUSDCAddress,
  USDC_DECIMALS
} from "@/lib/circle";
import { formatDate, formatToken, shortAddress } from "@/lib/format";
import { getRegistryAddress, registrySetupMessage } from "@/lib/registry";
import { isUSDCTemplate, templateSlugFromId, templates, templatesForMode, type LauncherMode, type TemplateSlug } from "@/lib/templates";
import { useContractTx } from "@/lib/useContractTx";
import { useRegistryMetrics } from "@/lib/useRegistryMetrics";

type SuccessState = {
  address: Address;
  hash: Hash;
  template: TemplateSlug;
};

const initialForms = {
  tipjar: {
    projectName: "Ink Builder Fund",
    description: "Tips for public goods work on Ink",
    minTip: "0.001"
  },
  guestbook: {
    wallName: "Ink Builder Wall",
    messageFee: "0.0005",
    maxMessageLength: "160"
  },
  "builder-badge": {
    name: "Ink Builder Badge",
    symbol: "INKB",
    baseURI: "ipfs://metadata-folder/",
    transferable: false
  },
  "simple-erc20": {
    name: "Builder Signal",
    symbol: "SIGNAL",
    initialSupply: "1000000",
    mintable: false
  },
  "mini-escrow": {
    title: "Landing page polish sprint",
    metadataURI: "ipfs://quest-metadata",
    worker: "",
    reward: "0.01",
    deadlineHours: "72"
  },
  "usdc-tipjar": {
    projectName: "Arc Builder Fund",
    description: "USDC support for shipped work on Arc",
    minTip: "1"
  },
  "usdc-mini-escrow": {
    title: "USDC integration milestone",
    metadataURI: "ipfs://arc-usdc-milestone",
    worker: "",
    reward: "25",
    deadlineHours: "72"
  }
};

export function RailLauncher({ mode }: { mode: LauncherMode }) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const registryAddress = getRegistryAddress(chainId);
  const usdcAddress = resolveUSDCAddress(chainId);
  const targetChainId = mode === "arc" ? arcTestnet.id : primaryInkChain.id;
  const metrics = useRegistryMetrics(8, targetChainId);
  const { runTx, hash, error, isPending, setError } = useContractTx();
  const modeTemplates = useMemo(() => templatesForMode(mode), [mode]);
  const [selected, setSelected] = useState<TemplateSlug>(mode === "arc" ? "usdc-tipjar" : "tipjar");
  const [forms, setForms] = useState(initialForms);
  const [success, setSuccess] = useState<SuccessState>();
  const [contractsVisible, setContractsVisible] = useState(false);
  const contractsRef = useRef<HTMLElement | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.slug === selected) ?? modeTemplates[0] ?? templates[0],
    [modeTemplates, selected]
  );

  const currentChainReady =
    mode === "ink" ? chainId === primaryInkChain.id || chainId === 763373 || chainId === 31337 : chainId === arcTestnet.id || chainId === 31337;

  useEffect(() => {
    const first = modeTemplates[0];
    if (first && !modeTemplates.some((template) => template.slug === selected)) {
      setSelected(first.slug);
      setSuccess(undefined);
      setError(undefined);
    }
  }, [modeTemplates, selected, setError]);

  useEffect(() => {
    const node = contractsRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setContractsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-14% 0px -14% 0px", threshold: 0.12 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  function updateForm(slug: TemplateSlug, patch: Record<string, string | boolean>) {
    setForms((current) => ({
      ...current,
      [slug]: {
        ...current[slug],
        ...patch
      }
    }));
  }

  function validate() {
    if (!isConnected || !address) {
      return "Connect a wallet before deploying.";
    }

    if (!registryAddress) {
      return registrySetupMessage(chainId);
    }

    if (!currentChainReady) {
      return mode === "arc" ? "Switch to Arc Testnet before deploying Arc settlement templates." : "Switch to Ink before deploying Ink templates.";
    }

    if (isUSDCTemplate(selected) && !usdcAddress) {
      return "Set NEXT_PUBLIC_USDC_ADDRESS_* before deploying USDC templates.";
    }

    if (selected === "guestbook" && Number(forms.guestbook.maxMessageLength) <= 0) {
      return "Guestbook max message length must be greater than zero.";
    }

    if (selected === "mini-escrow") {
      if (Number(forms["mini-escrow"].reward) <= 0) {
        return "Mini Escrow reward must be greater than zero.";
      }

      if (Number(forms["mini-escrow"].deadlineHours) <= 0) {
        return "Mini Escrow deadline must be in the future.";
      }

      const worker = forms["mini-escrow"].worker.trim();
      if (worker.length > 0 && !isAddress(worker)) {
        return "Worker must be a valid address, or blank for open submissions.";
      }
    }

    if (selected === "usdc-mini-escrow") {
      if (Number(forms["usdc-mini-escrow"].reward) <= 0) {
        return "USDC Mini Escrow reward must be greater than zero.";
      }

      if (Number(forms["usdc-mini-escrow"].deadlineHours) <= 0) {
        return "USDC Mini Escrow deadline must be in the future.";
      }

      const worker = forms["usdc-mini-escrow"].worker.trim();
      if (worker.length > 0 && !isAddress(worker)) {
        return "Worker must be a valid address, or blank for open submissions.";
      }
    }

    return undefined;
  }

  async function deploySelected() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!registryAddress) {
      return;
    }

    setSuccess(undefined);

    const now = Math.floor(Date.now() / 1000);
    let functionName = "";
    let args: readonly unknown[] = [];
    let value: bigint | undefined;

    if (selected === "tipjar") {
      const form = forms.tipjar;
      functionName = "deployTipJar";
      args = [form.projectName, form.description, parseEther(form.minTip || "0")];
    }

    if (selected === "guestbook") {
      const form = forms.guestbook;
      functionName = "deployGuestbook";
      args = [form.wallName, parseEther(form.messageFee || "0"), BigInt(form.maxMessageLength || "0")];
    }

    if (selected === "builder-badge") {
      const form = forms["builder-badge"];
      functionName = "deployBuilderBadge";
      args = [form.name, form.symbol, form.baseURI, form.transferable];
    }

    if (selected === "simple-erc20") {
      const form = forms["simple-erc20"];
      functionName = "deploySimpleERC20";
      args = [form.name, form.symbol, parseUnits(form.initialSupply || "0", 18), form.mintable];
    }

    if (selected === "mini-escrow") {
      const form = forms["mini-escrow"];
      functionName = "deployMiniEscrow";
      args = [
        form.title,
        form.metadataURI,
        form.worker.trim() ? (form.worker.trim() as Address) : zeroAddress,
        BigInt(now + Math.floor(Number(form.deadlineHours) * 3600))
      ];
      value = parseEther(form.reward || "0");
    }

    if (selected === "usdc-tipjar") {
      const form = forms["usdc-tipjar"];
      functionName = "deployUSDCTipJar";
      args = [usdcAddress, form.projectName, form.description, parseUnits(form.minTip || "0", USDC_DECIMALS)];
    }

    if (selected === "usdc-mini-escrow") {
      const form = forms["usdc-mini-escrow"];
      const reward = parseUnits(form.reward || "0", USDC_DECIMALS);
      functionName = "deployUSDCMiniEscrow";
      args = [
        usdcAddress,
        form.title,
        form.metadataURI,
        form.worker.trim() ? (form.worker.trim() as Address) : zeroAddress,
        BigInt(now + Math.floor(Number(form.deadlineHours) * 3600)),
        reward
      ];

      await runTx({
        address: usdcAddress as Address,
        abi: erc20Abi,
        functionName: "approve",
        args: [registryAddress, reward]
      });
    }

    const result = await runTx({
      address: registryAddress,
      abi: inkLauncherRegistryAbi,
      functionName,
      args,
      value
    });

    const launched = result.receipt.logs
      .map((log) => {
        try {
          return decodeEventLog({
            abi: inkLauncherRegistryAbi,
            data: log.data,
            topics: log.topics
          });
        } catch {
          return undefined;
        }
      })
      .find((decoded) => decoded?.eventName === "ContractLaunched");

    const deployedContract = launched?.args
      ? ((launched.args as unknown as Record<string, unknown>).deployedContract as Address)
      : undefined;

    if (!deployedContract) {
      setError("Deployment mined, but ContractLaunched event was not found.");
      return;
    }

    setSuccess({ address: deployedContract, hash: result.hash, template: selected });
  }

  return (
    <main className={`route-page route-page-${mode} min-h-[100dvh] px-4 pb-14 pt-24 sm:px-6 lg:px-10`}>
      <div className="route-grid" aria-hidden="true" />
      <div className="mx-auto max-w-[1500px] space-y-10">
        <section className="route-hero relative overflow-hidden rounded-[36px] p-5 md:p-8 lg:p-10">
          <div className="route-hero-lines" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div className="reveal-in space-y-6 [--index:0]">
              <Link className="inline-flex items-center gap-2 text-sm font-semibold text-[#555a52] transition hover:text-[#171714]" href="/">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to rail selector
              </Link>
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#687064]">
                  {mode === "arc" ? "Arc rail / USDC settlement" : "Ink rail / contract launch"}
                </p>
                <h1 className="mt-4 max-w-[12ch] text-[clamp(3rem,7vw,7rem)] font-semibold leading-[0.89] tracking-[-0.065em] text-[#171714]">
                  {mode === "arc" ? "Stablecoin routes for real work." : "Builder contracts without admin drag."}
                </h1>
              </div>
              <p className="max-w-[54ch] text-base leading-7 text-[#555a52] md:text-lg">
                {mode === "arc"
                  ? "Deploy USDC-native templates on Arc, fund Gateway liquidity, and keep settlement control in the creator wallet."
                  : "Choose a contract kit, tune the parameters, sign once, and launch a user-owned contract on Ink."}
              </p>
              <div className="flex flex-wrap gap-3">
                <a className="route-button-primary" href="#contracts">
                  Select contract
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <Link className="route-button-secondary" href={mode === "arc" ? "/ink" : "/arc"}>
                  Switch to {mode === "arc" ? "Ink" : "Arc"} rail
                </Link>
              </div>
            </div>

            <div className="route-map reveal-in relative min-h-[390px] overflow-hidden rounded-[30px] p-5 [--index:1]">
              <div className="route-map-track" aria-hidden="true" />
              <div className="relative flex h-full min-h-[350px] flex-col justify-between">
                <div className="grid gap-3 sm:grid-cols-3">
                  <RouteMetric label="Launches" value={metrics.total.toString()} />
                  <RouteMetric label="Templates" value={String(modeTemplates.length)} />
                  <RouteMetric label="Admin rights" value="0" />
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#7b8178]">Active route</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#171714]">
                      {mode === "arc" ? "Arc Testnet / USDC" : "Ink Mainnet / ETH"}
                    </p>
                  </div>
                  <div className="rounded-full bg-[#171714] px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-[#f8f6ef]">
                    {!isConnected ? "connect wallet" : currentChainReady ? "wallet on route" : "switch needed"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="contracts" ref={contractsRef} className="space-y-6">
          <div className="flex flex-col justify-between gap-5 border-b border-[#171714]/10 pb-5 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#777c73]">Contract kits</p>
              <h2 className="mt-2 max-w-3xl text-4xl font-semibold leading-[0.96] tracking-[-0.05em] text-[#171714] md:text-6xl">
                {mode === "arc" ? "Pick a settlement module." : "Pick the primitive for this launch."}
              </h2>
            </div>
            <p className="max-w-[38ch] text-sm leading-6 text-[#5d625a]">
              {mode === "arc"
                ? "Arc focuses the surface on USDC flows and Gateway funding."
                : "Ink keeps the core builder templates clean, owner-first, and direct."}
            </p>
          </div>

          <div className={`grid auto-rows-fr gap-4 sm:grid-cols-2 ${mode === "arc" ? "lg:grid-cols-2" : "lg:grid-cols-3 2xl:grid-cols-5"}`}>
            {modeTemplates.map((template, index) => {
              const Icon = template.icon;
              const active = selected === template.slug;
              const meta = templateVisuals[template.slug];
              return (
                <button
                  key={template.slug}
                  className={`contract-route-card contract-drop group flex min-h-[330px] flex-col rounded-[28px] p-3 text-left transition duration-300 active:translate-y-[1px] ${contractsVisible ? "contract-drop-visible" : ""} ${meta.artClass} ${
                    active ? "contract-route-card-active" : ""
                  }`}
                  onClick={() => {
                    setSelected(template.slug);
                    setSuccess(undefined);
                  }}
                  style={{ "--index": index } as CSSProperties}
                  type="button"
                >
                  <span className={`art-panel ${meta.artClass} relative block aspect-[16/10] overflow-hidden rounded-[22px]`}>
                    <TemplateArt slug={template.slug} />
                    <span className="absolute left-3 top-3 rounded-full bg-[#081011]/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#e6eee2] backdrop-blur">
                      {meta.proof}
                    </span>
                    <span className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-white/35 backdrop-blur transition duration-300 group-hover:scale-105">
                      <Icon className="h-4 w-4 text-[#171714]" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="flex flex-1 flex-col px-2 pb-2 pt-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#777c73]">{meta.surface}</span>
                    <span className="mt-3 block text-2xl font-semibold tracking-[-0.035em] text-[#171714]">{template.title}</span>
                    <span className="mt-3 block text-sm leading-6 text-[#5d625a]">{template.description}</span>
                    <span className="mt-auto flex items-center justify-between pt-6">
                      <span className="text-xs font-semibold text-[#555a52]">{meta.signal}</span>
                      <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-[#171714]" : "bg-[#171714]/20"}`} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="launch-workbench grid items-start gap-5 rounded-[34px] p-4 md:p-5 xl:grid-cols-[0.92fr_1.08fr]">
          <div className={`art-panel ${templateVisuals[selected].artClass} relative aspect-[16/10] overflow-hidden rounded-[28px]`}>
            <TemplateArt slug={selected} large />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#081011] via-[#081011]/70 to-transparent p-6">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#dce6d6]">{selectedTemplate.contractName}</p>
              <h2 className="mt-3 max-w-[11ch] text-5xl font-semibold leading-[0.9] tracking-[-0.06em] text-[#f8f6ef]">
                {selectedTemplate.title}
              </h2>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[28px] bg-white/[0.88] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#777c73]">Configure route</p>
                  <h3 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#171714]">Set the launch parameters.</h3>
                </div>
                <span className="w-fit rounded-full bg-[#171714]/[0.06] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#555a52]">
                  {selectedTemplate.currency} / T{selectedTemplate.id}
                </span>
              </div>
              <TemplateFields selected={selected} forms={forms} updateForm={updateForm} />
            </div>

            <aside className="rounded-[28px] bg-[#171714] p-5 text-[#f8f6ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-[#b7d8b8]" aria-hidden="true" />
                Launch preview
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <PreviewRow label="Contract owner" value={address ? shortAddress(address) : "connected wallet"} inverted />
                <PreviewRow label="Launcher admin rights" value="none" inverted />
                <PreviewRow label="Upgradeability" value="none" inverted />
                <PreviewRow label="Settlement asset" value={selectedTemplate.currency} inverted />
                {mode === "arc" && <PreviewRow label="Gateway layer" value="available" inverted />}
              </dl>
              <div className="mt-5 rounded-[18px] bg-white/[0.07] p-4 text-sm leading-6 text-white/72">
                <Info className="mb-2 h-4 w-4 text-white/72" aria-hidden="true" />
                {selectedTemplate.notice}
              </div>
            </aside>

            {!registryAddress && (
              <InlineWarning>
                <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                {registrySetupMessage(chainId)}
              </InlineWarning>
            )}

            {!currentChainReady && (
              <InlineWarning>
                <span>{mode === "arc" ? "Switch to Arc Testnet for this route." : "Switch to Ink for this route."}</span>
                <button
                  className="route-button-secondary bg-white/70"
                  onClick={() => switchChainAsync({ chainId: mode === "arc" ? arcTestnet.id : primaryInkChain.id })}
                  type="button"
                >
                  Switch network
                </button>
              </InlineWarning>
            )}

            {error && (
              <div className="rounded-[18px] bg-red-500/10 p-4 text-sm leading-6 text-red-800">
                {error}
              </div>
            )}

            {hash && (
              <div className="rounded-[18px] bg-white/70 p-4 text-sm leading-6 text-[#555a52] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
                <Clock className="mb-2 h-4 w-4 text-[#171714]" aria-hidden="true" />
                Transaction:{" "}
                {explorerLink(chainId, hash, "tx") ? (
                  <a className="font-semibold text-[#171714] underline" href={explorerLink(chainId, hash, "tx")} rel="noreferrer" target="_blank">
                    {shortAddress(hash)}
                  </a>
                ) : (
                  shortAddress(hash)
                )}
              </div>
            )}

            {success && (
              <div className="rounded-[24px] bg-[#dcefd9] p-5 text-[#171714] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-lg font-semibold tracking-[-0.02em]">Contract launched</p>
                    <p className="mt-2 break-all font-mono text-xs leading-5 text-[#4f544c]">{success.address}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="route-button-primary"
                        onClick={() => router.push(`/contract/${success.address}?template=${success.template}`)}
                        type="button"
                      >
                        Open contract page
                      </button>
                      {explorerLink(chainId, success.address) && (
                        <a className="route-button-secondary bg-white/70" href={explorerLink(chainId, success.address)} rel="noreferrer" target="_blank">
                          Explorer
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-[24px] bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <button
                className="route-button-primary px-5 py-3"
                disabled={isPending || !isConnected || !registryAddress || !currentChainReady}
                onClick={deploySelected}
                type="button"
              >
                <Bolt className="h-4 w-4" aria-hidden="true" />
                {isPending ? "Waiting for signature" : mode === "arc" ? "Deploy on Arc" : "Deploy on Ink"}
              </button>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#777c73]">
                {registryAddress ? `Registry ${shortAddress(registryAddress)}` : "Registry not configured"}
              </span>
            </div>
          </div>
        </section>

        {mode === "arc" && <GatewayConsole />}

        <RouteActivity metrics={metrics} mode={mode} chainId={chainId} />
      </div>
    </main>
  );
}

function RouteMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-white/62 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#777c73]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#171714]">{value}</p>
    </div>
  );
}

function InlineWarning({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] bg-[#fff2ce]/78 p-4 text-sm leading-6 text-[#6d4b13] sm:flex-row sm:items-center sm:justify-between">
      {children}
    </div>
  );
}

function RouteActivity({
  metrics,
  mode,
  chainId
}: {
  metrics: ReturnType<typeof useRegistryMetrics>;
  mode: LauncherMode;
  chainId: number;
}) {
  const modeTemplateIds = new Set(templatesForMode(mode).map((template) => template.id));
  const launches = metrics.recent.filter((launch) => modeTemplateIds.has(launch.templateId)).slice(0, 5);

  return (
    <section className="grid gap-6 border-t border-[#171714]/10 pt-10 lg:grid-cols-[0.72fr_1.28fr]">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#777c73]">Route signals</p>
        <h2 className="mt-3 max-w-[10ch] text-5xl font-semibold leading-[0.94] tracking-[-0.055em] text-[#171714]">
          Public launch activity.
        </h2>
        <p className="mt-5 max-w-[42ch] text-sm leading-6 text-[#5d625a]">
          Registry events stay public: deployer, contract address, template, metadata, and timestamp.
        </p>
      </div>

      <div className="rounded-[28px] bg-white/62 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur">
        {metrics.error && <p className="p-3 text-sm text-[#6d4b13]">{metrics.error}</p>}
        {metrics.isLoading ? (
          <div className="space-y-2 p-2">
            <div className="skeleton h-16 rounded-[18px]" />
            <div className="skeleton h-16 rounded-[18px]" />
            <div className="skeleton h-16 rounded-[18px]" />
          </div>
        ) : launches.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[#171714]/[0.16] p-8 text-center">
            <Route className="mx-auto h-6 w-6 text-[#777c73]" aria-hidden="true" />
            <p className="mt-3 font-semibold text-[#171714]">No launches on this route yet</p>
            <p className="mt-2 text-sm text-[#687064]">Deploy a contract and this signal list will populate from registry events.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#171714]/10">
            {launches.map((launch) => (
              <div key={`${launch.deployedContract}-${launch.timestamp.toString()}`} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-semibold text-[#171714]">{launch.templateName}</p>
                  <p className="mt-1 font-mono text-xs text-[#687064]">
                    {shortAddress(launch.deployer)} to{" "}
                    <Link className="text-[#171714] underline" href={`/contract/${launch.deployedContract}?template=${templateSlugFromId(launch.templateId)}`}>
                      {shortAddress(launch.deployedContract)}
                    </Link>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[#687064]">
                  <span>{formatDate(launch.timestamp)}</span>
                  {explorerLink(chainId, launch.deployedContract) && (
                    <a className="inline-flex items-center gap-1 font-semibold text-[#171714]" href={explorerLink(chainId, launch.deployedContract)} rel="noreferrer" target="_blank">
                      Explorer
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function GatewayConsole() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const gatewayAddress = resolveGatewayWalletAddress(chainId);
  const usdcAddress = resolveUSDCAddress(chainId);
  const { runTx, hash, error, isPending, setError } = useContractTx();
  const [depositAmount, setDepositAmount] = useState("10");
  const [balances, setBalances] = useState({
    wallet: 0n,
    allowance: 0n,
    total: 0n,
    available: 0n,
    withdrawable: 0n,
    withdrawing: 0n,
    domain: 0,
    tokenSupported: false
  });
  const [isLoading, setIsLoading] = useState(false);

  const refreshGateway = useCallback(async () => {
    if (!publicClient || !address || !gatewayAddress || !usdcAddress || !isArcTestnet(chainId)) {
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const [wallet, allowance, total, available, withdrawable, withdrawing, domain, tokenSupported] = await Promise.all([
        publicClient.readContract({ address: usdcAddress, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
        publicClient.readContract({ address: usdcAddress, abi: erc20Abi, functionName: "allowance", args: [address, gatewayAddress] }),
        publicClient.readContract({ address: gatewayAddress, abi: gatewayWalletAbi, functionName: "totalBalance", args: [usdcAddress, address] }),
        publicClient.readContract({ address: gatewayAddress, abi: gatewayWalletAbi, functionName: "availableBalance", args: [usdcAddress, address] }),
        publicClient.readContract({ address: gatewayAddress, abi: gatewayWalletAbi, functionName: "withdrawableBalance", args: [usdcAddress, address] }),
        publicClient.readContract({ address: gatewayAddress, abi: gatewayWalletAbi, functionName: "withdrawingBalance", args: [usdcAddress, address] }),
        publicClient.readContract({ address: gatewayAddress, abi: gatewayWalletAbi, functionName: "domain" }),
        publicClient.readContract({ address: gatewayAddress, abi: gatewayWalletAbi, functionName: "isTokenSupported", args: [usdcAddress] })
      ]);

      setBalances({
        wallet: wallet as bigint,
        allowance: allowance as bigint,
        total: total as bigint,
        available: available as bigint,
        withdrawable: withdrawable as bigint,
        withdrawing: withdrawing as bigint,
        domain: Number(domain),
        tokenSupported: Boolean(tokenSupported)
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read Gateway balances.");
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, gatewayAddress, publicClient, setError, usdcAddress]);

  useEffect(() => {
    void refreshGateway();
  }, [refreshGateway]);

  async function depositToGateway() {
    if (!gatewayAddress || !usdcAddress) {
      setError("Gateway or USDC address is not configured.");
      return;
    }

    if (!isArcTestnet(chainId)) {
      setError("Switch to Arc Testnet before using Gateway.");
      return;
    }

    const amount = parseUnits(depositAmount || "0", USDC_DECIMALS);
    if (amount <= 0n) {
      setError("Gateway deposit amount must be greater than zero.");
      return;
    }

    await runTx({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [gatewayAddress, amount]
    });

    await runTx({
      address: gatewayAddress,
      abi: gatewayWalletAbi,
      functionName: "deposit",
      args: [usdcAddress, amount]
    });

    await refreshGateway();
  }

  return (
    <section className="gateway-panel grid gap-6 rounded-[34px] p-5 md:p-6 lg:grid-cols-[0.78fr_1.22fr]">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#777c73]">Circle Gateway</p>
        <h2 className="mt-3 max-w-[10ch] text-5xl font-semibold leading-[0.94] tracking-[-0.055em] text-[#171714]">
          Fund settlement liquidity.
        </h2>
        <p className="mt-5 max-w-[48ch] text-sm leading-6 text-[#5d625a]">
          Deposit Arc USDC into Gateway, then read unified balance signals directly from the wallet contract.
        </p>
        <div className="mt-5 space-y-2 font-mono text-xs text-[#777c73]">
          <p>USDC {usdcAddress ? shortAddress(usdcAddress) : "not configured"}</p>
          <p>Gateway {gatewayAddress ? shortAddress(gatewayAddress) : "not configured"}</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <GatewayMetric label="Wallet USDC" value={formatToken(balances.wallet, USDC_DECIMALS)} />
          <GatewayMetric label="Gateway total" value={formatToken(balances.total, USDC_DECIMALS)} />
          <GatewayMetric label="Available" value={formatToken(balances.available, USDC_DECIMALS)} />
          <GatewayMetric label="Withdrawable" value={formatToken(balances.withdrawable, USDC_DECIMALS)} />
          <GatewayMetric label="Withdrawing" value={formatToken(balances.withdrawing, USDC_DECIMALS)} />
        </div>

        <div className="rounded-[24px] bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
          <div className="mb-4 grid gap-3 text-xs text-[#687064] sm:grid-cols-3">
            <p>
              Domain: <span className="font-mono text-[#171714]">{balances.domain || "not read"}</span>
              <span className="text-[#777c73]"> / expected {ARC_GATEWAY_DOMAIN}</span>
            </p>
            <p>
              Token support: <span className="font-mono text-[#171714]">{balances.tokenSupported ? "supported" : "not confirmed"}</span>
            </p>
            <p>
              Allowance: <span className="font-mono text-[#171714]">{formatToken(balances.allowance, USDC_DECIMALS)} USDC</span>
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
            <Field label="Gateway deposit in USDC" value={depositAmount} onChange={setDepositAmount} />
            <button
              className="route-button-primary h-12 px-5"
              disabled={isPending || !isConnected || !isArcTestnet(chainId)}
              onClick={depositToGateway}
              type="button"
            >
              <WalletCards className="h-4 w-4" aria-hidden="true" />
              {isPending ? "Signing" : "Approve + deposit"}
            </button>
            <button className="route-button-secondary h-12 px-5 bg-white/70" disabled={isLoading} onClick={refreshGateway} type="button">
              Refresh
            </button>
          </div>

          {!isArcTestnet(chainId) && (
            <div className="mt-4 flex flex-col gap-3 rounded-[18px] bg-[#fff2ce]/78 p-4 text-sm text-[#6d4b13] sm:flex-row sm:items-center sm:justify-between">
              <span>Gateway deposits are enabled on Arc Testnet.</span>
              <button className="route-button-secondary bg-white/70" onClick={() => switchChainAsync({ chainId: arcTestnet.id })} type="button">
                Switch to Arc
              </button>
            </div>
          )}

          {error && <div className="mt-4 rounded-[18px] bg-red-500/10 p-4 text-sm text-red-800">{error}</div>}

          {hash && (
            <p className="mt-4 text-sm text-[#555a52]">
              Last Gateway transaction:{" "}
              {explorerLink(chainId, hash, "tx") ? (
                <a className="font-semibold text-[#171714] underline" href={explorerLink(chainId, hash, "tx")} rel="noreferrer" target="_blank">
                  {shortAddress(hash)}
                </a>
              ) : (
                shortAddress(hash)
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function GatewayMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-white/62 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#777c73]">{label}</p>
      <p className="mt-3 font-mono text-2xl tracking-[-0.035em] text-[#171714]">{value}</p>
    </div>
  );
}

function TemplateFields({
  selected,
  forms,
  updateForm
}: {
  selected: TemplateSlug;
  forms: typeof initialForms;
  updateForm: (slug: TemplateSlug, patch: Record<string, string | boolean>) => void;
}) {
  if (selected === "tipjar") {
    const form = forms.tipjar;
    return (
      <div className="grid gap-4">
        <Field label="Project name" value={form.projectName} onChange={(value) => updateForm("tipjar", { projectName: value })} />
        <Field label="Description" value={form.description} onChange={(value) => updateForm("tipjar", { description: value })} textarea />
        <Field label="Minimum tip in ETH" value={form.minTip} onChange={(value) => updateForm("tipjar", { minTip: value })} />
      </div>
    );
  }

  if (selected === "guestbook") {
    const form = forms.guestbook;
    return (
      <div className="grid gap-4">
        <Field label="Wall name" value={form.wallName} onChange={(value) => updateForm("guestbook", { wallName: value })} />
        <Field label="Message fee in ETH" value={form.messageFee} onChange={(value) => updateForm("guestbook", { messageFee: value })} />
        <Field label="Max message length" value={form.maxMessageLength} onChange={(value) => updateForm("guestbook", { maxMessageLength: value })} />
      </div>
    );
  }

  if (selected === "builder-badge") {
    const form = forms["builder-badge"];
    return (
      <div className="grid gap-4">
        <Field label="Collection name" value={form.name} onChange={(value) => updateForm("builder-badge", { name: value })} />
        <Field label="Symbol" value={form.symbol} onChange={(value) => updateForm("builder-badge", { symbol: value })} />
        <Field label="Base URI" value={form.baseURI} onChange={(value) => updateForm("builder-badge", { baseURI: value })} />
        <Toggle label="Transferable badges" checked={form.transferable} onChange={(value) => updateForm("builder-badge", { transferable: value })} />
      </div>
    );
  }

  if (selected === "simple-erc20") {
    const form = forms["simple-erc20"];
    return (
      <div className="grid gap-4">
        <Field label="Token name" value={form.name} onChange={(value) => updateForm("simple-erc20", { name: value })} />
        <Field label="Symbol" value={form.symbol} onChange={(value) => updateForm("simple-erc20", { symbol: value })} />
        <Field label="Initial supply" value={form.initialSupply} onChange={(value) => updateForm("simple-erc20", { initialSupply: value })} />
        <Toggle label="Owner can mint more" checked={form.mintable} onChange={(value) => updateForm("simple-erc20", { mintable: value })} />
      </div>
    );
  }

  if (selected === "usdc-tipjar") {
    const form = forms["usdc-tipjar"];
    return (
      <div className="grid gap-4">
        <Field label="Project name" value={form.projectName} onChange={(value) => updateForm("usdc-tipjar", { projectName: value })} />
        <Field label="Description" value={form.description} onChange={(value) => updateForm("usdc-tipjar", { description: value })} textarea />
        <Field label="Minimum tip in USDC" value={form.minTip} onChange={(value) => updateForm("usdc-tipjar", { minTip: value })} />
      </div>
    );
  }

  if (selected === "usdc-mini-escrow") {
    const form = forms["usdc-mini-escrow"];
    return (
      <div className="grid gap-4">
        <Field label="Title" value={form.title} onChange={(value) => updateForm("usdc-mini-escrow", { title: value })} />
        <Field label="Metadata URI" value={form.metadataURI} onChange={(value) => updateForm("usdc-mini-escrow", { metadataURI: value })} />
        <Field
          label="Worker address"
          helper="Leave blank for open submissions."
          value={form.worker}
          onChange={(value) => updateForm("usdc-mini-escrow", { worker: value })}
        />
        <Field label="Reward in USDC" value={form.reward} onChange={(value) => updateForm("usdc-mini-escrow", { reward: value })} />
        <Field label="Deadline hours from now" value={form.deadlineHours} onChange={(value) => updateForm("usdc-mini-escrow", { deadlineHours: value })} />
      </div>
    );
  }

  const form = forms["mini-escrow"];
  return (
    <div className="grid gap-4">
      <Field label="Title" value={form.title} onChange={(value) => updateForm("mini-escrow", { title: value })} />
      <Field label="Metadata URI" value={form.metadataURI} onChange={(value) => updateForm("mini-escrow", { metadataURI: value })} />
      <Field
        label="Worker address"
        helper="Leave blank for open submissions."
        value={form.worker}
        onChange={(value) => updateForm("mini-escrow", { worker: value })}
      />
      <Field label="Reward in ETH" value={form.reward} onChange={(value) => updateForm("mini-escrow", { reward: value })} />
      <Field label="Deadline hours from now" value={form.deadlineHours} onChange={(value) => updateForm("mini-escrow", { deadlineHours: value })} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  helper,
  textarea = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {textarea ? (
        <textarea className="field min-h-24 resize-y" value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="field" value={value} onChange={(event) => onChange(event.target.value)} />
      )}
      {helper && <span className="mt-1 block text-xs text-[#777c73]">{helper}</span>}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-[18px] bg-[#171714]/[0.05] p-3">
      <span className="text-sm font-semibold text-[#171714]">{label}</span>
      <input
        checked={checked}
        className="h-5 w-5 accent-ink-300"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function PreviewRow({ label, value, inverted = false }: { label: string; value: string; inverted?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0 ${inverted ? "border-white/10" : "border-[#171714]/10"}`}>
      <dt className={inverted ? "text-white/50" : "text-[#777c73]"}>{label}</dt>
      <dd className={`text-right ${inverted ? "text-white" : "text-[#171714]"}`}>{value}</dd>
    </div>
  );
}
