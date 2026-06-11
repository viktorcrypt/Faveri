"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "@/components/ConnectWallet";

export function SiteChrome() {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-5">
      <div className="mx-auto flex max-w-[1500px] items-start justify-between gap-3">
        <Link
          className="chrome-pill pointer-events-auto flex items-center gap-3 rounded-full px-3 py-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          href="/"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#171714] text-[11px] font-semibold uppercase tracking-[-0.03em] text-[#f8f6ef]">
            F
          </span>
          <span className="hidden sm:block">
            <span className="brand-word block text-lg leading-none text-[#171714]">Faveri</span>
            <span className="block pt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#6d7169]">
              launch terminal
            </span>
          </span>
        </Link>

        {!isLanding && (
        <div className="pointer-events-auto flex max-w-[calc(100vw-5.5rem)] justify-end">
          <ConnectWallet />
        </div>
        )}
      </div>
    </header>
  );
}
