"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BarChart3, Rocket } from "lucide-react";
import { ConnectWallet } from "@/components/ConnectWallet";

export function SiteChrome() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isAnalytics = pathname === "/analytics" || pathname === "/dashboard";
  const signalLink = isAnalytics ? "/" : "/analytics";
  const SignalIcon = isAnalytics ? Rocket : BarChart3;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-5">
      <div className="mx-auto flex max-w-[1500px] items-start justify-between gap-3">
        <Link
          className="brand-lockup pointer-events-auto transition-transform hover:scale-[1.02] active:scale-[0.98]"
          href="/"
        >
          <span className="brand-word block text-[1.65rem] leading-none tracking-[-0.075em] text-[#171714] sm:text-[1.9rem]">
            Faveri
          </span>
          <span className="brand-lockup-line" aria-hidden="true" />
        </Link>

        <div className="pointer-events-auto flex max-w-[calc(100vw-6.5rem)] flex-wrap justify-end gap-2">
          <Link
            className="chrome-pill inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[#171714] transition-transform hover:scale-[1.03] active:scale-[0.97]"
            href={signalLink}
          >
            <SignalIcon className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{isAnalytics ? "Launch" : "Analytics"}</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          {!isLanding && <ConnectWallet />}
        </div>
      </div>
    </header>
  );
}
