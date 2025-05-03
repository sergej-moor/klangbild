// Utility functions
export function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Convert linear amplitude to decibels
export function linearToDb(value: number, minDb = -60) {
  if (value <= 0) return minDb;
  return Math.max(minDb, 20 * Math.log10(value));
}

// Convert decibels to normalized position (0-1)
export function dbToPosition(db: number, minDb = -60, maxDb = 6): number {
  // Clamp to minDb
  db = Math.max(db, minDb);

  // Scale to 0-1 range
  return (db - minDb) / (maxDb - minDb);
}
