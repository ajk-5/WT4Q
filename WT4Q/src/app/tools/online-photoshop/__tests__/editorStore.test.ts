import { describe, it, expect } from 'vitest';
import { useEditorStore } from '../store/editorStore';

describe('editor store history', () => {
  it('initial state', () => {
    const s = useEditorStore.getState();
    expect(s.history.length).toBe(0);
    expect(s.future.length).toBe(0);
  });

  it('tasks lifecycle', () => {
    const s = useEditorStore.getState();
    const id = s.beginTask('Test');
    s.updateTask(id, 55);
    s.endTask(id);
    expect(useEditorStore.getState().tasks.length).toBe(0);
  });
});
