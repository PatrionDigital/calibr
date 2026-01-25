import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calibr.xyz - Prediction Market Portfolio Manager",
  description:
    "Aggregate and optimize your prediction market positions across platforms",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-mono bg-black text-green-500">
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
