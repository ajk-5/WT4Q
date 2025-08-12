/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { loadFabric } from '../utils/fabricLoader';
import styles from '../styles/editor.module.css';

const CanvasStage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const setFabric = useEditorStore(s => s.setFabric);
  const setCanvas = useEditorStore(s => s.setCanvas);
  const fabricRef = useRef<any>(null);

  useEffect(() => {
    let dispose = () => {};
    (async () => {
      const fabric = await loadFabric();
      fabricRef.current = fabric;
      setFabric(fabric);

      const el = document.createElement('canvas');
      el.width = 1200;
      el.height = 800;
      el.setAttribute('id', 'main-canvas');
      containerRef.current?.appendChild(el);

      const canvas = new fabric.Canvas(el, {
        preserveObjectStacking: true,
        selection: true,
      });

      setCanvas(canvas);

      const onResize = () => {
        const wrap = containerRef.current;
        if (!wrap) return;
        const ratio = canvas.getWidth()! / canvas.getHeight()!;
        let w = wrap.clientWidth;
        let h = wrap.clientHeight;
        if (w / h > ratio) w = h * ratio;
        else h = w / ratio;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
      };
      window.addEventListener('resize', onResize);
      onResize();

      dispose = () => {
        window.removeEventListener('resize', onResize);
        canvas.dispose();
        el.remove();
      };
    })().catch(err => {
      console.error('Failed to init Fabric', err);
      alert(`Failed to initialize editor: ${String(err)}`);
    });

    return () => dispose();
  }, [setFabric, setCanvas]);

  return <div className={styles.stage} ref={containerRef} />;
};

export default CanvasStage;
