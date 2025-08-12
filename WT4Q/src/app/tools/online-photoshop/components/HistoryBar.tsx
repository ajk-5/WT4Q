'use client';
import React from 'react';
import { useEditorStore } from '../store/editorStore';
import panel from '../styles/panel.module.css';
import { Undo2, Redo2 } from 'lucide-react';

const HistoryBar: React.FC = () => {
  const { undo, redo, canUndo, canRedo } = useEditorStore();
  return (
    <div className={panel.row}>
      <button className={panel.btn} disabled={!canUndo()} onClick={undo} title="Undo"><Undo2 size={16}/></button>
      <button className={panel.btn} disabled={!canRedo()} onClick={redo} title="Redo"><Redo2 size={16}/></button>
    </div>
  );
};
export default HistoryBar;
