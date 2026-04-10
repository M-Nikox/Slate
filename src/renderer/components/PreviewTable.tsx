import React, { useState } from 'react';
import type { PreviewRow } from '../hooks/usePreviews.js';

interface Props {
  rows: PreviewRow[];
  selected: Set<string>;
  onToggle: (filePath: string) => void;
  onToggleAll: (checked: boolean) => void;
}

function TableRow({
  row,
  isSelected,
  onToggle,
}: {
  row: PreviewRow;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isLowConfidence = row.parsed && row.confidence === 'low';

  const rowBackground = () => {
    if (!row.parsed) return 'transparent';
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
      <td style={{ ...styles.td, ...styles.proposedName }}>
        {row.parsed ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{ ...styles.proposedNameText, color: isLowConfidence ? '#c8a84b' : '#b8dbbe' }}
              title={row.proposedName ?? ''}
            >
              {row.proposedName}
            </span>
            {isLowConfidence && (
              <span style={styles.lowConfidenceBadge} title="Low confidence — verify before renaming">
                ⚠ low confidence
              </span>
            )}
          </span>
        ) : (
          <span style={styles.unparsed}>Could not parse</span>
        )}
      </td>
    </tr>
  );
}

export default function PreviewTable({
  rows, selected, onToggle, onToggleAll,
}: Props) {
  const parsedRows  = rows.filter(r => r.parsed);
  const allSelected = parsedRows.length > 0 && parsedRows.every(r => selected.has(r.file.path));
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
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    flex: 1,
    overflowY: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12.5px',
    tableLayout: 'fixed',
  },
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
  tdCheck: {
    padding: '7px 12px',
    verticalAlign: 'middle',
    width: '36px',
  },
  td: {
    padding: '7px 12px',
    verticalAlign: 'middle',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  checkbox: {
    accentColor: '#4a9e5c',
    width: '13px',
    height: '13px',
    cursor: 'pointer',
    display: 'block',
  },
  originalName: {
    color: '#666',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  arrow: {
    color: '#2a2a2a',
    fontSize: '12px',
    textAlign: 'center',
    padding: '7px 0',
    width: '28px',
  },
  proposedName: {
    fontFamily: 'monospace',
    fontSize: '12px',
    overflow: 'hidden',
  },
  proposedNameText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  lowConfidenceBadge: {
    fontSize: '10px',
    color: '#8a6a1a',
    background: '#2a2008',
    border: '1px solid #3d3010',
    borderRadius: '3px',
    padding: '1px 5px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  unparsed: {
    color: '#333',
    fontStyle: 'italic',
    fontFamily: 'inherit',
    fontSize: '12px',
  },
};