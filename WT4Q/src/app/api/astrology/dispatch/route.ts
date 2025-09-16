import { NextRequest, NextResponse } from 'next/server';
import { API_ROUTES } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function authorize(request: NextRequest): string | null {
  const expected = process.env.ASTROLOGY_DISPATCH_TOKEN;
  if (!expected) {
    return request.headers.get('authorization') ?? null;
  }
  const header = request.headers.get('authorization');
  if (!header) {
    return null;
  }
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return token === expected ? header : null;
}

function forwardHeaders(source: Headers): Headers {
  const headers = new Headers();
  const contentType = source.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  headers.set('cache-control', 'no-store');
  return headers;
}

export async function POST(request: NextRequest) {
  const authHeader = authorize(request);
  if (process.env.ASTROLOGY_DISPATCH_TOKEN && !authHeader) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const response = await fetch(API_ROUTES.ASTROLOGY.DISPATCH, {
    method: 'POST',
    headers: authHeader ? { authorization: authHeader } : undefined,
    cache: 'no-store',
  });
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: forwardHeaders(response.headers),
  });
}
