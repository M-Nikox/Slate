import React from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  detectedName: string;
}

export default function ShowNameEditor({ value, onChange, detectedName }: Props) {
  return (
    <div style={styles.root}>
      <label style={styles.label}>Show name</label>
      <input
        className="input-focus"
        style={styles.input}
        type="text"
        value={value}
        placeholder={detectedName || 'Auto-detected'}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
      />
      {value && (
        <button
          className="btn-ghost-hover"
          style={styles.reset}
          onClick={() => onChange('')}
          title="Reset to auto-detected"
        >
          ✕
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 20px',
    borderBottom: '1px solid #1a1a1a',
    flexShrink: 0,
  },
  label: {
    fontSize: '11px',
    color: '#444',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 600,
  },
  input: {
    flex: 1,
    background: '#161616',
    border: '1px solid #252525',
    borderRadius: '5px',
    color: '#e8e8e8',
    fontSize: '13px',
    padding: '6px 10px',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  },
  reset: {
    background: 'none',
    border: 'none',
    color: '#444',
    fontSize: '13px',
    padding: '4px 6px',
    borderRadius: '4px',
    transition: 'color 0.15s',
  },
};