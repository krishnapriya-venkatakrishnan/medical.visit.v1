import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { PrototypeDisclaimer } from "@/components/prototype-disclaimer";
import { AppNav } from "@/components/app-nav";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dashboard - Clinician Workspace",
  description:
    "Prototype of an AI pre-brief → clinician-in-the-loop review → drafted member debrief. Synthetic data only. Not a medical device.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${hankenGrotesk.variable} antialiased`}>
      <body className="min-h-screen bg-bg text-ink font-sans flex flex-col">
        <Providers>
          <PrototypeDisclaimer />
          <div className="flex flex-1 flex-col md:flex-row">
            <AppNav />
            <div className="flex min-w-0 flex-1 flex-col">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
