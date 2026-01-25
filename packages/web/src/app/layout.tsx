import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

// Force dynamic rendering for all routes
// This prevents static generation issues with client-side auth hooks
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Calibr.xyz - Prediction Market Portfolio Manager",
  description:
    "Aggregate and optimize your prediction market positions across platforms",
};

/**
 * Root layout - Wraps all routes with providers
 *
 * Note: Header is rendered in route group layouts:
 * - PublicLayout (/) handles public routes
 * - AppLayout (/markets, /portfolio, etc.) handles authenticated routes
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-mono bg-black text-green-500">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
