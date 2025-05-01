// Color utilities
export function blendColors(color1: string, color2: string, factor: number, alpha = 1.0): string {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);

  const r = Math.round(c1.r + factor * (c2.r - c1.r));
  const g = Math.round(c1.g + factor * (c2.g - c1.g));
  const b = Math.round(c1.b + factor * (c2.b - c1.b));

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function parseColor(color: string): { r: number; g: number; b: number } {
  if (color.startsWith('#')) {
    const hex = color.substring(1);
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  }
  // Fallback for non-hex colors
  return { r: 0, g: 255, b: 0 };
}

// Audio processing utilities
export function dbToPosition(db: number, minDb = -60, maxDb = 6): number {
  // Clamp to minDb
  db = Math.max(db, minDb);

  // Scale to 0-1 range
  return (db - minDb) / (maxDb - minDb);
}

export function linearToDb(value: number): number {
  // Avoid log(0) errors
  if (value < 0.0000001) return -60;

  // Convert to dB = 20 * log10(value)
  return 20 * Math.log10(value);
}
