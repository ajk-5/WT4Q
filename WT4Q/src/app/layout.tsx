import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import PageVisitReporter from "@/components/PageVisitReporter";
import BreakingNewsBar from "@/components/BreakingNewsBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.wt4q.com';

export const metadata: Metadata = {
  title: {
    default: 'WT4Q News',
    template: '%s | WT4Q'
  },
  description: 'Latest news and updates from WT4Q',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'WT4Q News',
    description: 'Latest news and updates from WT4Q',
    url: siteUrl,
    siteName: 'WT4Q News',
    type: 'website',
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-0NKNBEMWC2"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-0NKNBEMWC2');
          `}
        </Script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <PageVisitReporter />
        <Header />
        <BreakingNewsBar />
        <main>{children}</main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
