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

// Notes in standard tuning (starting from C)
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Convert frequency to closest musical note
export function frequencyToNote(frequency: number): { note: string; octave: number; cents: number } {
	// A4 = 440Hz (standard tuning reference)
	const A4 = 440.0;
	
	// Calculate how many half steps away from A4
	const halfStepsFromA4 = 12 * Math.log2(frequency / A4);
	
	// Round to get the closest note
	const roundedHalfSteps = Math.round(halfStepsFromA4);
	
	// Calculate the exact frequency for the closest note
	const exactFrequency = A4 * Math.pow(2, roundedHalfSteps / 12);
	
	// Calculate cents deviation (how many cents sharp/flat)
	const cents = Math.round(1200 * Math.log2(frequency / exactFrequency));
	
	// Calculate note index and octave (A4 is at index 9 in the 4th octave)
	const noteIndex = (9 + roundedHalfSteps) % 12;
	// Make sure noteIndex is always positive
	const safeNoteIndex = (noteIndex + 12) % 12;
	
	// Calculate octave (A4 is in the 4th octave)
	const octave = 4 + Math.floor((roundedHalfSteps + 9) / 12);
	
	// Get the note name (ensuring we have a valid index)
	const note = NOTES[safeNoteIndex];
	
	return { note, octave, cents };
}

// Format frequency as a musical note with optional cents deviation
export function formatNote(frequency: number, includeCents = false): string {
	// Skip very low frequencies
	if (frequency < 20) return ''; 
	
	const { note, octave, cents } = frequencyToNote(frequency);
	
	if (includeCents && cents !== 0) {
		const sign = cents > 0 ? '+' : '';
		return `${note}${octave} (${sign}${cents}¢)`;
	} else {
		return `${note}${octave}`;
	}
}
