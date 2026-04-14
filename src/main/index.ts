import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
import { registerHandlers } from './ipc/handlers.js';
import { IPC } from '../shared/ipc-channels.js';

const moduleFilename = fileURLToPath(import.meta.url);
const moduleDirname = path.dirname(moduleFilename);
const appRoot = app.getAppPath();
const rendererDist = path.join(appRoot, 'out/renderer');
const preloadPath = path.join(moduleDirname, '../preload/index.cjs');
const devServerUrl = process.env.ELECTRON_RENDERER_URL;

let mainWindow: BrowserWindow | null = null;
const isDev = !app.isPackaged;

/**
 * Resolve a window icon path that works in both:
 * - dev (running from repo): build/icon.png
 * - packaged (running from asar + resources): <resources>/icons/icon.png
 *
 * electron-builder.yml will place build/icon.png at resources/icons/icon.png via extraResources.
 */
function resolveWindowIcon(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icons', 'icon.png');
  }

  return path.join(appRoot, 'build', 'icon.png');
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#0f0f0f',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {}),
    ...(process.platform !== 'darwin' ? { icon: resolveWindowIcon() } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev && devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(rendererDist, 'index.html'));
  }

  console.log('[main] window created');
}

app.whenReady().then(() => {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  registerHandlers();

  ipcMain.removeAllListeners(IPC.SET_TITLE);
  ipcMain.on(IPC.SET_TITLE, (_event, title: string) => {
    if (typeof title === 'string') {
      mainWindow?.setTitle(title);
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});