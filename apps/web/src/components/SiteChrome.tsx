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
          className="brand-lockup pointer-events-auto transition-transform hover:scale-[1.02] active:scale-[0.98]"
          href="/"
        >
          <span className="brand-word block text-[1.65rem] leading-none tracking-[-0.075em] text-[#171714] sm:text-[1.9rem]">
            Faveri
          </span>
          <span className="brand-lockup-line" aria-hidden="true" />
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
