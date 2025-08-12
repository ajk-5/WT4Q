'use client';
import React from 'react';
import CanvasStage from './CanvasStage';
import Toolbar from './Toolbar';
import LayersPanel from './LayersPanel';
import AdjustmentsPanel from './AdjustmentsPanel';
import HistoryBar from './HistoryBar';
import ProgressCenter from './ProgressCenter';
import styles from '../styles/editor.module.css';

const EditorShell: React.FC = () => {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>Web Editor</h1>
        <HistoryBar />
      </header>

      <div className={styles.main}>
        <aside className={styles.sidebarLeft}>
          <Toolbar />
          <AdjustmentsPanel />
        </aside>

        <section className={styles.stageWrap}>
          <CanvasStage />
        </section>

        <aside className={styles.sidebarRight}>
          <LayersPanel />
        </aside>
      </div>

      <ProgressCenter />
    </div>
  );
};

export default EditorShell;
