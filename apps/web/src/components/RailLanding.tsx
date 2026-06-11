import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight, Cable, GitBranch, Route } from "lucide-react";

const rails = [
  {
    href: "/ink",
    label: "Ink rail",
    title: "Launch user-owned contracts on Ink.",
    copy: "ETH-native kits for builder tools, badges, message walls, tokens, and escrowed work.",
    meta: "Ink mainnet",
    icon: GitBranch,
    className: "rail-choice-ink"
  },
  {
    href: "/arc",
    label: "Arc rail",
    title: "Settle work with USDC on Arc.",
    copy: "USDC tip jars, escrows, and Gateway funding signals for dollar-denominated workflows.",
    meta: "Arc testnet",
    icon: Route,
    className: "rail-choice-arc"
  }
];

export function RailLanding() {
  return (
    <main className="rail-page relative min-h-[100dvh] overflow-hidden px-4 py-24 sm:px-6 lg:px-10">
      <div className="rail-grid" aria-hidden="true" />
      <div className="rail-perspective" aria-hidden="true">
        <span className="rail-track rail-track-a" />
        <span className="rail-track rail-track-b" />
        <span className="rail-track rail-track-c" />
        <span className="rail-track rail-track-d" />
        <span className="rail-pulse rail-pulse-a" />
        <span className="rail-pulse rail-pulse-b" />
      </div>

      <section className="relative mx-auto grid min-h-[calc(100dvh-12rem)] max-w-[1500px] items-end gap-10 pt-12 lg:grid-cols-[0.92fr_1.08fr] lg:pt-20">
        <div className="reveal-in max-w-4xl space-y-8 [--index:0]">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#171714]/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#f8f6ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
            <Cable className="h-4 w-4" aria-hidden="true" />
            onchain launch terminal
          </div>
          <div>
            <p className="brand-word text-[clamp(4rem,12vw,12rem)] leading-[0.78] tracking-[-0.075em] text-[#171714]">
              Faveri
            </p>
            <h1 className="mt-7 max-w-[11ch] text-[clamp(2.6rem,6vw,7.2rem)] font-semibold leading-[0.9] tracking-[-0.06em] text-[#171714]">
              Choose your rail. Launch your contract.
            </h1>
          </div>
          <p className="max-w-[48ch] text-base leading-7 text-[#555a52] md:text-lg">
            Pick Ink or Arc, configure a real contract kit, sign from your wallet, and keep ownership in your own address.
          </p>
        </div>

        <div className="reveal-in grid gap-4 [--index:1] lg:self-center">
          {rails.map((rail, index) => {
            const Icon = rail.icon;
            return (
              <Link
                key={rail.href}
                className={`rail-choice group relative overflow-hidden rounded-[34px] p-5 transition duration-300 hover:-translate-y-1 active:translate-y-0 ${rail.className}`}
                href={rail.href}
                style={{ "--index": index } as CSSProperties}
              >
                <span className="rail-choice-lines" aria-hidden="true" />
                <span className="relative flex min-h-[250px] flex-col justify-between gap-8">
                  <span className="flex items-start justify-between gap-4">
                    <span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#687064]">{rail.label}</span>
                        <span className="rounded-full bg-[#171714]/[0.06] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#687064]">
                          {rail.meta}
                        </span>
                      </span>
                      <span className="mt-3 block max-w-[12ch] text-4xl font-semibold leading-[0.94] tracking-[-0.05em] text-[#171714] md:text-5xl">
                        {rail.title}
                      </span>
                    </span>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#171714] text-[#f8f6ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition duration-300 group-hover:scale-105">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
                    <span className="max-w-[48ch] text-sm leading-6 text-[#555a52]">{rail.copy}</span>
                    <span className="inline-flex items-center justify-center gap-2 rounded-full bg-white/65 px-4 py-3 text-sm font-semibold text-[#171714] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur">
                      Enter route
                      <ArrowUpRight className="h-4 w-4 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
