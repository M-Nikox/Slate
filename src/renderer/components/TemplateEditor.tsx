import React, { useRef } from 'react';
import { DEFAULT_TEMPLATE, TEMPLATE_TOKENS } from '../../shared/parser/build-name.js';

interface Props {
  value: string;
  onChange: (value: string) => void;
  preview: string | null;  // live preview from first parsed row
}

export default function TemplateEditor({ value, onChange, preview }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isDefault = value === DEFAULT_TEMPLATE;

  function insertToken(token: string) {
    const input = inputRef.current;
    if (!input) {
      onChange(value + token);
      return;
    }
    const start = input.selectionStart ?? value.length;
    const end   = input.selectionEnd   ?? value.length;
    const next  = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    // Restore cursor after the inserted token
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div style={styles.root}>
      {/* Input row */}
      <div style={styles.inputRow}>
        <label style={styles.label}>Format</label>
        <input
          ref={inputRef}
          className="input-focus"
          style={styles.input}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          spellCheck={false}
          placeholder={DEFAULT_TEMPLATE}
        />
        {!isDefault && (
          <button
            className="btn-ghost-hover"
            style={styles.reset}
            onClick={() => onChange(DEFAULT_TEMPLATE)}
            title="Reset to default format"
          >
            ✕
          </button>
        )}
      </div>

      {/* Token chips */}
      <div style={styles.tokens}>
        {TEMPLATE_TOKENS.map(({ token, description }) => (
          <button
            key={token}
            className="btn-ghost-hover"
            style={styles.chip}
            onClick={() => insertToken(token)}
            title={description}
          >
            {token}
          </button>
        ))}
      </div>

      {/* Live preview */}
      {preview && (
        <div style={styles.preview}>
          <span style={styles.previewLabel}>Preview</span>
          <span style={styles.previewValue}>{preview}</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '9px 20px',
    borderBottom: '1px solid #1a1a1a',
    flexShrink: 0,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
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
    fontFamily: 'monospace',
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
  tokens: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
  },
  chip: {
    background: '#181818',
    border: '1px solid #2a2a2a',
    borderRadius: '4px',
    color: '#4a9e5c',
    fontSize: '11px',
    padding: '2px 7px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    transition: 'border-color 0.15s, color 0.15s',
  },
  preview: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingTop: '2px',
  },
  previewLabel: {
    fontSize: '11px',
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  previewValue: {
    fontSize: '12px',
    color: '#4a9e5c',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
