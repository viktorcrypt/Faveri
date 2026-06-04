"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bolt,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  ShieldCheck,
  TriangleAlert
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decodeEventLog, isAddress, parseEther, parseUnits, zeroAddress, type Address, type Hash } from "viem";
import { useAccount, useChainId, usePublicClient, useSwitchChain } from "wagmi";
import { inkLauncherRegistryAbi } from "@/generated/contracts";
import { arcTestnet, explorerLink, primaryInkChain } from "@/lib/chains";
import {
  erc20Abi,
  gatewayWalletAbi,
  ARC_GATEWAY_DOMAIN,
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
import { TemplateArt, templateVisuals } from "@/components/TemplateArt";

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

export function LauncherHome() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const registryAddress = getRegistryAddress(chainId);
  const usdcAddress = resolveUSDCAddress(chainId);
  const metrics = useRegistryMetrics(5);
  const { runTx, hash, error, isPending, setError } = useContractTx();
  const [mode, setMode] = useState<LauncherMode>("ink");
  const modeTemplates = useMemo(() => templatesForMode(mode), [mode]);
  const [selected, setSelected] = useState<TemplateSlug>("tipjar");
  const [forms, setForms] = useState(initialForms);
  const [success, setSuccess] = useState<SuccessState>();
  const [contractsVisible, setContractsVisible] = useState(false);
  const contractsRef = useRef<HTMLElement | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.slug === selected) ?? modeTemplates[0] ?? templates[0],
    [modeTemplates, selected]
  );

  useEffect(() => {
    const first = modeTemplates[0];
    if (first && !modeTemplates.some((template) => template.slug === selected)) {
      setSelected(first.slug);
      setSuccess(undefined);
      setError(undefined);
    }
  }, [modeTemplates, selected, setError]);

  const currentChainReady =
    mode === "ink" ? chainId === primaryInkChain.id || chainId === 763373 || chainId === 31337 : chainId === arcTestnet.id || chainId === 31337;

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
      { rootMargin: "-18% 0px -18% 0px", threshold: 0.18 }
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
    <div className="space-y-12">
      <section className="ink-stage relative grid min-h-[calc(100dvh-10rem)] overflow-hidden rounded-[36px] px-5 py-8 md:px-8 lg:grid-cols-[0.98fr_1.02fr] lg:items-center lg:px-10">
        <div className="ink-grid" aria-hidden="true" />
        <div className="ink-ribbon ink-ribbon-a" aria-hidden="true" />
        <div className="ink-ribbon ink-ribbon-b" aria-hidden="true" />
        <div className="ink-ribbon ink-ribbon-c" aria-hidden="true" />

        <div className="reveal-in relative z-[1] max-w-4xl space-y-8 [--index:0]">
          <div className="space-y-6">
            <p className="liquid-glass inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
              {mode === "arc" ? "Arc / USDC settlement mode" : "Ink contract launcher"}
            </p>
            <h1 className="max-w-[11ch] text-5xl font-semibold leading-[0.94] tracking-[-0.055em] text-white md:text-7xl">
              {mode === "arc" ? "Stablecoin contracts, ready for settlement." : "User-owned contracts, launched cleanly."}
            </h1>
            <p className="max-w-[54ch] text-base leading-7 text-white/70 md:text-lg">
              {mode === "arc"
                ? "Deploy USDC-native Arc contracts, fund Gateway liquidity, and keep contract control in the builder wallet."
                : "Pick a contract kit, sign once, and get a user-owned deployment page without launcher admin rights."}
            </p>
          </div>
          <ModeSwitch mode={mode} setMode={setMode} />
          <div className="flex flex-wrap items-center gap-3">
            <a className="liquid-glass-strong inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95" href="#launcher">
              <Bolt className="h-4 w-4" aria-hidden="true" />
              {isConnected ? "Start deploying" : "Connect and deploy"}
            </a>
            <Link className="liquid-glass inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white/80 transition-transform hover:scale-105 hover:text-white active:scale-95" href="/dashboard">
              Registry activity
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid max-w-2xl grid-cols-3 divide-x divide-white/[0.15] border-y border-white/[0.15] py-4">
            <HeroStat label="Total launches" value={metrics.total.toString()} />
            <HeroStat label="Templates" value={String(modeTemplates.length)} />
            <HeroStat label="Admin rights" value="0" />
          </div>
        </div>

        <div className="relative z-[1] mt-8 lg:mt-0">
          <HeroVisual metrics={metrics} mode={mode} modeTemplates={modeTemplates} />
        </div>
      </section>

      <section id="launcher" ref={contractsRef} className="space-y-6 pt-8">
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-4 border-b border-[#171714]/10 pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold text-[#31593f]">{mode === "arc" ? "Arc settlement kits" : "Template library"}</p>
              <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-[-0.035em] text-[#171714] md:text-4xl">
                {mode === "arc" ? "USDC flows that can settle real work." : "Contracts drop in when you need them."}
              </h2>
            </div>
            <p className="max-w-[28ch] text-sm leading-6 text-[#686b63]">
              {mode === "arc" ? "Gateway-ready balances, dollar-denominated rewards, and public launch signals." : "Same size, one decision each. Pick the primitive, then deploy."}
            </p>
          </div>
          <div className={`grid gap-4 sm:grid-cols-2 ${mode === "arc" ? "lg:grid-cols-2" : "lg:grid-cols-5"}`}>
            {modeTemplates.map((template, index) => {
              const Icon = template.icon;
              const active = selected === template.slug;
              const meta = templateVisuals[template.slug];
              return (
                <button
                  key={template.slug}
                  className={`template-card contract-drop group flex min-h-[318px] flex-col overflow-hidden rounded-[22px] p-3 text-left transition duration-300 active:translate-y-[1px] ${contractsVisible ? "contract-drop-visible" : ""} ${meta.artClass} ${
                    active ? "template-card-active" : ""
                  }`}
                  style={{ "--index": index } as React.CSSProperties}
                  onClick={() => {
                    setSelected(template.slug);
                    setSuccess(undefined);
                  }}
                  type="button"
                >
                  <span className={`art-panel ${meta.artClass} relative block min-h-[154px] overflow-hidden rounded-[16px] border border-[#171714]/10`}>
                    <TemplateArt slug={template.slug} />
                    <span className="absolute left-3 top-3 rounded-md border border-[#171714]/10 bg-[#081011]/50 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#dce6d6] backdrop-blur">
                      {meta.proof}
                    </span>
                    <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-md border border-[#171714]/10 bg-white/[0.35] backdrop-blur transition duration-300 group-hover:scale-105">
                      <Icon className="h-4 w-4 text-[#4e8f65]" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="flex flex-1 flex-col p-3">
                    <span className="text-xs uppercase tracking-[0.12em] text-[#777a72]">{meta.surface}</span>
                    <span className="mt-2 block text-xl font-semibold tracking-[-0.02em] text-[#171714]">{template.title}</span>
                    <span className="mt-2 block text-sm leading-6 text-[#55584f]">{meta.signal}</span>
                    <span className="mt-auto flex items-center justify-between pt-5">
                      <span className="text-xs text-[#777a72]">{meta.proof}</span>
                      <span className={`h-2 w-2 rounded-full ${active ? "bg-[#4e8f65]" : "bg-[#171714]/20"}`} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel liquid-glass-strong overflow-hidden p-4 md:p-5">
          <div className={`art-panel ${templateVisuals[selected].artClass} relative mb-5 min-h-[190px] overflow-hidden rounded-[18px] border border-[#171714]/10`}>
            <TemplateArt slug={selected} large />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#081011] via-[#081011]/[0.7] to-transparent p-5">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#b7f0bf]">{selectedTemplate.contractName}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#fbfaf4]">{selectedTemplate.title}</h2>
            </div>
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
            <div>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#31593f]">Deploy parameters</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#171714]">Tune the kit</h3>
                </div>
                <span className="rounded-md border border-[#171714]/10 bg-white/[0.65] px-3 py-1 font-mono text-xs text-[#55584f]">
                  {selectedTemplate.currency} / Template {selectedTemplate.id}
                </span>
              </div>
              <TemplateFields selected={selected} forms={forms} updateForm={updateForm} />
            </div>

            <aside className="liquid-glass rounded-[16px] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#171714]">
                <ShieldCheck className="h-4 w-4 text-[#4e8f65]" aria-hidden="true" />
                Ownership model
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <PreviewRow label="Contract owner" value={address ? shortAddress(address) : "Connected wallet"} />
                <PreviewRow label="Launcher admin rights" value="none" />
                <PreviewRow label="Upgradeability" value="none" />
                <PreviewRow label="Settlement asset" value={selectedTemplate.currency} />
                {mode === "arc" && <PreviewRow label="Gateway layer" value="Circle Gateway deposit enabled" />}
              </dl>
              <div className="mt-4 rounded-md border border-[#a8752f]/20 bg-[#fff2ce]/70 p-3 text-sm leading-6 text-[#6d4b13]">
                <Info className="mb-2 h-4 w-4" aria-hidden="true" />
                {selectedTemplate.notice}
              </div>
            </aside>
          </div>

          {!registryAddress && (
            <div className="mt-5 rounded-md border border-[#a8752f]/20 bg-[#fff2ce]/70 p-3 text-sm text-[#6d4b13]">
              <TriangleAlert className="mb-2 h-4 w-4" aria-hidden="true" />
              {registrySetupMessage(chainId)}
            </div>
          )}

          {!currentChainReady && (
            <div className="mt-5 flex flex-col gap-3 rounded-md border border-[#a8752f]/20 bg-[#fff2ce]/70 p-3 text-sm text-[#6d4b13] sm:flex-row sm:items-center sm:justify-between">
              <span>{mode === "arc" ? "Switch to Arc Testnet for USDC settlement templates." : "Switch to Ink for Ink templates."}</span>
              <button
                className="button-secondary"
                onClick={() => switchChainAsync({ chainId: mode === "arc" ? arcTestnet.id : primaryInkChain.id })}
                type="button"
              >
                Switch network
              </button>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {hash && (
            <div className="mt-5 rounded-md border border-[#171714]/10 bg-white/[0.65] p-3 text-sm text-[#55584f]">
              <Clock className="mb-2 h-4 w-4 text-[#4e8f65]" aria-hidden="true" />
              Transaction:{" "}
              {explorerLink(chainId, hash, "tx") ? (
                <a className="text-[#31593f] underline" href={explorerLink(chainId, hash, "tx")} rel="noreferrer" target="_blank">
                  {shortAddress(hash)}
                </a>
              ) : (
                shortAddress(hash)
              )}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-lg border border-[#4e8f65]/25 bg-[#4e8f65]/10 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-[#4e8f65]" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[#171714]">Contract deployed</p>
                  <p className="mt-1 text-sm text-[#55584f]">
                    Address:{" "}
                    <span className="font-mono text-[#31593f]">{success.address}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="button-primary"
                      onClick={() => router.push(`/contract/${success.address}?template=${success.template}`)}
                      type="button"
                    >
                      Open Contract Page
                    </button>
                    {explorerLink(chainId, success.address) && (
                      <a className="button-secondary" href={explorerLink(chainId, success.address)} rel="noreferrer" target="_blank">
                        Explorer
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#171714]/10 pt-5">
            <button className="button-primary px-5 py-3" disabled={isPending || !isConnected || !registryAddress || !currentChainReady} onClick={deploySelected} type="button">
              <Bolt className="h-4 w-4" aria-hidden="true" />
              {isPending ? "Waiting for signature" : mode === "arc" ? "Deploy on Arc" : "Deploy on Ink"}
            </button>
            <span className="text-sm text-[#777a72]">
              {registryAddress ? `Registry ${shortAddress(registryAddress)}` : "Registry not configured"}
            </span>
          </div>
        </div>
      </section>

      {mode === "arc" && <GatewayConsole />}

      <section className="panel liquid-glass-strong overflow-hidden p-5">
        <div className="flex flex-col justify-between gap-4 border-b border-[#171714]/10 pb-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-[#31593f]">Recent launches</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[#171714]">Public registry activity</h2>
          </div>
          <p className="max-w-[44ch] text-sm leading-6 text-[#686b63]">
            Public launch activity from the registry.
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          {metrics.isLoading ? (
            <div className="space-y-2">
              <div className="skeleton h-10 rounded-md" />
              <div className="skeleton h-10 rounded-md" />
              <div className="skeleton h-10 rounded-md" />
            </div>
          ) : metrics.recent.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#171714]/[0.15] p-8 text-center text-sm text-[#686b63]">
              Deploy the first template to populate public launch activity.
            </div>
          ) : (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-[#777a72]">
                <tr>
                  <th className="py-3 pr-4">Template</th>
                  <th className="py-3 pr-4">Deployer</th>
                  <th className="py-3 pr-4">Contract</th>
                  <th className="py-3 pr-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171714]/10">
                {metrics.recent.map((launch) => (
                  <tr key={`${launch.deployedContract}-${launch.timestamp.toString()}`} className="text-[#55584f]">
                    <td className="py-3 pr-4 text-[#171714]">{launch.templateName}</td>
                    <td className="py-3 pr-4 font-mono">{shortAddress(launch.deployer)}</td>
                    <td className="py-3 pr-4 font-mono">
                      <Link
                        className="text-[#31593f] underline"
                        href={`/contract/${launch.deployedContract}?template=${templateSlugFromId(launch.templateId)}`}
                      >
                        {shortAddress(launch.deployedContract)}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{formatDate(launch.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <OwnershipScroll />

      <FAQSection />
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 first:pl-0 last:pr-0">
      <p className="font-mono text-2xl text-white">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/55">{label}</p>
    </div>
  );
}

function ModeSwitch({
  mode,
  setMode
}: {
  mode: LauncherMode;
  setMode: (mode: LauncherMode) => void;
}) {
  return (
    <div className="liquid-glass inline-flex rounded-full p-1">
      {(["ink", "arc"] as const).map((item) => (
        <button
          key={item}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            mode === item ? "bg-white text-[#171714]" : "text-white/70 hover:text-white"
          }`}
          onClick={() => setMode(item)}
          type="button"
        >
          {item === "arc" ? "Arc / USDC" : "Ink"}
        </button>
      ))}
    </div>
  );
}

function HeroVisual({
  metrics,
  mode,
  modeTemplates
}: {
  metrics: ReturnType<typeof useRegistryMetrics>;
  mode: LauncherMode;
  modeTemplates: ReturnType<typeof templatesForMode>;
}) {
  return (
    <div className="hero-visual reveal-in relative overflow-hidden rounded-[28px] border border-[#171714]/10 p-4 [--index:1]">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#4e8f65]/[0.15]" />
      <div className="absolute -bottom-24 left-10 h-72 w-72 rounded-full border border-[#e8c985]/10" />
      <div className="relative rounded-[22px] border border-[#171714]/10 bg-white/[0.55] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-[#171714]/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e8c985]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#4e8f65]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#171714]/25" />
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#777a72]">
            registry / {mode === "arc" ? "arc" : "ink"}
          </span>
        </div>

        <div className="grid gap-4 pt-4 md:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            {modeTemplates.map((template, index) => {
              const meta = templateVisuals[template.slug];
              return (
                <div key={template.slug} className="flex items-center justify-between rounded-md border border-[#171714]/10 bg-white/[0.65] px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-[#171714]">{template.title}</p>
                    <p className="mt-0.5 text-xs text-[#777a72]">{meta.proof}</p>
                  </div>
                  <p className="font-mono text-sm text-[#31593f]">{(metrics.usage[template.id] ?? 0n).toString()}</p>
                </div>
              );
            })}
          </div>

          <div className="relative min-h-[320px] overflow-hidden rounded-[18px] border border-[#171714]/10 bg-[#0d1516]">
            <div className="absolute inset-0 opacity-90">
              <div className="orbital-ring left-8 top-8 h-44 w-44" />
              <div className="orbital-ring right-5 top-16 h-36 w-36" />
              <div className="orbital-ring bottom-8 left-20 h-52 w-52" />
              <div className="absolute left-16 top-20 h-20 w-20 rounded-[18px] border border-[#4e8f65]/25 bg-[#4e8f65]/[0.15]" />
              <div className="absolute right-14 top-28 h-28 w-28 rounded-full border border-[#e8c985]/20 bg-[#e8c985]/10" />
              <div className="absolute bottom-16 left-24 h-16 w-40 rounded-[999px] border border-[#171714]/10 bg-white/40" />
            </div>
            <div className="absolute inset-x-4 bottom-4 rounded-[14px] border border-[#171714]/10 bg-white/80 p-4 backdrop-blur">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#777a72]">contracts launched</p>
              <p className="mt-2 text-5xl font-semibold tracking-[-0.06em] text-[#171714]">{metrics.total.toString()}</p>
              <div className="mt-4 overflow-hidden border-y border-[#171714]/10 py-2">
                <div className="soft-marquee flex w-max gap-4 font-mono text-xs uppercase tracking-[0.14em] text-[#31593f]">
                  {modeTemplates.concat(modeTemplates).map((template, index) => (
                    <span key={`${template.slug}-${index}`}>{template.contractName}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {metrics.error && <p className="mt-4 text-sm text-[#6d4b13]">{metrics.error}</p>}
      </div>
    </div>
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
    <section className="panel liquid-glass-strong overflow-hidden p-5 md:p-6">
      <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[#31593f]">Circle Gateway</p>
          <h2 className="mt-2 max-w-[12ch] text-4xl font-semibold leading-[0.95] tracking-[-0.045em] text-[#171714] md:text-5xl">
            Fund settlement liquidity.
          </h2>
          <p className="mt-4 max-w-[52ch] text-sm leading-6 text-[#55584f]">
            Deposit Arc USDC into the official Gateway wallet contract, then read the unified balance signals directly onchain.
          </p>
          <div className="mt-5 space-y-2 font-mono text-xs text-[#777a72]">
            <p>USDC {usdcAddress ? shortAddress(usdcAddress) : "not configured"}</p>
            <p>Gateway {gatewayAddress ? shortAddress(gatewayAddress) : "not configured"}</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <GatewayMetric label="Wallet USDC" value={formatToken(balances.wallet, USDC_DECIMALS)} />
            <GatewayMetric label="Gateway total" value={formatToken(balances.total, USDC_DECIMALS)} />
            <GatewayMetric label="Gateway available" value={formatToken(balances.available, USDC_DECIMALS)} />
            <GatewayMetric label="Withdrawable" value={formatToken(balances.withdrawable, USDC_DECIMALS)} />
            <GatewayMetric label="Withdrawing" value={formatToken(balances.withdrawing, USDC_DECIMALS)} />
          </div>

          <div className="rounded-[18px] border border-[#171714]/10 bg-white/[0.65] p-4">
            <div className="mb-4 grid gap-3 text-xs text-[#686b63] sm:grid-cols-3">
              <p>
                Domain: <span className="font-mono text-[#171714]">{balances.domain || "not read"}</span>
                <span className="text-[#777a72]"> / expected {ARC_GATEWAY_DOMAIN}</span>
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
                className="button-primary h-12 px-5"
                disabled={isPending || !isConnected || !isArcTestnet(chainId)}
                onClick={depositToGateway}
                type="button"
              >
                {isPending ? "Signing" : "Approve + deposit"}
              </button>
              <button className="button-secondary h-12 px-5" disabled={isLoading} onClick={refreshGateway} type="button">
                Refresh
              </button>
            </div>

            {!isArcTestnet(chainId) && (
              <div className="mt-4 flex flex-col gap-3 rounded-md border border-[#a8752f]/20 bg-[#fff2ce]/70 p-3 text-sm text-[#6d4b13] sm:flex-row sm:items-center sm:justify-between">
                <span>Gateway deposits are enabled on Arc Testnet.</span>
                <button className="button-secondary" onClick={() => switchChainAsync({ chainId: arcTestnet.id })} type="button">
                  Switch to Arc
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {hash && (
              <p className="mt-4 text-sm text-[#55584f]">
                Last Gateway transaction:{" "}
                {explorerLink(chainId, hash, "tx") ? (
                  <a className="text-[#31593f] underline" href={explorerLink(chainId, hash, "tx")} rel="noreferrer" target="_blank">
                    {shortAddress(hash)}
                  </a>
                ) : (
                  shortAddress(hash)
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function GatewayMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[#171714]/10 bg-white/[0.65] p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-[#777a72]">{label}</p>
      <p className="mt-3 font-mono text-2xl tracking-[-0.035em] text-[#171714]">{value}</p>
    </div>
  );
}

function OwnershipScroll() {
  const steps = [
    {
      label: "01",
      title: "Choose a real template",
      copy: "Every card maps to deployable Solidity code, not a mocked UI flow."
    },
    {
      label: "02",
      title: "Sign from your wallet",
      copy: "The registry deploys the child contract with the connected wallet as owner or creator."
    },
    {
      label: "03",
      title: "Manage the contract page",
      copy: "The launcher keeps no admin path. Owner actions stay tied to the deployed contract rules."
    }
  ];

  return (
    <section className="section-rule grid gap-8 py-14 lg:grid-cols-[0.86fr_1.14fr]">
      <div className="lg:sticky lg:top-32 lg:self-start">
        <p className="text-sm font-semibold text-[#31593f]">Control model</p>
        <h2 className="mt-3 max-w-[10ch] text-5xl font-semibold leading-[0.95] tracking-[-0.055em] text-[#171714] md:text-6xl">
          No launcher backdoor.
        </h2>
        <p className="mt-5 max-w-[42ch] text-base leading-7 text-[#55584f]">
          The product surface can be polished, but the contract boundary stays boring in the right way: public registry,
          user-owned deployments, no upgrade switch.
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <article
            key={step.label}
            className="reveal-in grid gap-5 rounded-[26px] border border-[#171714]/10 bg-white/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] md:grid-cols-[112px_1fr]"
            style={{ "--index": index } as React.CSSProperties}
          >
            <div className="flex h-24 w-full items-center justify-center rounded-[18px] border border-[#171714]/10 bg-[#171714] font-mono text-3xl text-[#fbfaf4] md:h-full">
              {step.label}
            </div>
            <div className="py-1">
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[#171714]">{step.title}</h3>
              <p className="mt-3 max-w-[56ch] text-sm leading-6 text-[#55584f]">{step.copy}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FAQSection() {
  const items = [
    {
      question: "Does the launcher own deployed contracts?",
      answer: "No. Template constructors receive the connected wallet as owner or creator. The registry records public metadata only."
    },
    {
      question: "Can I use this on Ink mainnet?",
      answer: "Yes. The frontend includes Ink mainnet configuration and uses the generated registry deployment address when available."
    },
    {
      question: "What data is public?",
      answer: "Deployment address, deployer address, template type, metadata string, timestamp, and contract events are public onchain data."
    },
    {
      question: "Are ERC20 tokens fixed supply by default?",
      answer: "The deploy form exposes the mintable flag clearly. Fixed tokens reject minting after deployment."
    }
  ];

  return (
    <section className="section-rule grid gap-8 py-14 lg:grid-cols-[0.72fr_1.28fr]">
      <div>
        <p className="text-sm font-semibold text-[#31593f]">FAQ</p>
        <h2 className="mt-3 max-w-[12ch] text-5xl font-semibold leading-[0.95] tracking-[-0.055em] text-[#171714] md:text-6xl">
          The details builders ask first.
        </h2>
      </div>
      <div className="divide-y divide-[#171714]/10 rounded-[26px] border border-[#171714]/10 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        {items.map((item) => (
          <details key={item.question} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-xl font-semibold tracking-[-0.025em] text-[#171714]">
              {item.question}
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#171714]/10 bg-[#f6f3eb] text-sm transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-4 max-w-[68ch] text-sm leading-6 text-[#55584f]">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
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
        <Field
          label="Description"
          value={form.description}
          onChange={(value) => updateForm("tipjar", { description: value })}
          textarea
        />
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
        <Field
          label="Max message length"
          value={form.maxMessageLength}
          onChange={(value) => updateForm("guestbook", { maxMessageLength: value })}
        />
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
        <Toggle
          label="Transferable badges"
          checked={form.transferable}
          onChange={(value) => updateForm("builder-badge", { transferable: value })}
        />
      </div>
    );
  }

  if (selected === "simple-erc20") {
    const form = forms["simple-erc20"];
    return (
      <div className="grid gap-4">
        <Field label="Token name" value={form.name} onChange={(value) => updateForm("simple-erc20", { name: value })} />
        <Field label="Symbol" value={form.symbol} onChange={(value) => updateForm("simple-erc20", { symbol: value })} />
        <Field
          label="Initial supply"
          value={form.initialSupply}
          onChange={(value) => updateForm("simple-erc20", { initialSupply: value })}
        />
        <Toggle label="Owner can mint more" checked={form.mintable} onChange={(value) => updateForm("simple-erc20", { mintable: value })} />
      </div>
    );
  }

  if (selected === "usdc-tipjar") {
    const form = forms["usdc-tipjar"];
    return (
      <div className="grid gap-4">
        <Field label="Project name" value={form.projectName} onChange={(value) => updateForm("usdc-tipjar", { projectName: value })} />
        <Field
          label="Description"
          value={form.description}
          onChange={(value) => updateForm("usdc-tipjar", { description: value })}
          textarea
        />
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
        <Field
          label="Deadline hours from now"
          value={form.deadlineHours}
          onChange={(value) => updateForm("usdc-mini-escrow", { deadlineHours: value })}
        />
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
      <Field
        label="Deadline hours from now"
        value={form.deadlineHours}
        onChange={(value) => updateForm("mini-escrow", { deadlineHours: value })}
      />
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
      {helper && <span className="mt-1 block text-xs text-[#777a72]">{helper}</span>}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-[#171714]/10 bg-white/[0.65] p-3">
      <span className="text-sm font-medium text-[#171714]">{label}</span>
      <input
        checked={checked}
        className="h-5 w-5 accent-ink-300"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#171714]/10 pb-3 last:border-0 last:pb-0">
      <dt className="text-[#777a72]">{label}</dt>
      <dd className="text-right text-[#171714]">{value}</dd>
    </div>
  );
}



