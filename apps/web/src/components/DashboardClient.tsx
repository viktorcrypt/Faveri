"use client";

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  CircleDollarSign,
  Gauge,
  Layers3,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Waves
} from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { TemplateArt, templateVisuals } from "@/components/TemplateArt";
import { arcTestnet, inkMainnet } from "@/lib/chains";
import { useChildContractActivity, type ChildContractActivity } from "@/lib/useChildContractActivity";
import { templates, templatesForMode, type LauncherMode, type TemplateInfo } from "@/lib/templates";
import { useRegistryMetrics, type LaunchRecord } from "@/lib/useRegistryMetrics";

type RouteAnalytics = {
  mode: LauncherMode;
  eyebrow: string;
  name: string;
  chainName: string;
  copy: string;
  accent: string;
  metrics: ReturnType<typeof useRegistryMetrics>;
  activity: ChildContractActivity;
  templates: TemplateInfo[];
};

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });

export function DashboardClient() {
  const inkMetrics = useRegistryMetrics(80, inkMainnet.id);
  const arcMetrics = useRegistryMetrics(80, arcTestnet.id);
  const inkTemplates = useMemo(() => templatesForMode("ink"), []);
  const arcTemplates = useMemo(() => templatesForMode("arc"), []);
  const inkActivity = useChildContractActivity(
    inkMetrics.recent,
    inkMainnet.id,
    inkTemplates.map((template) => template.id)
  );
  const arcActivity = useChildContractActivity(
    arcMetrics.recent,
    arcTestnet.id,
    arcTemplates.map((template) => template.id)
  );

  const routes: RouteAnalytics[] = [
    {
      mode: "ink",
      eyebrow: "Ink rail",
      name: "Ink Mainnet",
      chainName: "Ink",
      copy: "ETH-native contract launches, owner-first control, and builder primitives.",
      accent: "rgba(78, 143, 101, 0.22)",
      metrics: inkMetrics,
      activity: inkActivity,
      templates: inkTemplates
    },
    {
      mode: "arc",
      eyebrow: "Arc rail",
      name: "Arc Testnet",
      chainName: "Arc",
      copy: "USDC-native launch flow, escrow settlement, and Gateway funding signals.",
      accent: "rgba(91, 142, 151, 0.24)",
      metrics: arcMetrics,
      activity: arcActivity,
      templates: arcTemplates
    }
  ];

  const totalLaunches = routes.reduce((sum, route) => sum + route.metrics.total, 0n);
  const totalInteractions = routes.reduce((sum, route) => sum + route.activity.totalInteractions, 0n);
  const totalSampledContracts = routes.reduce((sum, route) => sum + route.activity.sampleSize, 0);
  const activeDeployers = new Set(routes.flatMap((route) => route.metrics.recent.map((launch) => launch.deployer.toLowerCase()))).size;
  const combinedRecords = routes.flatMap((route) => route.metrics.recent);
  const cadence = buildCadence(combinedRecords);
  const maxCadence = Math.max(...cadence.map((bucket) => bucket.count), 1);
  const topTemplate = findTopTemplate(routes);
  const interactionRows = [
    { label: "Tips", value: inkActivity.tips + arcActivity.tips, detail: "ETH + USDC tip jars" },
    { label: "Messages", value: inkActivity.messages + arcActivity.messages, detail: "Guestbook writes" },
    { label: "Badges", value: inkActivity.badgesMinted + arcActivity.badgesMinted, detail: "Builder badge mints" },
    { label: "Escrow steps", value: inkActivity.escrowSteps + arcActivity.escrowSteps, detail: "Submit, approve, claim, resolve" }
  ];
  const maxInteraction = interactionRows.reduce((max, row) => (row.value > max ? row.value : max), 0n);
  const isLoading = routes.some((route) => route.metrics.isLoading || route.activity.isLoading);
  const error = routes.find((route) => route.metrics.error || route.activity.error);

  return (
    <div className="space-y-8">
      <section className="analytics-hero reveal-in relative overflow-hidden rounded-[38px] p-5 [--index:0] md:p-8 lg:p-10">
        <div className="analytics-hero-lines" aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div className="space-y-6">
            <p className="inline-flex rounded-full bg-[#171714] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#f8f6ef]">
              Onchain analytics
            </p>
            <div>
              <h1 className="max-w-[10ch] text-[clamp(3.4rem,8vw,8rem)] font-semibold leading-[0.86] tracking-[-0.07em] text-[#171714]">
                Proof of useful launches.
              </h1>
              <p className="mt-6 max-w-[58ch] text-base leading-7 text-[#555a52] md:text-lg">
                Faveri reads registry storage and deployed child contracts directly. No backend counters, no address tables, just public launch and usage signals.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="route-button-primary" href="/ink">
                Launch on Ink
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link className="route-button-secondary" href="/arc">
                Launch on Arc
              </Link>
            </div>
          </div>

          <div className="analytics-console rounded-[32px] p-4 md:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SignalTile icon={BarChart3} label="Contracts launched" value={totalLaunches.toString()} />
              <SignalTile icon={Activity} label="Follow-up actions" value={totalInteractions.toString()} />
              <SignalTile icon={Gauge} label="Active deployers" value={String(activeDeployers)} />
              <SignalTile icon={Layers3} label="Top kit" value={topTemplate?.title ?? "No signal"} textValue />
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.82fr]">
              <div className="rounded-[26px] bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#31593f]">Seven-day cadence</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#777c73]">Registry launch records</p>
                  </div>
                  <p className="font-mono text-xs text-[#777c73]">{combinedRecords.length} sampled</p>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-2">
                  {cadence.map((bucket) => (
                    <div key={bucket.key} className="flex min-h-28 flex-col justify-end rounded-[18px] bg-[#f8f6ef]/72 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                      <span
                        className="block rounded-full bg-[#4e8f65]"
                        style={{ height: `${Math.max((bucket.count / maxCadence) * 72, bucket.count > 0 ? 10 : 3)}px` }}
                      />
                      <span className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#777c73]">{bucket.label}</span>
                      <span className="font-mono text-sm text-[#171714]">{bucket.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[26px] bg-[#171714] p-5 text-[#f8f6ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#4e8f65]/20 blur-2xl" aria-hidden="true" />
                <p className="relative font-mono text-[11px] uppercase tracking-[0.16em] text-[#f8f6ef]/55">Signal source</p>
                <p className="relative mt-6 text-3xl font-semibold leading-[0.95] tracking-[-0.05em]">
                  Registry + child contract reads.
                </p>
                <div className="relative mt-6 grid grid-cols-2 gap-2">
                  <DarkStat label="Templates" value={String(templates.length)} />
                  <DarkStat label="Sampled contracts" value={String(totalSampledContracts)} />
                  <DarkStat label="Admin control" value="0" />
                  <DarkStat label="Address tables" value="0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-[22px] bg-[#fff2ce]/78 p-4 text-sm leading-6 text-[#6d4b13]">
          {error.metrics.error || error.activity.error}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        {routes.map((route, index) => (
          <RouteSignalCard key={route.mode} route={route} index={index} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="panel p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#777c73]">Interaction ledger</p>
              <h2 className="mt-2 max-w-[9ch] text-5xl font-semibold leading-[0.94] tracking-[-0.055em] text-[#171714]">
                What happens after launch.
              </h2>
            </div>
            <Sparkles className="h-5 w-5 text-[#4e8f65]" aria-hidden="true" />
          </div>
          <div className="mt-8 space-y-4">
            {interactionRows.map((row, index) => {
              const width = maxInteraction > 0n ? Number((row.value * 100n) / maxInteraction) : 0;
              return (
                <div key={row.label} className="reveal-in rounded-[22px] bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]" style={{ "--index": index } as CSSProperties}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#171714]">{row.label}</p>
                      <p className="mt-1 text-xs text-[#777c73]">{row.detail}</p>
                    </div>
                    <p className="font-mono text-2xl tracking-[-0.04em] text-[#31593f]">{row.value.toString()}</p>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#171714]/10">
                    <div className="h-full rounded-full bg-[#171714]/75" style={{ width: `${Math.max(width, row.value > 0n ? 8 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <TemplateDemand routes={routes} totalLaunches={totalLaunches} />
      </section>

      <section className="analytics-provenance grid gap-4 rounded-[34px] p-5 md:p-6 lg:grid-cols-[0.78fr_1.22fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#777c73]">Faveri thesis</p>
          <h2 className="brand-word mt-3 max-w-[11ch] text-5xl font-semibold leading-[0.9] tracking-[-0.065em] text-[#171714] md:text-6xl">
            Make the rails feel invisible.
          </h2>
          <p className="mt-5 max-w-[48ch] text-sm leading-6 text-[#5d625a]">
            Faveri turns advanced onchain infrastructure into a calm launch flow: choose a rail, sign from your wallet, own the contract, and let public signals tell the story.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ProofCard icon={RadioTower} title="Launch without ceremony" copy="Templates compress contract deployment into a few clear choices and one owner-signed transaction." />
          <ProofCard icon={Activity} title="Usage becomes visible" copy="The analytics layer reads public contract activity and turns raw chain state into human signals." />
          <ProofCard icon={CircleDollarSign} title="Modern settlement rails" copy="Arc and USDC flows sit beside Ink-native contracts, giving builders room to choose the right rail." />
          <ProofCard icon={ShieldCheck} title="Ownership stays simple" copy="Contracts are user-owned by default. Faveri is the interface, not the hidden operator." />
        </div>
      </section>
    </div>
  );
}

function RouteSignalCard({ route, index }: { route: RouteAnalytics; index: number }) {
  const topTemplate = findTopTemplate([route]);
  const activeDeployers = new Set(route.metrics.recent.map((launch) => launch.deployer.toLowerCase())).size;
  const routeInteractions = route.activity.totalInteractions;

  return (
    <article
      className="analytics-route-card reveal-in rounded-[32px] p-5 md:p-6"
      style={{ "--index": index, "--route-accent": route.accent } as CSSProperties}
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#777c73]">{route.eyebrow}</p>
          <h2 className="mt-3 text-4xl font-semibold leading-[0.94] tracking-[-0.055em] text-[#171714] md:text-5xl">
            {route.name}
          </h2>
          <p className="mt-4 max-w-[42ch] text-sm leading-6 text-[#5d625a]">{route.copy}</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#171714] text-[#f8f6ef]">
          {route.mode === "arc" ? <Waves className="h-5 w-5" aria-hidden="true" /> : <BadgeCheck className="h-5 w-5" aria-hidden="true" />}
        </span>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <MiniStat label="Launches" value={route.metrics.total.toString()} />
        <MiniStat label="Active deployers" value={String(activeDeployers)} />
        <MiniStat label="Interactions" value={routeInteractions.toString()} />
      </div>

      <div className="mt-4 rounded-[24px] bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#171714]">{topTemplate?.title ?? "No top kit yet"}</p>
            <p className="mt-1 text-xs text-[#777c73]">Most used template by registry count</p>
          </div>
          <p className="font-mono text-xl text-[#31593f]">{topTemplate?.count.toString() ?? "0"}</p>
        </div>
      </div>
    </article>
  );
}

function TemplateDemand({ routes, totalLaunches }: { routes: RouteAnalytics[]; totalLaunches: bigint }) {
  const rows = templates.map((template) => {
    const route = routes.find((item) => item.templates.some((routeTemplate) => routeTemplate.id === template.id));
    const count = route?.metrics.usage[template.id] ?? 0n;
    const interactions = route?.activity.byTemplate[template.id] ?? 0n;
    return { template, count, interactions, route };
  });

  return (
    <section className="panel p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#777c73]">Template demand</p>
          <h2 className="mt-2 text-4xl font-semibold leading-[0.94] tracking-[-0.05em] text-[#171714]">Launch mix by kit.</h2>
        </div>
        <p className="max-w-[38ch] text-sm leading-6 text-[#687064]">
          Each row is a public registry signal, enriched with aggregate child-contract activity.
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        {rows.map((row, index) => {
          const visual = templateVisuals[row.template.slug];
          const share = totalLaunches > 0n ? Number((row.count * 10000n) / totalLaunches) / 100 : 0;
          return (
            <div key={row.template.slug} className="grid gap-3 rounded-[24px] bg-white/58 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] md:grid-cols-[120px_1fr_auto]" style={{ "--index": index } as CSSProperties}>
              <div className={`art-panel ${visual.artClass} relative aspect-[16/10] overflow-hidden rounded-[18px]`}>
                <TemplateArt slug={row.template.slug} />
              </div>
              <div className="min-w-0 self-center">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[#171714]">{row.template.title}</p>
                  <span className="rounded-full bg-[#171714]/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#687064]">
                    {row.route?.chainName ?? "Route"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#687064]">{row.template.description}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#171714]/10">
                  <div className="h-full rounded-full bg-[#4e8f65]" style={{ width: `${Math.max(share, row.count > 0n ? 5 : 0)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 self-center md:w-40">
                <MiniStat label="Launches" value={row.count.toString()} tight />
                <MiniStat label="Actions" value={row.interactions.toString()} tight />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SignalTile({
  icon: Icon,
  label,
  value,
  textValue = false
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  textValue?: boolean;
}) {
  return (
    <div className="rounded-[22px] bg-white/62 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#777c73]">{label}</p>
          <p className={`${textValue ? "text-lg leading-tight" : "font-mono text-3xl tracking-[-0.045em]"} mt-3 font-semibold text-[#171714]`}>
            {value}
          </p>
        </div>
        <Icon className="h-4 w-4 shrink-0 text-[#4e8f65]" aria-hidden="true" />
      </div>
    </div>
  );
}

function MiniStat({ label, value, tight = false }: { label: string; value: string; tight?: boolean }) {
  return (
    <div className={`rounded-[18px] bg-[#f8f6ef]/72 ${tight ? "p-3" : "p-4"} shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#777c73]">{label}</p>
      <p className={`${tight ? "text-xl" : "text-3xl"} mt-2 font-mono tracking-[-0.04em] text-[#171714]`}>{value}</p>
    </div>
  );
}

function DarkStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-white/[0.08] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#f8f6ef]/45">{label}</p>
      <p className="mt-2 font-mono text-xl text-[#f8f6ef]">{value}</p>
    </div>
  );
}

function ProofCard({ icon: Icon, title, copy }: { icon: typeof RadioTower; title: string; copy: string }) {
  return (
    <div className="rounded-[24px] bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
      <Icon className="h-5 w-5 text-[#4e8f65]" aria-hidden="true" />
      <p className="mt-4 font-semibold text-[#171714]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#687064]">{copy}</p>
    </div>
  );
}

function findTopTemplate(routes: RouteAnalytics[]) {
  return routes
    .flatMap((route) =>
      route.templates.map((template) => ({
        ...template,
        count: route.metrics.usage[template.id] ?? 0n
      }))
    )
    .sort((a, b) => Number(b.count - a.count))[0];
}

function buildCadence(records: LaunchRecord[]) {
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return {
      key: date.toISOString().slice(0, 10),
      label: dayFormatter.format(date),
      count: 0
    };
  });

  const indexByKey = new Map(buckets.map((bucket, index) => [bucket.key, index]));
  records.forEach((record) => {
    const date = new Date(Number(record.timestamp) * 1000);
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString().slice(0, 10);
    const index = indexByKey.get(key);
    if (index !== undefined) {
      buckets[index].count += 1;
    }
  });

  return buckets;
}
