import { Notice } from 'obsidian';

export function showNotice(message: string, timeout = 5000): void {
  new Notice(message, timeout);
}

export function formatDate(date: Date, format = 'YYYY-MM-DD'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return format.replace('YYYY', String(year)).replace('MM', month).replace('DD', day);
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]/g, '-');
}
