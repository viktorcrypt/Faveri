"use client";

import Link from "next/link";
import { Activity, BarChart3, Database, ExternalLink, RadioTower, TriangleAlert } from "lucide-react";
import type { CSSProperties } from "react";
import { useChainId } from "wagmi";
import { TemplateArt, templateVisuals } from "@/components/TemplateArt";
import { explorerLink } from "@/lib/chains";
import { formatDate, shortAddress } from "@/lib/format";
import { getRegistryAddress, registrySetupMessage } from "@/lib/registry";
import { templateSlugFromId, templates } from "@/lib/templates";
import { useRegistryMetrics } from "@/lib/useRegistryMetrics";

export function DashboardClient() {
  const chainId = useChainId();
  const registryAddress = getRegistryAddress(chainId);
  const metrics = useRegistryMetrics(25);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <div className="reveal-in flex min-h-[410px] flex-col justify-between rounded-[28px] border border-[#171714]/10 bg-white/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] [--index:0] md:p-8">
          <div className="space-y-5">
            <p className="inline-flex rounded-md border border-[#4e8f65]/25 bg-[#4e8f65]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#31593f]">
              Onchain analytics
            </p>
            <h1 className="max-w-[12ch] text-5xl font-semibold leading-[0.94] tracking-[-0.055em] text-[#171714] md:text-6xl">
              Registry signals without backend noise.
            </h1>
            <p className="max-w-[58ch] text-base leading-7 text-[#55584f]">
              Deployments, template mix, deployer addresses, and timestamps are read from the public launcher registry.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <MetricTile icon={BarChart3} label="Contracts launched" value={metrics.total.toString()} />
            <MetricTile icon={Activity} label="Templates tracked" value={String(templates.length)} />
            <MetricTile icon={RadioTower} label="Current chain" value={String(chainId)} />
          </div>
        </div>

        <aside className="hero-visual reveal-in relative overflow-hidden rounded-[28px] border border-[#171714]/10 p-5 [--index:1]">
          <div className="absolute right-8 top-8 h-40 w-40 rounded-full border border-ink-300/[0.15]" />
          <div className="absolute bottom-4 left-8 h-48 w-48 rounded-full border border-[#e8c985]/10" />
          <div className="relative flex h-full min-h-[410px] flex-col justify-between rounded-[22px] border border-[#171714]/10 bg-white/60 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#777a72]">Registry address</p>
                  <p className="mt-3 break-all font-mono text-sm leading-6 text-[#171714]">
                    {registryAddress ?? "Not configured"}
                  </p>
                </div>
                <Database className="h-5 w-5 shrink-0 text-[#4e8f65]" aria-hidden="true" />
              </div>
              {!registryAddress && (
                <div className="mt-4 rounded-md border border-[#a8752f]/20 bg-[#fff2ce]/70 p-3 text-sm leading-6 text-[#6d4b13]">
                  <TriangleAlert className="mb-2 h-4 w-4" aria-hidden="true" />
                  {registrySetupMessage(chainId)}
                </div>
              )}
            </div>

            <div className="mt-8 space-y-3">
              {templates.slice(0, 4).map((template) => {
                const usage = metrics.usage[template.id] ?? 0n;
                const visual = templateVisuals[template.slug];
                return (
                  <div key={template.slug} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-[14px] border border-[#171714]/10 bg-white/[0.65] p-2">
                    <div className={`art-panel ${visual.artClass} relative h-14 overflow-hidden rounded-[10px] border border-[#171714]/10`}>
                      <TemplateArt slug={template.slug} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#171714]">{template.title}</p>
                      <p className="mt-0.5 text-xs text-[#777a72]">{visual.signal}</p>
                    </div>
                    <p className="font-mono text-lg text-[#31593f]">{usage.toString()}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {registryAddress && explorerLink(chainId, registryAddress) && (
                <a className="button-secondary" href={explorerLink(chainId, registryAddress)} rel="noreferrer" target="_blank">
                  Open registry
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
              <Link className="button-primary" href="/">
                Launch contract
              </Link>
            </div>
          </div>
        </aside>
      </section>

      <section className="panel p-5 md:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#171714]/10 pb-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-[#31593f]">Template usage</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-[#171714]">Launch mix</h2>
          </div>
          <p className="max-w-[44ch] text-sm leading-6 text-[#686b63]">
            Each tile maps to the exact contract kit users deploy from the launcher.
          </p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.18fr_1fr_1fr_1fr_1fr]">
          {templates.map((template, index) => {
            const value = metrics.usage[template.id] ?? 0n;
            const total = metrics.total > 0n ? Number((value * 10000n) / metrics.total) / 100 : 0;
            const visual = templateVisuals[template.slug];
            return (
              <div
                key={template.slug}
                className={`template-card ${visual.artClass} reveal-in rounded-[18px] border border-[#171714]/10 p-3`}
                style={{ "--index": index } as CSSProperties}
              >
                <div className={`art-panel ${visual.artClass} relative aspect-[16/10] overflow-hidden rounded-[14px] border border-[#171714]/10`}>
                  <TemplateArt slug={template.slug} />
                  <span className="absolute left-3 top-3 rounded-md border border-[#171714]/10 bg-[#081011]/50 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#dce6d6] backdrop-blur">
                    {visual.proof}
                  </span>
                </div>
                <div className="p-2">
                  <p className="mt-2 text-sm font-semibold text-[#171714]">{template.title}</p>
                  <p className="mt-2 font-mono text-4xl tracking-[-0.04em] text-[#31593f]">{value.toString()}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#171714]/10">
                    <div className="h-full rounded-full bg-[#4e8f65]" style={{ width: `${Math.min(total, 100)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-[#777a72]">{total.toFixed(1)}% of launches</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel overflow-hidden p-5 md:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#171714]/10 pb-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-[#31593f]">Recent launches</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-[#171714]">Registry table</h2>
          </div>
          <Link className="button-secondary" href="/">
            Launch another contract
          </Link>
        </div>

        {metrics.error && (
          <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-800">
            {metrics.error}
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          {metrics.isLoading ? (
            <div className="space-y-2">
              <div className="skeleton h-12 rounded-md" />
              <div className="skeleton h-12 rounded-md" />
              <div className="skeleton h-12 rounded-md" />
            </div>
          ) : metrics.recent.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[#171714]/[0.15] p-10 text-center">
              <p className="font-semibold text-[#171714]">No launches recorded yet</p>
              <p className="mt-2 text-sm text-[#686b63]">Deploy a template and the registry will populate this table.</p>
            </div>
          ) : (
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-[#777a72]">
                <tr>
                  <th className="py-3 pr-4">Template</th>
                  <th className="py-3 pr-4">Deployer</th>
                  <th className="py-3 pr-4">Contract</th>
                  <th className="py-3 pr-4">Metadata</th>
                  <th className="py-3 pr-4">Timestamp</th>
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
                    <td className="max-w-[240px] truncate py-3 pr-4">{launch.metadata || "None"}</td>
                    <td className="py-3 pr-4">{formatDate(launch.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[16px] border border-[#171714]/10 bg-white/[0.65] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[#777a72]">{label}</p>
          <p className="mt-3 font-mono text-3xl text-[#171714]">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-[#4e8f65]" aria-hidden="true" />
      </div>
    </div>
  );
}



