/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React from 'react';
import { useEditorStore } from '../store/editorStore';
import panel from '../styles/panel.module.css';

const AdjustmentsPanel: React.FC = () => {
  const { fabric, canvas } = useEditorStore();
  const [brightness, setBrightness] = React.useState(0);
  const [contrast, setContrast] = React.useState(0);
  const [saturation, setSaturation] = React.useState(0);

  const apply = () => {
    if (!fabric || !canvas) return;
    const obj = canvas.getActiveObject() as any;
    if (!obj || obj.type !== 'image') return;
    obj.filters = [];
    if (brightness !== 0)
      obj.filters.push(new fabric.Image.filters.Brightness({ brightness }));
    if (contrast !== 0)
      obj.filters.push(new fabric.Image.filters.Contrast({ contrast }));
    if (saturation !== 0)
      obj.filters.push(new fabric.Image.filters.Saturation({ saturation }));
    obj.applyFilters();
    canvas.requestRenderAll();
  };

  return (
    <div className={panel.block}>
      <div className={panel.blockTitle}>Adjustments</div>
      <label className={panel.label}>
        Brightness
        <input
          type="range"
          min="-1"
          max="1"
          step="0.05"
          value={brightness}
          onChange={e => setBrightness(parseFloat(e.target.value))}
          onMouseUp={apply}
        />
      </label>
      <label className={panel.label}>
        Contrast
        <input
          type="range"
          min="-1"
          max="1"
          step="0.05"
          value={contrast}
          onChange={e => setContrast(parseFloat(e.target.value))}
          onMouseUp={apply}
        />
      </label>
      <label className={panel.label}>
        Saturation
        <input
          type="range"
          min="-1"
          max="1"
          step="0.05"
          value={saturation}
          onChange={e => setSaturation(parseFloat(e.target.value))}
          onMouseUp={apply}
        />
      </label>
      <button className={panel.btn} onClick={apply}>
        Apply
      </button>
    </div>
  );
};

export default AdjustmentsPanel;
