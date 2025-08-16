import { describe, it, expect } from 'vitest';
import { truncateWords } from './text';

describe('truncateWords', () => {
  it('truncates text to the specified number of words', () => {
    const text = 'one two three four five';
    expect(truncateWords(text, 3)).toBe('one two three...');
  });

  it('returns an empty string when input is undefined', () => {
    expect(truncateWords(undefined, 3)).toBe('');
  });
});
