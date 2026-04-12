export const IPC = Object.freeze({
  PICK_FOLDER: 'pick-folder',
  SCAN_FOLDER: 'scan-folder',
  VALIDATE_FOLDER: 'validate-folder',
  RENAME_FILES: 'rename-files',
  CHECK_UNDO: 'check-undo',
  EXECUTE_UNDO: 'execute-undo',
  CHECK_FOR_UPDATES: 'check-for-updates',
  SET_TITLE: 'set-title',
} as const);

export type IpcChannel = typeof IPC[keyof typeof IPC];