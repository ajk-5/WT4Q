import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import BreakingNewsBar from "@/components/BreakingNewsBar";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import PageVisitReporter from "@/components/PageVisitReporter";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});


const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.90stimes.com';

export const metadata: Metadata = {
  title: {
    default: 'The Nineties Times',
    template: '%s | The Nineties Times'
  },
  description: 'Latest news and updates from The Nineties Times',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'The Nineties Times',
    description: 'Latest news and updates from The Nineties Times',
    url: siteUrl,
    siteName: 'The Nineties Times',
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
        <meta
          name="google-adsense-account"
          content="ca-pub-2858608482723109"
        />
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
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2858608482723109"
          crossOrigin="anonymous"
        />
        <Script
          async
          type="application/javascript"
          src="https://news.google.com/swg/js/v1/swg-basic.js"
        />
        <Script id="swg-basic" strategy="afterInteractive">
          {`
            (self.SWG_BASIC = self.SWG_BASIC || []).push(basicSubscriptions => {
              basicSubscriptions.init({
                type: "NewsArticle",
                isPartOfType: ["Product"],
                isPartOfProductId: "CAowzfDADA:openaccess",
                clientOptions: { theme: "light", lang: "en" },
              });
            });
          `}
        </Script>
      </head>
      <body className={`${inter.variable}`}>
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
