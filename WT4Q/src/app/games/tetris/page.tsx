import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const TetrisGame = dynamic(() => import('./TetrisGame'), { ssr: false });

export const metadata: Metadata = {
  title: 'Tetris',
  description: 'Play Tetris with photorealistic themes',
};

export default function TetrisPage() {
  return <TetrisGame />;
}
