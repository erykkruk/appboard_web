import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AppBoard - ASO Manager",
  description: "Manage your app store listings, assets, and reviews",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        {/* Umami analytics — production only so local/dev traffic is excluded. */}
        {process.env.NODE_ENV === "production" && (
          <Script
            defer
            src="https://umami.team.codigee.com/script.js"
            data-website-id="194b7cde-67b6-4978-9164-ee7915aa7849"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
