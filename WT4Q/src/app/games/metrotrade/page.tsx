import { Metadata } from 'next';
import MetroTradeGame from '@/components/metrotrade';


export const metadata: Metadata = {
  title: 'Metropolotan Trader',
  description: 'A strategy game set in the metro.',
};

export default function MetroTradePage() {
  return <MetroTradeGame />;
}
