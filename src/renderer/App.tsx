import React, { useState, useCallback, useEffect, useRef } from 'react';
import { bridge } from './bridge.js';
import { usePreviews } from './hooks/usePreviews.js';
import PreviewTable from './components/PreviewTable.js';
import ShowNameEditor from './components/ShowNameEditor.js';
import UndoBar from './components/UndoBar.js';
import DropZone from './components/DropZone.js';
import ManualModePanel from './components/ManualModePanel.js';
import type { ManualModeConfig, RowOverride, ScannedFile, RenameOperation } from '../shared/types.js';

type AppStatus =
  | { type: 'idle' }
  | { type: 'renaming' }
  | { type: 'undoing' }
  | { type: 'checking-updates' }
  | { type: 'error'; message: string };

export default function App() {
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [overrideName, setOverrideName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [undoCount, setUndoCount] = useState(0);
  const [status, setStatus] = useState<AppStatus>({ type: 'idle' });
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualConfig, setManualConfig] = useState<ManualModeConfig | null>(null);
  const [rowOverrides, setRowOverrides] = useState<Map<string, RowOverride>>(new Map());

  const loadRequestIdRef = useRef(0);

  const rows = usePreviews(files, overrideName, manualMode, manualConfig, rowOverrides);
  const detectedName = rows.find(r => r.parsed)?.proposedName?.split(' - ')[0] ?? '';

  const isRenaming = status.type === 'renaming';
  const isUndoing = status.type === 'undoing';
  const isCheckingUpdates = status.type === 'checking-updates';
  const isBusy = isRenaming || isUndoing || isCheckingUpdates;
  const selectedCount = selected.size;

  let parsedCount = 0, overriddenCount = 0, lowConfCount = 0;
  for (const r of rows) {
    if (r.parsed) parsedCount++;
    if (r.overridden) overriddenCount++;
    if (r.parsed && r.confidence === 'low') lowConfCount++;
  }

  useEffect(() => {
    if (folderPath) {
      const folderName = folderPath.split(/[\\/]/).pop() ?? folderPath;
      bridge.setTitle(`Slate — ${folderName}`);
    } else {
      bridge.setTitle('Slate');
    }
  }, [folderPath]);

  async function checkForUndo(folder: string) {
    const result = await bridge.checkUndo(folder);
    setUndoCount(result.exists ? result.count : 0);
  }

  const loadFolder = useCallback(async (picked: string) => {
    const requestId = ++loadRequestIdRef.current;

    setFolderPath(picked);
    setOverrideName('');
    setSelected(new Set());
    setStatus({ type: 'idle' });
    setManualMode(false);
    setManualConfig(null);
    setRowOverrides(new Map());
    setLoading(true);

    try {
      const [scanned] = await Promise.all([
        bridge.scanFolder(picked),
        checkForUndo(picked),
      ]);

      if (requestId !== loadRequestIdRef.current) return; // stale request
      setFiles(scanned);
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const handleRename = useCallback(async () => {
    if (!folderPath || selected.size === 0) return;

    const operations: RenameOperation[] = rows
      .filter(r => r.parsed && r.proposedName && selected.has(r.file.path))
      .map(r => ({
        from: r.file.path,
        to: r.file.path.replace(r.file.name, r.proposedName!),
      }));

    if (operations.length === 0) return;
    setStatus({ type: 'renaming' });

    try {
      const result = await bridge.renameFiles(folderPath, operations);
      if (result.failed) {
        setStatus({
          type: 'error',
          message: `Stopped at "${result.failed.op.from.split(/[\\/]/).pop()}": ${result.failed.error}. ${result.succeeded.length} file(s) renamed and can be undone.`,
        });
      } else {
        setStatus({ type: 'idle' });
      }
      const scanned = await bridge.scanFolder(folderPath);
      setFiles(scanned);
      setSelected(new Set());
      await checkForUndo(folderPath);
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, [folderPath, selected, rows]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      // Skip shortcuts when focus is on any interactive element, not just
      // inputs — pressing Enter on a focused button would otherwise fire
      // both the button click and handleRename() simultaneously.
      if (target.closest('input, textarea, button, select, a, [contenteditable], [role="button"], [role="textbox"]')) return;
      if (isBusy || files.length === 0) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelected(new Set(rows.filter(r => r.parsed).map(r => r.file.path)));
        return;
      }

      if (e.key === 'Enter' && !e.repeat && selected.size > 0) {
        e.preventDefault();
        handleRename();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isBusy, files, rows, selected, handleRename]);

  async function handlePickFolder() {
    const picked = await bridge.pickFolder();
    if (!picked) return;
    await loadFolder(picked);
  }

  const handleFolderDropped = useCallback(async (droppedPath: string) => {
    await loadFolder(droppedPath);
  }, [loadFolder]);

  const handleToggle = useCallback((filePath: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(filePath) ? next.delete(filePath) : next.add(filePath);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelected(new Set(rows.filter(r => r.parsed).map(r => r.file.path)));
    } else {
      setSelected(new Set());
    }
  }, [rows]);

  const handleSetOverride = useCallback((filePath: string, override: RowOverride) => {
    setRowOverrides(prev => new Map(prev).set(filePath, override));
  }, []);

  const handleClearOverride = useCallback((filePath: string) => {
    setRowOverrides(prev => {
      const next = new Map(prev);
      next.delete(filePath);
      return next;
    });
  }, []);

  const handleSelectLowConfidence = useCallback(() => {
    setSelected(new Set(rows.filter(r => r.parsed && r.confidence === 'low').map(r => r.file.path)));
  }, [rows]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setFiles(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  async function handleUndo() {
    if (!folderPath) return;
    setStatus({ type: 'undoing' });
    try {
      await bridge.executeUndo(folderPath);
      setUndoCount(0);
      setStatus({ type: 'idle' });
      const scanned = await bridge.scanFolder(folderPath);
      setFiles(scanned);
      setSelected(new Set());
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  async function handleCheckForUpdates() {
    setStatus({ type: 'checking-updates' });
    setUpdateStatus('Checking for updates…');
    try {
      const result = await bridge.checkForUpdates();
      setUpdateStatus(result.message);
      if (result.status === 'error') {
        setStatus({ type: 'error', message: result.message });
      } else {
        setStatus({ type: 'idle' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setUpdateStatus(`Unable to check for updates: ${message}`);
      setStatus({ type: 'error', message: `Unable to check for updates: ${message}` });
    }
  }

  return (
    <DropZone onFolderDropped={handleFolderDropped} disabled={isBusy}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>Slate</span>
          {folderPath && (
            <span style={styles.folderChip}>
              {folderPath.split(/[\\/]/).pop()}
            </span>
          )}
        </div>
        <button className="btn-hover" style={styles.button} onClick={handlePickFolder} disabled={isBusy}>
          Browse Folder
        </button>
        {folderPath && (
          <button className="btn-hover" style={styles.button} onClick={() => loadFolder(folderPath)} disabled={isBusy}>
            Refresh
          </button>
        )}
        <button className="btn-hover" style={styles.button} onClick={handleCheckForUpdates} disabled={isBusy}>
          {isCheckingUpdates ? 'Checking…' : 'Check for Updates'}
        </button>
      </div>

      {updateStatus && (
        <div style={styles.updateBar}>
          <span>{updateStatus}</span>
        </div>
      )}

      {undoCount > 0 && folderPath && (
        <UndoBar count={undoCount} onUndo={handleUndo} undoing={isUndoing} />
      )}

      {status.type === 'error' && (
        <div style={styles.errorBar}>
          <span>⚠ {status.message}</span>
          <button
            className="btn-error-dismiss-hover"
            style={styles.errorDismiss}
            onClick={() => setStatus({ type: 'idle' })}
          >✕</button>
        </div>
      )}

      {files.length > 0 && !loading && !manualMode && (
        <ShowNameEditor value={overrideName} onChange={setOverrideName} detectedName={detectedName} />
      )}

      {files.length > 0 && !loading && (
        <div style={styles.manualModeBar}>
          <label style={styles.manualModeToggle}>
            <input
              type="checkbox"
              checked={manualMode}
              onChange={e => {
                const enabled = e.target.checked;
                setManualMode(enabled);
                setSelected(new Set());
                if (!enabled) {
                  setManualConfig(null);
                } else {
                  setManualConfig(prev => prev ?? {
                    showName: overrideName.trim() || detectedName || '',
                    season: 1,
                    startEpisode: 1,
                  });
                }
              }}
              style={{ accentColor: '#4a9e5c', marginRight: '7px' }}
            />
            Manual mode
          </label>
        </div>
      )}

      {files.length > 0 && !loading && manualMode && (
        <ManualModePanel config={manualConfig} onChange={setManualConfig} />
      )}

      {loading && (
        <div style={styles.centeredHint}>
          <span style={styles.hintIcon}>⏳</span>
          <span style={styles.hintText}>Scanning folder…</span>
        </div>
      )}

      {isRenaming && (
        <div style={styles.centeredHint}>
          <span style={styles.hintIcon}>✏️</span>
          <span style={styles.hintText}>Renaming files…</span>
        </div>
      )}

      {!loading && !isRenaming && files.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyTitle}>Drop a folder here</div>
          <div style={styles.emptySubtitle}>or use Browse Folder to get started</div>
        </div>
      )}

      {!loading && !isRenaming && files.length > 0 && rows.length === 0 && (
        <div style={styles.centeredHint}>
          <span style={styles.hintText}>No media files found in this folder.</span>
        </div>
      )}

      {!loading && !isRenaming && rows.length > 0 && (
        <PreviewTable
          rows={rows}
          selected={selected}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
          onSetOverride={handleSetOverride}
          onClearOverride={handleClearOverride}
          onReorder={handleReorder}
          manualMode={manualMode}
        />
      )}

      {!loading && !isRenaming && rows.length > 0 && (
        <div style={styles.footer}>
          <span style={styles.footerMeta}>
            {parsedCount} file{parsedCount !== 1 ? 's' : ''} recognised
            {overriddenCount > 0 ? ` · ${overriddenCount} edited` : ''}
            {rows.length !== parsedCount ? ` · ${rows.length - parsedCount} skipped` : ''}
          </span>
          <div style={styles.footerActions}>
            {lowConfCount > 0 && !manualMode && (
              <button
                className="btn-hover"
                style={styles.button}
                onClick={handleSelectLowConfidence}
                disabled={isBusy}
                title="Select all low confidence rows for review"
              >
                ⚠ Select low confidence ({lowConfCount})
              </button>
            )}
            <button
              className="btn-primary-hover"
              style={{ ...styles.renameButton, opacity: selectedCount === 0 || isBusy ? 0.4 : 1 }}
              onClick={handleRename}
              disabled={selectedCount === 0 || isBusy}
            >
              {isRenaming
                ? 'Renaming…'
                : selectedCount > 0
                  ? `Rename ${selectedCount} file${selectedCount !== 1 ? 's' : ''}`
                  : 'Select files to rename'
              }
            </button>
          </div>
        </div>
      )}
    </DropZone>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: '52px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  logo: { fontSize: '18px', lineHeight: 1 },
  title: { fontSize: '15px', fontWeight: 700, letterSpacing: '-0.3px', color: '#fff' },
  folderChip: { fontSize: '12px', color: '#444', background: '#181818', border: '1px solid #242424', borderRadius: '4px', padding: '2px 8px', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  button: { background: '#1e1e1e', color: '#ccc', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', transition: 'background 0.15s, border-color 0.15s' },
  errorBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 20px', background: '#1e1212', borderBottom: '1px solid #3a2020', fontSize: '13px', color: '#d07070', flexShrink: 0 },
  updateBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 20px', background: '#121820', borderBottom: '1px solid #202a3a', fontSize: '13px', color: '#8fb3ff', flexShrink: 0 },
  errorDismiss: { background: 'none', border: 'none', color: '#d07070', fontSize: '13px', padding: '2px 6px', borderRadius: '4px', transition: 'color 0.15s' },
  emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#333' },
  emptyIcon: { fontSize: '48px', marginBottom: '4px', filter: 'grayscale(1) opacity(0.3)' },
  emptyTitle: { fontSize: '16px', fontWeight: 600, color: '#3a3a3a' },
  emptySubtitle: { fontSize: '13px', color: '#2e2e2e' },
  centeredHint: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  hintIcon: { fontSize: '24px' },
  hintText: { fontSize: '13px', color: '#444' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px', borderTop: '1px solid #1a1a1a', flexShrink: 0 },
  footerMeta: { fontSize: '12px', color: '#3a3a3a' },
  footerActions: { display: 'flex', alignItems: 'center', gap: '8px' },
  renameButton: { background: '#1a3320', color: '#4a9e5c', border: '1px solid #253d2a', borderRadius: '6px', padding: '7px 18px', fontSize: '13px', fontWeight: 500, transition: 'background 0.15s, border-color 0.15s' },
  logoImg: { width: '22px', height: '22px', objectFit: 'contain' as const },
  emptyStateImg: { width: '56px', height: '56px', objectFit: 'contain' as const, opacity: 0.15, marginBottom: '4px' },
  manualModeBar: { display: 'flex', alignItems: 'center', padding: '7px 20px', borderBottom: '1px solid #1a1a1a', flexShrink: 0, background: '#0f0f0f' },
  manualModeToggle: { display: 'flex', alignItems: 'center', fontSize: '12.5px', color: '#666', cursor: 'pointer', userSelect: 'none' as const },
};