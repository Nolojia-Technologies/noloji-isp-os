import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { MSWProvider } from "@/components/providers/msw-provider";
import { Toaster } from "@/components/ui/toaster";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthProvider } from "@/contexts/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Noloji ISP OS - Internet Service Provider Management Platform",
  description: "Comprehensive ISP management platform for billing, device provisioning, technician tracking, and network operations",
  keywords: ["ISP", "management", "billing", "network", "fiber", "hotspot", "technician"],
  authors: [{ name: "Noloji Systems" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

import NextTopLoader from "nextjs-toploader";

// ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextTopLoader color="#2563eb" showSpinner={false} />
        <MSWProvider>
          <QueryProvider>
            <ThemeProvider>
              <AuthProvider>
                <AppLayout>
                  {children}
                </AppLayout>
                <Toaster />
              </AuthProvider>
            </ThemeProvider>
          </QueryProvider>
        </MSWProvider>
      </body>
    </html>
  );
}
