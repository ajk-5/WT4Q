import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.wt4q.com';
  const content = `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml`;
  return new NextResponse(content, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
