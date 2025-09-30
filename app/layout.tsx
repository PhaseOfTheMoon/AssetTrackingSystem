import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FYP Asset Tracking",
  description: "QR Scan UI demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
