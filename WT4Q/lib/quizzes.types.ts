import type { ShowKind } from './shows.types';

export type QuizType = 'trivia' | 'who-said-it' | 'finish-the-line';

export type QuizQuestion = {
  id: string;
  prompt: string;
  imageUrl?: string;
  choices?: string[];
  answer: string;
  explanation?: string;
  // optional scoring and difficulty metadata
  points?: number; // default 1
  difficulty?: 'easy' | 'medium' | 'hard';
};

export type Quiz = {
  slug: string;
  title: string;
  description?: string;
  category?: string;
  type: QuizType;
  createdAt: string;
  updatedAt?: string;
  author?: string;
  imageUrl?: string;
  show?: { slug: string; title: string; kind: ShowKind; imageUrl?: string } | null;
  questions: QuizQuestion[];
  // publishing and behavior options
  status?: 'draft' | 'published';
  publishedAt?: string;
  tags?: string[];
  randomize?: boolean; // shuffle questions client-side
  timeLimitSec?: number; // optional total time limit for the quiz
  showExplanations?: boolean; // default true
};
