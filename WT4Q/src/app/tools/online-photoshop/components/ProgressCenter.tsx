'use client';
import React from 'react';
import ProgressBar from './ProgressBar';
import { useEditorStore } from '../store/editorStore';
import styles from '../styles/editor.module.css';

const ProgressCenter: React.FC = () => {
  const tasks = useEditorStore(s => s.tasks);
  if (tasks.length === 0) return null;
  return (
    <div className={styles.progressCenter}>
      {tasks.map(t => <ProgressBar key={t.id} value={t.progress} label={t.label} />)}
    </div>
  );
};
export default ProgressCenter;
