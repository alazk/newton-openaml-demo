import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (the same file Lazarus Scan ships), so the build never waits on Google Fonts.
// The brand's display face (newt.foundation/brand). A Latin subset of GT Sectra
// Fine Regular, for headlines only. Licensed to the Foundation by Grilli Type.
const display = localFont({ src: "./gt-sectra-fine-regular.woff2", variable: "--font-display", display: "swap", weight: "400" });
const sans = localFont({ src: "./inter-latin.woff2", variable: "--font-sans", display: "swap", weight: "400 500" });

const TITLE = "Newton Protocol × FINOS OpenAML: wallet screening demo";

const DESCRIPTION =
  "Check a wallet before you pay it. The transfer is screened against 364,486 addresses labeled by OpenAML, a FINOS Labs project, and Newton Protocol operators sign the decision on Ethereum Sepolia before it executes.";

export const viewport: Viewport = { themeColor: "#010101", colorScheme: "dark" };

// Share images need an absolute URL. Vercel sets the production host at build
// time; locally the preview falls back to localhost.
const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", siteName: "Newton" },
  // Images come from app/opengraph-image.tsx and app/twitter-image.tsx.
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
