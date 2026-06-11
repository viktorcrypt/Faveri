import type { Metadata } from "next";
import { SiteChrome } from "@/components/SiteChrome";
import { Providers } from "@/app/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Faveri",
  description: "Deploy user-owned contracts on Ink and USDC-native settlement contracts on Arc."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SiteChrome />
          {children}
        </Providers>
      </body>
    </html>
  );
}
