import type { Metadata, Viewport } from "next";
/**
 * Atkinson Hyperlegible, self-hosted via @fontsource — no build-time or
 * runtime call to Google Fonts, so the app builds offline and loads nothing
 * from a third-party origin.
 *
 * The @font-face rules below are only *matched* when the user turns on
 * "Dyslexia-friendly font" in the Accessibility panel (see globals.css), so
 * for everyone else the browser never downloads the files and the app keeps
 * the system stack — which is what renders real San Francisco on Apple devices.
 */
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mental Model × DISCO",
  description:
    "Mental Model Mapper × 7-Step DISCO Cognitive Task Analysis — a cognitive design analysis tool for design students and faculty.",
  applicationName: "Mental Model × DISCO",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "MM×DISCO",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets content sit under the notch so we can pad with env(safe-area-inset-*).
  viewportFit: "cover",
  // Deliberately no maximumScale / userScalable — pinch-zoom must stay available.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f0ea" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
