import type { Metadata } from 'next';
import CryptoDetailShell from '@/components/CryptoDetailShell';

export const dynamic = 'force-dynamic';

type RouteParams = {
  symbol?: string | string[];
};

type RouteProps = {
  params?: Promise<RouteParams>;
};

function normalizeSymbol(symbol?: string | string[]) {
  const value = Array.isArray(symbol) ? symbol[0] : symbol;
  return (value ?? '').toUpperCase();
}

async function resolveParams(params: RouteProps['params']) {
  return params ? await params : undefined;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const resolved = await resolveParams(params);
  const sym = normalizeSymbol(resolved?.symbol);

  return {
    title: `${sym} price, chart & news`,
    description: `Live ${sym} price chart and latest news.`,
    alternates: { canonical: `/crypto/${sym}` },
  };
}

export default async function Page({ params }: RouteProps) {
  const resolved = await resolveParams(params);
  const sym = normalizeSymbol(resolved?.symbol);

  return <CryptoDetailShell symbol={sym} />;
}
