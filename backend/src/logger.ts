import fs from 'fs';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'error.log');
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_ARCHIVES = 5;

try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch { /* ignore */ }

function rotateIfNeeded(): void {
  let size = 0;
  try { size = fs.statSync(LOG_FILE).size; } catch { return; }
  if (size < MAX_BYTES) return;

  for (let i = MAX_ARCHIVES - 1; i >= 1; i--) {
    try { fs.renameSync(`${LOG_FILE}.${i}`, `${LOG_FILE}.${i + 1}`); } catch { /* not exists */ }
  }
  try { fs.renameSync(LOG_FILE, `${LOG_FILE}.1`); } catch { /* ignore */ }
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    const out: Record<string, unknown> = { message: err.message, stack: err.stack };
    const code = (err as { code?: string }).code;
    if (code) out.code = code;
    return out;
  }
  return { message: String(err) };
}

export function logError(context: string, err: unknown, meta?: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  const entry = { ts, level: 'error', context, error: serializeError(err), ...(meta ?? {}) };

  console.error(`[${ts}] ${context}:`, err, meta ?? '');

  try {
    rotateIfNeeded();
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch {
    /* never let logging crash the request */
  }
}
