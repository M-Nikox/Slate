export interface DropLikeFile {
  path?: string;
}

export interface DropLikeItem {
  kind?: string;
  getAsFile?: () => DropLikeFile | null;
}

export interface DropLikeDataTransfer {
  files?: ArrayLike<DropLikeFile>;
  items?: ArrayLike<DropLikeItem>;
  getData?: (format: string) => string;
}

type ResolveDroppedFilePath = (file: File) => string | null;

function normalizeCandidatePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function fileUriToPath(uri: string): string | null {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== 'file:') return null;
    const pathname = decodeURIComponent(parsed.pathname || '');
    if (!pathname) return null;
    if (parsed.host) return `//${parsed.host}${pathname}`;
    if (/^\/[A-Za-z]:\//.test(pathname)) return pathname.slice(1);
    return pathname;
  } catch {
    return null;
  }
}

function extractFromTransferText(dataTransfer: DropLikeDataTransfer): string | null {
  if (!dataTransfer.getData) return null;
  const uriList = normalizeCandidatePath(dataTransfer.getData('text/uri-list'));
  if (uriList) {
    const entries = uriList
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    for (const entry of entries) {
      const fromUri = fileUriToPath(entry);
      if (fromUri) return fromUri;
      const normalized = normalizeCandidatePath(entry);
      if (normalized) return normalized;
    }
  }

  const plain = normalizeCandidatePath(dataTransfer.getData('text/plain'));
  if (!plain) return null;
  const fromPlainUri = fileUriToPath(plain);
  return fromPlainUri ?? plain;
}

export function extractDroppedPath(
  dataTransfer: DropLikeDataTransfer | null | undefined,
  resolveDroppedFilePath?: ResolveDroppedFilePath,
): string | null {
  if (!dataTransfer) return null;

  const files = dataTransfer.files;
  if (files && files.length > 0) {
    const directPath = normalizeCandidatePath(files[0]?.path);
    if (directPath) return directPath;
    if (resolveDroppedFilePath) {
      const resolvedPath = normalizeCandidatePath(resolveDroppedFilePath(files[0] as File));
      if (resolvedPath) return resolvedPath;
    }
  }

  const items = dataTransfer.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;

      if (item.kind !== undefined && item.kind !== 'file') continue;

      const file = item.getAsFile?.();
      const filePath = normalizeCandidatePath(file?.path);
      if (filePath) return filePath;
      if (resolveDroppedFilePath && file) {
        const resolvedPath = normalizeCandidatePath(resolveDroppedFilePath(file as File));
        if (resolvedPath) return resolvedPath;
      }
    }
  }

  return extractFromTransferText(dataTransfer);
}
