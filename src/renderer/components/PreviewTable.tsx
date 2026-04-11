import React, { useState, useEffect, useRef } from 'react';
import type { PreviewRow } from '../hooks/usePreviews.js';
import type { RowOverride } from '../../shared/types.js';

interface Props {
  rows: PreviewRow[];
  selected: Set<string>;
  onToggle: (filePath: string) => void;
  onToggleAll: (checked: boolean) => void;
  onSetOverride: (filePath: string, override: RowOverride) => void;
  onClearOverride: (filePath: string) => void;
}

function TableRow({
  row,
  isSelected,
  onToggle,
  onSetOverride,
  onClearOverride,
}: {
  row: PreviewRow;
  isSelected: boolean;
  onToggle: () => void;
  onSetOverride: (override: RowOverride) => void;
  onClearOverride: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editShow, setEditShow] = useState('');
  const [editEp, setEditEp] = useState('');
  const showRef = useRef<HTMLInputElement>(null);

  const isLowConfidence = row.parsed && row.confidence === 'low';

  function openEditor() {
    if (!row.parsed || !row.proposedName) return;
    const match = row.proposedName.match(/^(.+?) - S\d+E(\d+)/);
    if (match) {
      setEditShow(match[1]);
      setEditEp(String(parseInt(match[2], 10)));
    } else {
      setEditShow('');
      setEditEp('');
    }
    setEditing(true);
  }

  useEffect(() => {
    if (editing) showRef.current?.focus();
  }, [editing]);

  function commitEdit() {
    const ep = parseInt(editEp, 10);
    if (editShow.trim() && !isNaN(ep) && ep > 0) {
      onSetOverride({ showName: editShow.trim(), episode: ep });
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(false);
  }

  const rowBackground = () => {
    if (!row.parsed) return 'transparent';
    if (editing) return '#141a14';
    if (isLowConfidence) return hovered ? '#1f1a0e' : '#181408';
    return hovered ? '#161616' : 'transparent';
  };

  return (
    <tr
      style={{
        borderBottom: '1px solid #141414',
        background: rowBackground(),
        opacity: row.parsed ? 1 : 0.35,
        transition: 'background 0.1s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={styles.tdCheck}>
        {row.parsed && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            style={styles.checkbox}
          />
        )}
      </td>
      <td style={{ ...styles.td, ...styles.originalName }}>
        <span title={row.file.name}>{row.file.name}</span>
      </td>
      <td style={{ ...styles.td, ...styles.arrow }}>→</td>
      <td style={{ ...styles.td, ...styles.proposedCell }}>
        {!row.parsed ? (
          <span style={styles.unparsed}>Could not parse</span>
        ) : editing ? (
          <span style={styles.editRow}>
            <input
              ref={showRef}
              style={styles.editInput}
              value={editShow}
              onChange={e => setEditShow(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitEdit}
              placeholder="Show name"
              spellCheck={false}
            />
            <span style={styles.editSep}>E</span>
            <input
              style={{ ...styles.editInput, ...styles.editEpInput }}
              value={editEp}
              onChange={e => setEditEp(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitEdit}
              placeholder="Ep"
              type="number"
              min={1}
            />
            <button
              style={styles.clearBtn}
              title="Revert to parser result"
              onMouseDown={e => { e.preventDefault(); onClearOverride(); setEditing(false); }}
            >×</button>
          </span>
        ) : (
          <span
            style={styles.proposedClickable}
            title="Click to edit"
            onClick={openEditor}
          >
            <span
              style={{ color: isLowConfidence ? '#c8a84b' : row.overridden ? '#8fb3ff' : '#b8dbbe' }}
            >
              {row.proposedName}
            </span>
            {isLowConfidence && (
              <span style={styles.lowConfidenceBadge}>⚠ low confidence</span>
            )}
            {row.overridden && (
              <span
                style={styles.overriddenBadge}
                onClick={e => { e.stopPropagation(); onClearOverride(); }}
              >
                ✎ edited ×
              </span>
            )}
            {!isLowConfidence && !row.overridden && hovered && (
              <span style={styles.editHint}>✎</span>
            )}
          </span>
        )}
      </td>
    </tr>
  );
}

export default function PreviewTable({
  rows, selected, onToggle, onToggleAll, onSetOverride, onClearOverride,
}: Props) {
  const parsedRows   = rows.filter(r => r.parsed);
  const allSelected  = parsedRows.length > 0 && parsedRows.every(r => selected.has(r.file.path));
  const someSelected = parsedRows.some(r => selected.has(r.file.path));

  if (rows.length === 0) return null;

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <colgroup>
          <col style={{ width: '36px' }} />
          <col style={{ width: '45%' }} />
          <col style={{ width: '28px' }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th style={styles.th}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = !allSelected && someSelected; }}
                onChange={e => onToggleAll(e.target.checked)}
                style={styles.checkbox}
              />
            </th>
            <th style={styles.th}>Original</th>
            <th style={styles.th} />
            <th style={{ ...styles.th, color: '#4a9e5c' }}>Proposed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <TableRow
              key={row.file.path}
              row={row}
              isSelected={selected.has(row.file.path)}
              onToggle={() => onToggle(row.file.path)}
              onSetOverride={override => onSetOverride(row.file.path, override)}
              onClearOverride={() => onClearOverride(row.file.path)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { flex: 1, overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', tableLayout: 'fixed' },
  th: {
    padding: '8px 12px',
    textAlign: 'left',
    fontSize: '10.5px',
    fontWeight: 600,
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid #1a1a1a',
    background: '#0f0f0f',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  tdCheck: { padding: '7px 12px', verticalAlign: 'middle', width: '36px' },
  td: { padding: '7px 12px', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  proposedCell: { overflow: 'hidden' },
  checkbox: { accentColor: '#4a9e5c', width: '13px', height: '13px', cursor: 'pointer', display: 'block' },
  originalName: { color: '#666', fontFamily: 'monospace', fontSize: '12px' },
  arrow: { color: '#2a2a2a', fontSize: '12px', textAlign: 'center', padding: '7px 0', width: '28px' },
  proposedClickable: {
    display: 'flex', alignItems: 'center', gap: '6px',
    cursor: 'text', fontFamily: 'monospace', fontSize: '12px', overflow: 'hidden',
  },
  lowConfidenceBadge: {
    fontSize: '10px', color: '#8a6a1a', background: '#2a2008',
    border: '1px solid #3d3010', borderRadius: '3px', padding: '1px 5px',
    whiteSpace: 'nowrap', flexShrink: 0, cursor: 'default',
  },
  overriddenBadge: {
    fontSize: '10px', color: '#5a7ab0', background: '#0d1a2a',
    border: '1px solid #1a3050', borderRadius: '3px', padding: '1px 5px',
    whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
  },
  editHint: { fontSize: '11px', color: '#333', flexShrink: 0 },
  editRow: { display: 'flex', alignItems: 'center', gap: '5px', width: '100%' },
  editInput: {
    background: '#1a1a1a', border: '1px solid #3a3a3a', borderRadius: '4px',
    color: '#ccc', fontSize: '12px', padding: '2px 6px', outline: 'none',
    flex: 1, minWidth: 0, fontFamily: 'monospace',
  },
  editEpInput: { flex: '0 0 52px', width: '52px' },
  editSep: { color: '#444', fontSize: '11px', flexShrink: 0 },
  clearBtn: {
    background: 'none', border: 'none', color: '#555',
    fontSize: '14px', cursor: 'pointer', padding: '0 3px', flexShrink: 0, lineHeight: 1,
  },
  unparsed: { color: '#333', fontStyle: 'italic', fontFamily: 'inherit', fontSize: '12px' },
};
