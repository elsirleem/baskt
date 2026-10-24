import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AfroPantry — Taste of home. African essentials, delivered.",
    template: "%s — AfroPantry",
  },
  description:
    "Authentic African groceries delivered across the UK. Subscribe, save, and cook with in-app recipes. Free delivery over £70.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "AfroPantry", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1A6B3C",
  // Lets the bottom tab bar sit above the iPhone home indicator.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8 pt-2 md:px-6 md:pt-8">
          {children}
        </main>
        <footer className="mb-[calc(4.5rem+env(safe-area-inset-bottom))] border-t border-line py-6 text-center text-xs text-ink-soft md:mb-0 md:text-sm">
          AfroPantry — Taste of home. African essentials, delivered across the UK.
        </footer>
        <BottomNav />
      </body>
    </html>
  );
}
