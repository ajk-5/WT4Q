import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('fabric', () => ({
  fabric: { Canvas: function() {}, Image: { fromURL: () => {} } },
}));
vi.mock('../components/CanvasStage', () => ({
  default: () => <div />,
}));

import EditorShell from '../components/EditorShell';

describe('UI smoke', () => {
  it('renders EditorShell without crashing', () => {
    const { getByText } = render(<EditorShell />);
    expect(getByText('Web Editor')).toBeTruthy();
  });
});
