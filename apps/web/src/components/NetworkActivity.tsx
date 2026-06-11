"use client";

import { Activity, Gauge, Layers3, MousePointerClick, ShieldCheck, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { useChildContractActivity } from "@/lib/useChildContractActivity";
import { templates, templatesForMode, type LauncherMode } from "@/lib/templates";
import type { LaunchRecord } from "@/lib/useRegistryMetrics";

type NetworkMetrics = {
  total: bigint;
  usage: Record<number, bigint>;
  recent: LaunchRecord[];
  isLoading: boolean;
  error?: string;
};

type NetworkActivityProps = {
  metrics: NetworkMetrics;
  mode?: LauncherMode;
  chainId?: number;
  compact?: boolean;
};

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });

export function NetworkActivity({ metrics, mode, chainId, compact = false }: NetworkActivityProps) {
  const scopedTemplates = mode ? templatesForMode(mode) : templates;
  const scopedTemplateIdsArray = scopedTemplates.map((template) => template.id);
  const scopedTemplateIds = new Set(scopedTemplateIdsArray);
  const scopedRecent = metrics.recent.filter((launch) => scopedTemplateIds.has(launch.templateId));
  const childActivity = useChildContractActivity(metrics.recent, chainId, scopedTemplateIdsArray);
  const usageRows = scopedTemplates.map((template) => ({
    template,
    count: metrics.usage[template.id] ?? 0n
  }));
  const scopedTotal = mode ? usageRows.reduce((sum, row) => sum + row.count, 0n) : metrics.total;
  const topTemplate = [...usageRows].sort((a, b) => Number(b.count - a.count))[0];
  const activeDeployers = new Set(scopedRecent.map((launch) => launch.deployer.toLowerCase())).size;
  const recentWindow = scopedRecent.length;
  const cadence = buildCadence(scopedRecent);
  const maxUsage = usageRows.reduce((max, row) => (row.count > max ? row.count : max), 0n);
  const maxCadence = Math.max(...cadence.map((bucket) => bucket.count), 1);
  const routeLabel = mode === "arc" ? "Arc" : mode === "ink" ? "Ink" : "network";
  const interactionRows = [
    { label: "Tips sent", value: childActivity.tips, detail: "ETH + USDC tip jars" },
    { label: "Messages posted", value: childActivity.messages, detail: "Guestbook writes" },
    { label: "Badges minted", value: childActivity.badgesMinted, detail: "Builder Badge mints" },
    { label: "Escrow steps", value: childActivity.escrowSteps, detail: "Submit, approve, claim, refund" }
  ];
  const maxInteraction = interactionRows.reduce((max, row) => (row.value > max ? row.value : max), 0n);

  return (
    <section className={`panel overflow-hidden p-5 md:p-6 ${compact ? "" : "md:p-7"}`}>
      <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
        <div className="flex flex-col justify-between gap-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#777c73]">Network Activity</p>
            <h2 className={`${compact ? "text-4xl" : "text-5xl md:text-6xl"} mt-3 max-w-[11ch] font-semibold leading-[0.94] tracking-[-0.055em] text-[#171714]`}>
              Aggregate signals only.
            </h2>
            <p className="mt-5 max-w-[48ch] text-sm leading-6 text-[#5d625a]">
              Faveri reads public registry data and shows counts, momentum, and kit demand without listing individual wallets or contracts.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ActivityStat icon={Gauge} label="Launches observed" value={scopedTotal.toString()} />
            <ActivityStat icon={UsersRound} label="Active deployers" value={String(activeDeployers)} />
            <ActivityStat icon={MousePointerClick} label="Follow-up actions" value={childActivity.totalInteractions.toString()} />
            <ActivityStat
              icon={Layers3}
              label="Most used kit"
              value={topTemplate && topTemplate.count > 0n ? topTemplate.template.title : "No signal"}
              textValue
            />
          </div>

          <div className="rounded-[22px] bg-[#171714]/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/70 text-[#31593f] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#171714]">Aggregate-only analytics</p>
                <p className="mt-1 text-sm leading-6 text-[#687064]">
                  Raw chain records are reduced client-side into totals. Public analytics stays focused on network-level signals.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {(metrics.error || childActivity.error) && (
            <div className="rounded-[18px] bg-[#fff2ce]/78 p-4 text-sm leading-6 text-[#6d4b13]">
              {metrics.error || childActivity.error}
            </div>
          )}

          {metrics.isLoading || childActivity.isLoading ? (
            <NetworkSkeleton />
          ) : scopedTotal === 0n ? (
            <div className="rounded-[26px] border border-dashed border-[#171714]/[0.16] bg-white/52 p-8 text-center">
              <Activity className="mx-auto h-6 w-6 text-[#777c73]" aria-hidden="true" />
              <p className="mt-3 font-semibold text-[#171714]">No aggregate signal yet</p>
              <p className="mt-2 text-sm text-[#687064]">Launches on the {routeLabel} route will populate this panel automatically.</p>
            </div>
          ) : (
            <>
              <div className="rounded-[26px] bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur">
                <div className="flex items-end justify-between gap-4 pb-4">
                  <div>
                    <p className="text-sm font-semibold text-[#31593f]">Kit demand</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#777c73]">What builders launch most</p>
                  </div>
                  <p className="font-mono text-xs text-[#777c73]">{routeLabel}</p>
                </div>
                <div className="space-y-3">
                  {usageRows.map((row, index) => {
                    const width = maxUsage > 0n ? Number((row.count * 100n) / maxUsage) : 0;
                    return (
                      <div
                        key={row.template.slug}
                        className="reveal-in rounded-[18px] bg-[#f8f6ef]/72 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]"
                        style={{ "--index": index } as CSSProperties}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-[#171714]">{row.template.title}</p>
                            <p className="mt-0.5 text-xs text-[#777c73]">{row.template.currency} kit</p>
                          </div>
                          <p className="font-mono text-xl tracking-[-0.035em] text-[#31593f]">{row.count.toString()}</p>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#171714]/10">
                          <div className="h-full rounded-full bg-[#4e8f65]" style={{ width: `${Math.max(width, row.count > 0n ? 6 : 0)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[26px] bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur">
                  <p className="text-sm font-semibold text-[#31593f]">Child contract actions</p>
                  <div className="mt-4 space-y-3">
                    {interactionRows.map((row) => {
                      const width = maxInteraction > 0n ? Number((row.value * 100n) / maxInteraction) : 0;
                      return (
                        <div key={row.label} className="grid grid-cols-[1fr_1.2fr_2.5rem] items-center gap-3">
                          <span>
                            <span className="block text-sm font-medium text-[#171714]">{row.label}</span>
                            <span className="block text-[11px] text-[#777c73]">{row.detail}</span>
                          </span>
                          <span className="h-1.5 overflow-hidden rounded-full bg-[#171714]/10">
                            <span className="block h-full rounded-full bg-[#171714]/70" style={{ width: `${Math.max(width, row.value > 0n ? 8 : 0)}%` }} />
                          </span>
                          <span className="text-right font-mono text-sm text-[#171714]">{row.value.toString()}</span>
                        </div>
                      );
                    })}
                  </div>
                  {childActivity.partialFailures > 0 && (
                    <p className="mt-4 text-xs leading-5 text-[#777c73]">
                      {childActivity.partialFailures} child reads were skipped by the RPC. Public output remains aggregate-only.
                    </p>
                  )}
                </div>

                <div className="relative overflow-hidden rounded-[26px] bg-[#171714] p-5 text-[#f8f6ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#4e8f65]/20 blur-2xl" aria-hidden="true" />
                  <p className="relative font-mono text-[11px] uppercase tracking-[0.16em] text-[#f8f6ef]/55">Signal readout</p>
                  <p className="relative mt-8 max-w-[12ch] text-4xl font-semibold leading-[0.92] tracking-[-0.055em]">
                    {topTemplate && topTemplate.count > 0n ? topTemplate.template.title : "Awaiting first launch"}
                  </p>
                  <p className="relative mt-4 text-sm leading-6 text-[#f8f6ef]/62">
                    Current top kit by aggregate registry usage. Child contract counters are read directly, but no individual wallets or contracts are listed.
                  </p>
                  <div className="relative mt-6 grid grid-cols-2 gap-2">
                    <DarkStat label="Sampled contracts" value={String(childActivity.sampleSize)} />
                    <DarkStat label="Resolved escrows" value={String(childActivity.escrowsResolved)} />
                  </div>
                </div>
              </div>

              <div className="rounded-[26px] bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#31593f]">Launch cadence</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#777c73]">Last seven calendar days</p>
                  </div>
                  <p className="font-mono text-xs text-[#777c73]">{recentWindow} recent launches</p>
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
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ActivityStat({
  icon: Icon,
  label,
  value,
  textValue = false
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  textValue?: boolean;
}) {
  return (
    <div className="rounded-[20px] bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#777c73]">{label}</p>
          <p className={`${textValue ? "text-lg leading-tight" : "font-mono text-3xl tracking-[-0.04em]"} mt-3 font-semibold text-[#171714]`}>
            {value}
          </p>
        </div>
        <Icon className="h-4 w-4 shrink-0 text-[#4e8f65]" aria-hidden="true" />
      </div>
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

function NetworkSkeleton() {
  return (
    <div className="space-y-3">
      <div className="skeleton h-36 rounded-[26px]" />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="skeleton h-44 rounded-[26px]" />
        <div className="skeleton h-44 rounded-[26px]" />
      </div>
    </div>
  );
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
