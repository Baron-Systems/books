// eslint-disable-next-line
require('source-map-support').install({
  handleUncaughtException: false,
  environment: 'node',
});

import { emitMainProcessError } from 'backend/helpers';
import {
  app,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  protocol,
  ProtocolRequest,
  ProtocolResponse,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import fs from 'fs';
import path from 'path';
import registerAppLifecycleListeners from './main/registerAppLifecycleListeners';
import registerAutoUpdaterListeners from './main/registerAutoUpdaterListeners';
import registerIpcMainActionListeners from './main/registerIpcMainActionListeners';
import registerIpcMainMessageListeners from './main/registerIpcMainMessageListeners';
import registerProcessListeners from './main/registerProcessListeners';

export class Main {
  title = 'Baron Accounting';
  icon: string;

  winURL = '';
  checkedForUpdate = false;
  mainWindow: BrowserWindow | null = null;

  WIDTH = 1200;
  HEIGHT = process.platform === 'win32' ? 826 : 800;

  constructor() {
    this.icon = this.isDevelopment
      ? path.resolve('./build/icon.png')
      : path.join(__dirname, 'icons', '512x512.png');

    protocol.registerSchemesAsPrivileged([
      { scheme: 'app', privileges: { secure: true, standard: true } },
    ]);

    if (this.isDevelopment) {
      autoUpdater.logger = console;
    }

    // https://github.com/electron-userland/electron-builder/issues/4987
    app.commandLine.appendSwitch('disable-http2');
    autoUpdater.requestHeaders = {
      'Cache-Control':
        'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    };

    this.registerListeners();
    if (this.isMac && this.isDevelopment) {
      app.dock.setIcon(this.icon);
    }
  }

  get isDevelopment() {
    return process.env.NODE_ENV === 'development';
  }

  get isTest() {
    return !!process.env.IS_TEST;
  }

  get isMac() {
    return process.platform === 'darwin';
  }

  get isLinux() {
    return process.platform === 'linux';
  }

  registerListeners() {
    registerIpcMainMessageListeners(this);
    registerIpcMainActionListeners(this);
    registerAutoUpdaterListeners(this);
    registerAppLifecycleListeners(this);
    registerProcessListeners(this);
  }

  getOptions(): BrowserWindowConstructorOptions {
    const preload = path.join(__dirname, 'main', 'preload.js');
    const options: BrowserWindowConstructorOptions = {
      width: this.WIDTH,
      height: this.HEIGHT,
      title: this.title,
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 16, y: 16 },
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        preload,
      },
      autoHideMenuBar: true,
      frame: !this.isMac,
      resizable: true,
    };

    if (this.isDevelopment || this.isLinux) {
      Object.assign(options, { icon: this.icon });
    }

    if (this.isLinux) {
      Object.assign(options, {
        icon: path.join(__dirname, '/icons/512x512.png'),
      });
    }

    return options;
  }

  async createWindow() {
    const options = this.getOptions();
    this.mainWindow = new BrowserWindow(options);

    if (this.isDevelopment) {
      this.setViteServerURL();
    } else {
      this.registerAppProtocol();
    }

    await this.mainWindow.loadURL(this.winURL);
    if (this.isDevelopment && !this.isTest) {
      this.mainWindow.webContents.openDevTools();
    }

    this.setMainWindowListeners();
  }

  setViteServerURL() {
    let port = 6969;
    let host = '0.0.0.0';

    if (process.env.VITE_PORT && process.env.VITE_HOST) {
      port = Number(process.env.VITE_PORT);
      host = process.env.VITE_HOST;
    }

    // Load the url of the dev server if in development mode
    this.winURL = `http://${host}:${port}/`;
  }

  registerAppProtocol() {
    protocol.registerBufferProtocol('app', bufferProtocolCallback);

    // Use the registered protocol url to load the files.
    this.winURL = 'app://./index.html';
  }

  setMainWindowListeners() {
    if (this.mainWindow === null) {
      return;
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.webContents.on('did-fail-load', () => {
      this.mainWindow!.loadURL(this.winURL).catch((err) =>
        emitMainProcessError(err)
      );
    });
  }
}

/**
 * Packaged renderer root: in prod this is the app.asar root (main.js lives here).
 * Serves built files from src/ (index.html, assets/, etc.).
 */
const PACKAGED_RENDERER_ROOT = path.join(__dirname, 'src');

const MIME_TYPES: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

/**
 * Callback used to register the custom app protocol.
 * In prod, files are read from the packaged renderer root (inside app.asar).
 * - Paths with no file extension (e.g. /settings, /pos) → index.html (SPA fallback).
 * - Paths with an extension → real file (assets, css, js, fonts, images).
 */
function bufferProtocolCallback(
  request: ProtocolRequest,
  callback: (response: ProtocolResponse) => void
) {
  const cb = callback as (response: ProtocolResponse | number) => void;
  const url = new URL(request.url);
  const pathname = decodeURI(url.pathname).replace(/^\/+/, '');
  const host = decodeURI(url.host || '');
  // Build path relative to renderer root: host is first segment (e.g. "assets"), or omit if "." for app://./
  const relativePath =
    host && host !== '.'
      ? path.join(host, pathname).split(path.sep).join('/')
      : pathname;

  const hasExtension = path.extname(relativePath).length > 0;
  const resolvedRelative = hasExtension
    ? relativePath
    : 'index.html';

  const filePath = path.join(PACKAGED_RENDERER_ROOT, resolvedRelative);

  // Prevent directory traversal: must stay under renderer root
  const realRoot = path.resolve(PACKAGED_RENDERER_ROOT);
  const realPath = path.resolve(filePath);
  if (!realPath.startsWith(realRoot) || realPath === realRoot) {
    console.error('[app protocol] path escape or root:', request.url, filePath);
    cb(-2);
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error(
        '[app protocol] read failed:',
        request.url,
        'resolved:',
        filePath
      );
      cb(-2);
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[extension] ?? '';

    // statusCode and headers help Chromium accept the font (needed for custom protocol).
    // Access-Control-Allow-Origin is required when document is app://./ and assets are app://assets/ (different origins).
    const headers: Record<string, string> = {
      'Content-Type': mimeType || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    };
    cb({
      statusCode: 200,
      headers,
      mimeType,
      data,
    });
  });
}

export default new Main();
