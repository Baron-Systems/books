import { constants } from 'fs';
import fs from 'fs/promises';
import { ConfigFile } from 'fyo/core/types';
import { Main } from 'main';
import config from 'utils/config';
import { BackendResponse } from 'utils/ipc/types';
import { IPC_CHANNELS } from 'utils/messages';
import type { ConfigFilesWithModified } from 'utils/types';

export async function setAndGetCleanedConfigFiles() {
  const files = config.get('files', []);

  const cleanedFileMap: Map<string, ConfigFile> = new Map();
  for (const file of files) {
    const exists = await fs
      .access(file.dbPath, constants.W_OK)
      .then(() => true)
      .catch(() => false);

    if (!file.companyName) {
      continue;
    }

    const key = `${file.companyName}-${file.dbPath}`;
    if (!exists || cleanedFileMap.has(key)) {
      continue;
    }

    cleanedFileMap.set(key, file);
  }

  const cleanedFiles = Array.from(cleanedFileMap.values());
  config.set('files', cleanedFiles);
  return cleanedFiles;
}

export async function getConfigFilesWithModified(files: ConfigFile[]) {
  const filesWithModified: ConfigFilesWithModified[] = [];
  for (const { dbPath, id, companyName, openCount } of files) {
    const { mtime } = await fs.stat(dbPath);
    filesWithModified.push({
      id,
      dbPath,
      companyName,
      modified: mtime.toISOString(),
      openCount,
    });
  }

  return filesWithModified;
}

const FALLBACK_IPC_ERROR: BackendResponse = {
  error: {
    name: 'Error',
    message: 'An error occurred while handling the request.',
  },
};

export async function getErrorHandledReponse(
  func: () => Promise<unknown> | unknown
): Promise<BackendResponse> {
  try {
    const response: BackendResponse = {};

    try {
      response.data = await func();
    } catch (err) {
      response.error = serializeError(err);
    }

    try {
      return ensureSerializableResponse(response);
    } catch {
      return { error: serializeError(new Error('Response could not be serialized for IPC')) };
    }
  } catch {
    return FALLBACK_IPC_ERROR;
  }
}

/**
 * Ensure the response can be safely sent over IPC (structured clone).
 * Prevents "An unknown exception occurred in the isolated context" when
 * response.data contains non-serializable values (e.g. from native modules).
 */
function ensureSerializableResponse(response: BackendResponse): BackendResponse {
  try {
    const json = JSON.stringify(response);
    return JSON.parse(json) as BackendResponse;
  } catch {
    return {
      error: {
        name: 'Error',
        message: 'Response could not be serialized for IPC',
      },
    };
  }
}

/**
 * Safely serialize any thrown value to a plain object for IPC.
 * Native/addon errors or non-Error throws can cause "An unknown exception
 * occurred in the isolated context" in Electron if not normalized.
 */
function serializeError(err: unknown): {
  name: string;
  message: string;
  stack?: string;
  code?: string;
} {
  let fallbackMessage = 'Unknown error';
  try {
    if (err != null) {
      fallbackMessage = typeof err === 'string' ? err : String(err);
    }
  } catch {
    // ignore if String(err) or property access throws
  }

  const fallback = {
    name: 'Error',
    message: fallbackMessage,
  };

  if (err == null || typeof err !== 'object') {
    return fallback;
  }

  try {
    const e = err as NodeJS.ErrnoException & Error;
    return {
      name: typeof e.name === 'string' ? e.name : fallback.name,
      message: typeof e.message === 'string' ? e.message : fallback.message,
      stack: typeof e.stack === 'string' ? e.stack : undefined,
      code: typeof e.code === 'string' ? e.code : undefined,
    };
  } catch {
    return fallback;
  }
}

export function rendererLog(main: Main, ...args: unknown[]) {
  main.mainWindow?.webContents.send(IPC_CHANNELS.CONSOLE_LOG, ...args);
}

export function isNetworkError(error: Error) {
  switch (error?.message) {
    case 'net::ERR_INTERNET_DISCONNECTED':
    case 'net::ERR_NETWORK_CHANGED':
    case 'net::ERR_PROXY_CONNECTION_FAILED':
    case 'net::ERR_CONNECTION_RESET':
    case 'net::ERR_CONNECTION_CLOSE':
    case 'net::ERR_NAME_NOT_RESOLVED':
    case 'net::ERR_TIMED_OUT':
    case 'net::ERR_CONNECTION_TIMED_OUT':
      return true;
    default:
      return false;
  }
}

/** True when the update server returned 404 / no channel (e.g. placeholder app-update.yml). Don't show to user. */
export function isUpdateCheckIgnorableError(error: Error): boolean {
  const msg = error?.message ?? '';
  if (msg.includes('404') || msg.includes('Cannot find channel') || msg.includes('latest.yml')) {
    return true;
  }
  const err = error as Error & { response?: { statusCode?: number } };
  return err?.response?.statusCode === 404;
}
