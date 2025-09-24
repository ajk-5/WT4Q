import type { Metadata } from "next";
import Script from "next/script";

import GlobalStyles from "./global-styles";
import Header from "@/components/Header";
import BreakingNewsBarClient from "@/components/BreakingNewsBarClient";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import PageVisitReporter from "@/components/PageVisitReporter";
import AdSenseLoader from "@/components/AdSenseLoader";
import SwgLoader from "@/components/SwgLoader";
import GoogleAnalyticsLoader from "@/components/GoogleAnalyticsLoader";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.90stimes.com";

export const metadata: Metadata = {
  applicationName: "The Nineties Times (90sTimes)",
  title: {
    default: "The Nineties Times",
    template: "%s | The Nineties Times",
  },
  description:
    "The Nineties Times (90sTimes) delivers real-time breaking news, in-depth analysis, and trusted reporting across politics, business, tech, culture, sports, and more.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "The Nineties Times",
    description:
      "Real-time breaking news, trends, and stories from The Nineties Times (90sTimes).",
    url: siteUrl,
    siteName: "The Nineties Times",
    type: "website",
  },
  keywords: [
    "The Nineties Times",
    "90sTimes",
    "90stimes",
    "90s Times",
    "Nineties Times",
    "independent media",
    "news website",
  ],
  twitter: {
    card: "summary_large_image",
    title: "The Nineties Times",
    description:
      "Real-time breaking news and trusted reporting - The Nineties Times (90sTimes).",
  },
  alternates: {
    canonical: "/",
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
    <html lang="en">
      <head>
        <GlobalStyles />
        {/* Preload brand font for faster masthead and centerpiece overlays */}
        <link
          rel="preload"
          as="font"
          href="/fonts/CloisterBlack.woff2"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Removed eager preload of decorative paper background to improve LCP */}
        {/* Structured data for brand synonyms */}
        <Script id="ld-org" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsMediaOrganization",
            name: "The Nineties Times",
            alternateName: ["90sTimes", "90stimes", "90s Times", "Nineties Times"],
            description: "Real-time global news coverage, analysis, and reporting from The Nineties Times.",
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
            description: "Real-time news destination for breaking updates, context, and archive search.",
            url: siteUrl,
            potentialAction: {
              "@type": "SearchAction",
              target: `${siteUrl}/search?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          })}
        </Script>
        {/* Lazy-apply decorative paper texture after page is interactive */}
        <Script id="paper-bg" strategy="lazyOnload">
          {`
            try {
              var docEl = document.documentElement;
              // Avoid setting when user prefers reduced data
              var reduce = false;
              try { reduce = window.matchMedia('(prefers-reduced-data: reduce)').matches; } catch {}
              if (!reduce) {
                docEl.style.setProperty(
                  '--paper-bg',
                  "radial-gradient(1px 1px at 30% 40%, rgba(0,0,0,.03), transparent 2px), radial-gradient(1px 1px at 70% 60%, rgba(0,0,0,.02), transparent 2px)"
                );
              }
            } catch (e) { /* no-op */ }
          `}
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
        <link rel="preconnect" href="https://news.google.com" />
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
        <SwgLoader />
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
