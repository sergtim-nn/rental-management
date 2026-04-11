import fs from 'fs';

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || '/var/www/rental-uploads';
}

export function ensureUploadsDir(): string {
  const dir = getUploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
