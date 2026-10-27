import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (the same file Lazarus Scan ships), so the build never waits on Google Fonts.
const sans = localFont({ src: "./inter-latin.woff2", variable: "--font-sans", display: "swap", weight: "400 500" });

const DESCRIPTION =
  "Check a wallet before you pay it. The transfer is screened against 364,503 addresses labeled by OpenAML, and Newton Protocol operators sign the decision on Ethereum Sepolia before it executes.";

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export const metadata: Metadata = {
  title: "Newton OpenAML Demo",
  description: DESCRIPTION,
  openGraph: { title: "Newton OpenAML Demo", description: DESCRIPTION, type: "website", siteName: "Newton" },
  // Images come from app/opengraph-image.tsx and app/twitter-image.tsx.
  twitter: { card: "summary_large_image", title: "Newton OpenAML Demo", description: DESCRIPTION },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
