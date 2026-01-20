import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calibr.ly - Prediction Market Portfolio Manager",
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
      <body className="font-mono bg-black text-green-500">{children}</body>
    </html>
  );
}
