/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React from 'react';
import { useEditorStore } from '../store/editorStore';
import panel from '../styles/panel.module.css';

const LayersPanel: React.FC = () => {
  const { canvas } = useEditorStore();
  const [, setVersion] = React.useState(0);

  React.useEffect(() => {
    if (!canvas) return;
    const rerender = () => setVersion(v => v + 1);
    canvas.on('object:added', rerender);
    canvas.on('object:removed', rerender);
    canvas.on('object:modified', rerender);
    return () => {
      canvas.off('object:added', rerender);
      canvas.off('object:removed', rerender);
      canvas.off('object:modified', rerender);
    };
  }, [canvas]);

  if (!canvas)
    return (
      <div className={panel.block}>
        <div className={panel.blockTitle}>Layers</div>
        <div className={panel.muted}>Canvas not ready</div>
      </div>
    );
  const objects = canvas.getObjects().slice().reverse();

  return (
    <div className={panel.block}>
      <div className={panel.blockTitle}>Layers</div>
      <div className={panel.scroll}>
        {objects.map((obj, idx) => {
          const name = (obj as any).name || obj.type || `Layer ${idx + 1}`;
          const visible = obj.visible;
          const locked = obj.selectable === false;
          return (
            <div
              key={idx}
              className={panel.layerRow}
              onClick={() => {
                canvas.setActiveObject(obj);
                canvas.requestRenderAll();
              }}
            >
              <span>{name}</span>
              <div className={panel.layerActions}>
                <button
                  className={panel.small}
                  onClick={e => {
                    e.stopPropagation();
                    obj.visible = !visible;
                    canvas.requestRenderAll();
                    setVersion(v => v + 1);
                  }}
                >
                  {visible ? '🙈' : '👁️'}
                </button>
                <button
                  className={panel.small}
                  onClick={e => {
                    e.stopPropagation();
                    obj.selectable = locked;
                    canvas.requestRenderAll();
                    setVersion(v => v + 1);
                  }}
                >
                  {locked ? '🔓' : '🔒'}
                </button>
                <button
                  className={panel.small}
                  onClick={e => {
                    e.stopPropagation();
                    canvas.remove(obj);
                    canvas.requestRenderAll();
                    setVersion(v => v + 1);
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LayersPanel;
