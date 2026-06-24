import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Baskt — Taste of home. African essentials, delivered.",
  description:
    "Authentic African groceries delivered across the UK. Subscribe, save, and cook with in-app recipes. Free delivery over £70.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Baskt", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#047857",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
          Baskt — Taste of home. African essentials, delivered across the UK. Demo app;
          payments run in Stripe test mode.
        </footer>
      </body>
    </html>
  );
}
