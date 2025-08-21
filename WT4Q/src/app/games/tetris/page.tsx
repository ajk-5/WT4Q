import { Metadata } from 'next';
import TetrisGame from './TetrisGame';

export const metadata: Metadata = {
  title: 'Tetris',
  description: 'Play Tetris with photorealistic themes',
};

export default function TetrisPage() {
  return <TetrisGame />;
}
