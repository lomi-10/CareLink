// lib/exportCsv.ts
// Turn rows into a CSV file the user actually receives — a download in the
// browser, a share sheet on a phone.
//
// Opens cleanly in Excel and Google Sheets, which is the point: evaluation
// responses need to leave the app and land somewhere they can be charted and
// quoted for a written report.

import { Platform, Share } from 'react-native';

/**
 * Escape one field for CSV.
 *
 * Excel treats a leading =, +, - or @ as a formula, so a pasted answer could
 * execute when the file is opened. Prefixing with an apostrophe keeps the text
 * visible and inert.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  // Quotes are doubled; anything with a comma, quote or newline gets wrapped.
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(cell).join(',')];
  for (const r of rows) lines.push(r.map(cell).join(','));
  // CRLF is what Excel expects; the BOM makes it read UTF-8 rather than
  // mangling accented names.
  return '﻿' + lines.join('\r\n');
}

/**
 * Deliver the CSV. Returns false if the platform gave us no way to.
 */
export async function downloadCsv(filename: string, csv: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoked on the next tick so the click has taken effect first.
      setTimeout(() => URL.revokeObjectURL(url), 0);
      return true;
    } catch {
      return false;
    }
  }

  // On a phone there's no download folder to speak of, so hand it to the share
  // sheet — the user picks Files, Drive, email, wherever.
  try {
    await Share.share({ title: filename, message: csv });
    return true;
  } catch {
    return false;
  }
}
