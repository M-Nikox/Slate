import React from 'react';

interface Props {
  count: number;
  onUndo: () => void;
  undoing: boolean;
}

export default function UndoBar({ count, onUndo, undoing }: Props) {
  return (
    <div style={styles.root}>
      <span style={styles.message}>
        ↩ Last rename affected {count} file{count !== 1 ? 's' : ''}.
      </span>
      <button
        className="btn-undo-hover"
        style={styles.button}
        onClick={onUndo}
        disabled={undoing}
      >
        {undoing ? 'Undoing…' : 'Undo Rename'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '9px 20px',
    background: '#111d14',
    borderBottom: '1px solid #1e3824',
    flexShrink: 0,
  },
  message: {
    fontSize: '13px',
    color: '#4a9e5c',
  },
  button: {
    background: 'none',
    border: '1px solid #2a5c36',
    borderRadius: '5px',
    color: '#4a9e5c',
    fontSize: '12px',
    padding: '5px 12px',
    transition: 'background 0.15s, color 0.15s',
  },
};