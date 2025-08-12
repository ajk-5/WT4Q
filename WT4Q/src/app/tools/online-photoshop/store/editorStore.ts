/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';

type Tool = 'move' | 'brush' | 'crop';

type Task = { id: string; label: string; progress: number };

type EditorState = {
  fabric: any | null;
  canvas: any | null;
  tool: Tool;
  history: string[];
  future: string[];
  tasks: Task[];

  setFabric: (f: any) => void;
  setCanvas: (c: any) => void;
  setTool: (t: Tool) => void;

  snapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  addRect: () => void;
  addCircle: () => void;
  addText: (text: string) => void;
  newDocument: () => void;

  exportPNG: () => Promise<string>;

  beginTask: (label: string) => string;
  updateTask: (id: string, progress: number) => void;
  endTask: (id: string) => void;
};

export const useEditorStore = create<EditorState>((set, get) => ({
  fabric: null,
  canvas: null,
  tool: 'move',
  history: [],
  future: [],
  tasks: [],

  setFabric: f => set({ fabric: f }),
  setCanvas: c => {
    c.on('object:added', () => get().snapshot());
    c.on('object:modified', () => get().snapshot());
    c.on('object:removed', () => get().snapshot());
    set({ canvas: c });
  },
  setTool: t => {
    const { canvas, fabric } = get();
    if (canvas && fabric) {
      if (t === 'brush') canvas.isDrawingMode = true;
      else canvas.isDrawingMode = false;
    }
    set({ tool: t });
  },

  snapshot: () => {
    const { canvas } = get();
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON(['name']));
    set(state => ({ history: [...state.history, json], future: [] }));
  },

  undo: () => {
    const { history, canvas, fabric } = get();
    if (!canvas || !fabric || history.length < 2) return;
    const prev = history[history.length - 2];
    set(state => ({
      history: state.history.slice(0, -1),
      future: [state.history[state.history.length - 1], ...state.future],
    }));
    canvas.loadFromJSON(prev, () => canvas.requestRenderAll());
  },

  redo: () => {
    const { future, canvas } = get();
    if (!canvas || future.length === 0) return;
    const next = future[0];
    set(state => ({ future: state.future.slice(1), history: [...state.history, next] }));
    canvas.loadFromJSON(next, () => canvas.requestRenderAll());
  },

  canUndo: () => get().history.length > 1,
  canRedo: () => get().future.length > 0,

  addRect: () => {
    const { fabric, canvas } = get();
    if (!fabric || !canvas) return;
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: '#4e9',
      width: 160,
      height: 100,
      name: 'Rectangle',
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.requestRenderAll();
  },

  addCircle: () => {
    const { fabric, canvas } = get();
    if (!fabric || !canvas) return;
    const circle = new fabric.Circle({
      left: 200,
      top: 180,
      radius: 60,
      fill: '#39f',
      name: 'Circle',
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.requestRenderAll();
  },

  addText: text => {
    const { fabric, canvas } = get();
    if (!fabric || !canvas) return;
    const obj = new fabric.Textbox(text, {
      left: 120,
      top: 60,
      fontSize: 28,
      fill: '#111',
      name: 'Text',
    });
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
  },

  newDocument: () => {
    const { canvas } = get();
    if (!canvas) return;
    canvas.clear();
    set({ history: [], future: [] });
  },

  exportPNG: async () => {
    const { canvas } = get();
    if (!canvas) throw new Error('Canvas not ready');
    const dataUrl: string = await new Promise(resolve => {
      canvas.getElement().toBlob((blob: Blob | null) => {
        if (!blob) {
          resolve(canvas.toDataURL({ format: 'png', quality: 1 }));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
    });
    return dataUrl;
  },

  beginTask: label => {
    const id = crypto.randomUUID();
    set(state => ({ tasks: [...state.tasks, { id, label, progress: 0 }] }));
    return id;
  },
  updateTask: (id, progress) => {
    set(state => ({ tasks: state.tasks.map(t => (t.id === id ? { ...t, progress } : t)) }));
  },
  endTask: id => {
    set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));
  },
}));
