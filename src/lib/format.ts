/** 632 → "10:32"; 3725 → "1:02:05". */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** ISO 8601 duration for <time datetime>: 632 → "PT10M32S". */
export function isoDuration(seconds: number): string {
  return `PT${Math.floor(seconds / 60)}M${seconds % 60}S`;
}

/** Dates are calendar days (no time zone), so format them in UTC: "9 November 2006". */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** A duration as whole minutes, for prose: 584 → "10 min". Never "0 min". */
export function formatMinutes(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

/** A file size in kilobytes (1024 bytes), for a download link: 150171 → "147 KB". */
export function formatKilobytes(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
