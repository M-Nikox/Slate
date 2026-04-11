import React from 'react';
import type { ManualModeConfig } from '../../shared/types.js';

interface Props {
  config: ManualModeConfig | null;
  onChange: (config: ManualModeConfig) => void;
}

const DEFAULT_CONFIG: ManualModeConfig = {
  showName: '',
  season: 1,
  startEpisode: 1,
};

export default function ManualModePanel({ config, onChange }: Props) {
  const c = config ?? DEFAULT_CONFIG;

  function update(patch: Partial<ManualModeConfig>) {
    onChange({ ...c, ...patch });
  }

  return (
    <div style={styles.panel}>
      <span style={styles.label}>Show name</span>
      <input
        style={styles.input}
        type="text"
        placeholder="e.g. Cowboy Bebop"
        value={c.showName}
        onChange={e => update({ showName: e.target.value })}
        spellCheck={false}
      />
      <span style={styles.label}>Season</span>
      <input
        style={{ ...styles.input, ...styles.shortInput }}
        type="number"
        min={1}
        max={99}
        value={c.season}
        onChange={e => update({ season: Math.max(1, parseInt(e.target.value, 10) || 1) })}
      />
      <span style={styles.label}>Start episode</span>
      <input
        style={{ ...styles.input, ...styles.shortInput }}
        type="number"
        min={1}
        max={999}
        value={c.startEpisode}
        onChange={e => update({ startEpisode: Math.max(1, parseInt(e.target.value, 10) || 1) })}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 20px',
    borderBottom: '1px solid #1a1a1a',
    background: '#0d0d0d',
    flexShrink: 0,
    flexWrap: 'wrap' as const,
  },
  label: {
    fontSize: '12px',
    color: '#555',
    whiteSpace: 'nowrap' as const,
  },
  input: {
    background: '#181818',
    border: '1px solid #2a2a2a',
    borderRadius: '5px',
    color: '#ccc',
    fontSize: '12.5px',
    padding: '5px 9px',
    outline: 'none',
    width: '200px',
  },
  shortInput: {
    width: '60px',
  },
};
