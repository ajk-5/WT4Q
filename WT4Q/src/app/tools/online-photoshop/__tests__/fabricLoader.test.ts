import { describe, it, expect, vi } from 'vitest';

vi.mock('fabric', () => ({
  fabric: { Canvas: function() {}, Image: { fromURL: () => {} } },
}));

import { loadFabric } from '../utils/fabricLoader';

describe('fabricLoader', () => {
  it('resolves a fabric-like module', async () => {
    const f = await loadFabric();
    expect(typeof f.Canvas).toBe('function');
  });
});
