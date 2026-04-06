import React, { useState, useEffect, useCallback } from 'react';

interface Props {
  onFolderDropped: (folderPath: string) => void;
  disabled: boolean;
  children: React.ReactNode;
}

export default function DropZone({ onFolderDropped, disabled, children }: Props) {
  const [dragging, setDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setDragCounter(c => c + 1);
    setDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(c => {
      const next = Math.max(0, c - 1);
      if (next <= 0) setDragging(false);
      return next;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    setDragCounter(0);
    if (disabled) return;

    // Get the File object from the drop event
    const file = e.dataTransfer?.files?.[0] ?? e.dataTransfer?.items?.[0]?.getAsFile();
    if (!file) return;

    // webUtils.getPathForFile must be called while the File is still a live
    // reference — it is exposed via the preload and called here synchronously
    try {
      const path = window.electronAPI.getPathForFile(file);
      if (path && path.trim()) {
        onFolderDropped(path.trim());
      }
    } catch (err) {
      console.error('[drop] getPathForFile failed:', err);
    }
  }, [disabled, onFolderDropped]);

  useEffect(() => {
    const el = document.body;
    el.addEventListener('dragenter', handleDragEnter);
    el.addEventListener('dragleave', handleDragLeave);
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('drop', handleDrop);
    return () => {
      el.removeEventListener('dragenter', handleDragEnter);
      el.removeEventListener('dragleave', handleDragLeave);
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {children}
      {dragging && !disabled && (
        <div style={styles.overlay}>
          <div style={styles.overlayBox}>
            <div style={styles.overlayIcon}>📂</div>
            <div style={styles.overlayText}>Drop folder to scan</div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(15, 15, 15, 0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    pointerEvents: 'none',
  },
  overlayBox: {
    border: '2px dashed #2a5c36',
    borderRadius: '12px',
    padding: '48px 64px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    background: '#0f1f14',
  },
  overlayIcon: {
    fontSize: '40px',
  },
  overlayText: {
    fontSize: '16px',
    color: '#4a9e5c',
    fontWeight: 600,
    letterSpacing: '-0.2px',
  },
};