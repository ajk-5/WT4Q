import { NextRequest, NextResponse } from 'next/server';
import { API_ROUTES } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function forwardHeaders(source: Headers): Headers {
  const headers = new Headers();
  const contentType = source.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  headers.set('cache-control', 'no-store');
  return headers;
}

async function forward(request: NextRequest, init: RequestInit): Promise<NextResponse> {
  const cookie = request.headers.get('cookie') ?? '';
  const response = await fetch(API_ROUTES.ASTROLOGY.SUBSCRIPTION, {
    ...init,
    headers: {
      ...(init.headers || {}),
      cookie,
    },
    cache: 'no-store',
  });

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: forwardHeaders(response.headers),
  });
}

export async function GET(request: NextRequest) {
  return forward(request, { method: 'GET' });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return forward(request, {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json' },
  });
}

export async function DELETE(request: NextRequest) {
  return forward(request, { method: 'DELETE' });
}
