// app/layout.tsx
import type { Metadata } from "next";
import "./styles/globals.css";
import { NextAuthProvider } from "@/components/auth/NextAuthProvider";
import { SessionProvider } from "@/components/SessionProvider";
import LayoutWrapper from "@/components/layoutWrapper";

export const metadata: Metadata = {
  title: "Asset Tracking System",
  description: "IT Asset Tracking System with QR codes and barcodes",
  icons: {
    icon: '/favicon.ico', // Main favicon
    // Optional: Additional icons for different sizes
    apple: '/apple-touch-icon.png', // For iOS devices
    shortcut: '/favicon-16x16.png', // For PWA
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-black">
        <NextAuthProvider>
          <SessionProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </SessionProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
