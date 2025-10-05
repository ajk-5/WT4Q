import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.90stimes.com';

  // Only valid robots.txt directives below. Do NOT include non-standard lines
  // like "Content-signal" here — those belong in HTTP headers if used.
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    // Reflect "ai-train=no" intent by disallowing common AI training/user agents.
    // These are safe, valid robots directives and won’t break search indexing.
    'User-agent: GPTBot',
    'Disallow: /',
    'User-agent: CCBot',
    'Disallow: /',
    'User-agent: ChatGPT-User',
    'Disallow: /',
    'User-agent: anthropic-ai',
    'Disallow: /',
    'User-agent: ClaudeBot',
    'Disallow: /',
    'User-agent: PerplexityBot',
    'Disallow: /',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    `Sitemap: ${siteUrl}/news-sitemap.xml`,
    `Sitemap: ${siteUrl}/newssitemap.xml`,
    `Sitemap: ${siteUrl}/crypto/sitemap.xml`,
  ];

  const content = lines.join('\n') + '\n';

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // If you want to advertise AI preferences, prefer headers like X-Robots-Tag
      // on HTML pages rather than non-standard lines in robots.txt.
    },
  });
}
