'use client';
import React, { useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import {
  Brush,
  MousePointer2,
  Type,
  Square,
  Circle,
  Crop,
  Image as ImageIcon,
  Save,
  FilePlus2,
} from 'lucide-react';
import { openImageWithProgress } from '../utils/fileOps';
import { triggerDownload } from '../utils/download';
import panel from '../styles/panel.module.css';

const Toolbar: React.FC = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const {
    fabric,
    canvas,
    setTool,
    addRect,
    addCircle,
    addText,
    exportPNG,
    beginTask,
    updateTask,
    endTask,
  } = useEditorStore();

  const onUploadClick = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!fabric || !canvas) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const taskId = beginTask('Uploading image...');
    try {
      const img = await openImageWithProgress(
        file,
        progress => updateTask(taskId, progress),
        fabric
      );
      img.set({ left: 50, top: 50 });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    } catch (err) {
      alert(`Upload failed: ${String(err)}`);
    } finally {
      endTask(taskId);
      e.target.value = '';
    }
  };

  const onSave = async () => {
    if (!canvas) return;
    const taskId = beginTask('Exporting PNG...');
    try {
      updateTask(taskId, 30);
      const dataUrl = await exportPNG();
      updateTask(taskId, 90);
      triggerDownload(dataUrl, 'image.png');
    } finally {
      endTask(taskId);
    }
  };

  return (
    <div className={panel.block}>
      <div className={panel.blockTitle}>Tools</div>
      <div className={panel.row}>
        <button className={panel.btn} onClick={() => setTool('move')} title="Move"><MousePointer2 size={16}/></button>
        <button className={panel.btn} onClick={() => setTool('brush')} title="Brush"><Brush size={16}/></button>
        <button className={panel.btn} onClick={() => addText('Text')} title="Text"><Type size={16}/></button>
        <button className={panel.btn} onClick={() => addRect()} title="Rectangle"><Square size={16}/></button>
        <button className={panel.btn} onClick={() => addCircle()} title="Circle"><Circle size={16}/></button>
        <button className={panel.btn} onClick={() => setTool('crop')} title="Crop (basic)"><Crop size={16}/></button>
      </div>

      <div className={panel.blockTitle}>File</div>
      <div className={panel.row}>
        <button className={panel.btn} onClick={onUploadClick} title="Upload"><ImageIcon size={16}/></button>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange}/>
        <button className={panel.btn} onClick={() => useEditorStore.getState().newDocument()} title="New"><FilePlus2 size={16}/></button>
        <button className={panel.btn} onClick={onSave} title="Export PNG"><Save size={16}/></button>
      </div>
    </div>
  );
};

export default Toolbar;
