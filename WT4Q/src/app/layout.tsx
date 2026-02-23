import type { Metadata } from "next";
import Script from "next/script";
import { IBM_Plex_Mono, IBM_Plex_Sans, VT323 } from "next/font/google";

import GlobalStyles from "./global-styles";
import Header from "@/components/Header";
import BreakingNewsBarClient from "@/components/BreakingNewsBarClient";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import PageVisitReporter from "@/components/PageVisitReporter";
import AdSenseLoader from "@/components/AdSenseLoader";
import GoogleAnalyticsLoader from "@/components/GoogleAnalyticsLoader";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.90stimes.com";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "The Nineties Times (90sTimes)",
  title: {
    default: "The Nineties Times",
    template: "%s | The Nineties Times",
  },
  description:
    "The Nineties Times (90sTimes) is a 90s time capsule of stories, quizzes, games, and culture throwbacks built for nostalgia lovers.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "The Nineties Times",
    description:
      "A 90s nostalgia hub with stories, quizzes, arcade throwbacks, and pop culture memories.",
    url: siteUrl,
    siteName: "The Nineties Times",
    type: "website",
  },
  keywords: [
    "The Nineties Times",
    "90sTimes",
    "90stimes",
    "90s Times",
    "Nineties nostalgia",
    "90s culture",
    "retro games",
    "90s quizzes",
  ],
  twitter: {
    card: "summary_large_image",
    title: "The Nineties Times",
    description:
      "A 90s nostalgia hub with stories, quizzes, arcade throwbacks, and pop culture memories.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable}`}
    >
      <head>
        <GlobalStyles />
        {/* Structured data for brand synonyms */}
        <Script id="ld-org" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "The Nineties Times",
            alternateName: ["90sTimes", "90stimes", "90s Times", "Nineties Times"],
            description: "A 90s nostalgia hub with stories, quizzes, arcade throwbacks, and pop culture memories.",
            url: siteUrl,
            logo: `${siteUrl}/favicon.ico`,
          })}
        </Script>
        <Script id="ld-website" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "The Nineties Times",
            alternateName: ["90sTimes", "90stimes", "90s Times", "Nineties Times"],
            description: "A 90s nostalgia destination for stories, quizzes, arcade throwbacks, and memory-lane archives.",
            url: siteUrl,
            potentialAction: {
              "@type": "SearchAction",
              target: `${siteUrl}/search?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          })}
        </Script>
        {/* Google Consent Mode v2: define gtag and default consent early */}
        <Script id="consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);} 
            gtag('consent', 'default', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
            gtag('consent', 'default', {
              region: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB'],
              ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
            });
          `}
        </Script>
        <meta name="google-adsense-account" content="ca-pub-2858608482723109" />
        {/* Preconnects to speed up third-party script fetches */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="preconnect" href="https://googleads.g.doubleclick.net" />
        <link rel="preconnect" href="https://api.binance.com" />
        <link rel="preconnect" href="https://stream.binance.com" />
        {/* Preconnect to our API origin to reduce request latency (PSI suggestion) */}
        <link rel="preconnect" href="https://server.90stimes.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//server.90stimes.com" />
      </head>
      <body>
        <PageVisitReporter />
        <AdSenseLoader />
        <GoogleAnalyticsLoader />
        <Header />
        <BreakingNewsBarClient />
        <main>{children}</main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};
