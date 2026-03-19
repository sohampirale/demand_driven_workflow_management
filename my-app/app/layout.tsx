import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DemandFlow - AI-Powered Demand-Driven Automation",
  description: "Build intelligent workflows that respond to real customer demand. Automate customer engagement, product lifecycle, and operations with pull-based automation.",
  keywords: ["automation", "demand-driven", "workflow", "AI", "customer engagement", "pull-based"],
  authors: [{ name: "DemandFlow" }],
  openGraph: {
    title: "DemandFlow - AI-Powered Demand-Driven Automation",
    description: "Build intelligent workflows that respond to real customer demand.",
    type: "website",
  },
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
