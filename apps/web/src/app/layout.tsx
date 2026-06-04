import type { Metadata } from "next";
import Link from "next/link";
import { Bolt } from "lucide-react";
import { ConnectWallet } from "@/components/ConnectWallet";
import { Providers } from "@/app/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ink Contract Launcher",
  description: "Deploy user-owned contracts on Ink and USDC-native settlement contracts on Arc."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen">
            <header className="pointer-events-none fixed inset-x-0 top-0 z-20 px-3 pt-3 sm:px-6">
              <div className="floating-nav liquid-glass-strong pointer-events-auto mx-auto flex max-w-6xl flex-col gap-3 rounded-[24px] px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
                <Link href="/" className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#171714] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
                    <Bolt className="h-5 w-5 text-[#fbfaf4]" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[#171714]">Ink Contract Launcher</span>
                    <span className="block text-xs text-[#686b63]">Ink + Arc contract deployments</span>
                  </span>
                </Link>
                <nav className="flex flex-wrap items-center gap-2 text-sm text-[#55584f]">
                  <Link className="liquid-glass rounded-full px-3 py-2 transition-transform hover:scale-105 hover:text-[#171714] active:scale-95" href="/">
                    Launch
                  </Link>
                  <Link className="liquid-glass rounded-full px-3 py-2 transition-transform hover:scale-105 hover:text-[#171714] active:scale-95" href="/dashboard">
                    Analytics
                  </Link>
                  <ConnectWallet />
                </nav>
              </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 pb-12 pt-32 sm:px-6 lg:px-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
