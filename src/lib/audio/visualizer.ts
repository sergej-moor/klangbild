// Visualizer-specific processing
import { get } from 'svelte/store';
import {
	spectrum,
	waveform,
	rmsLevels,
	analyzerNode,
	isPlaying,
	audioBuffer,
	audioContext,
	startTime,
	playbackPosition
} from './stores';
import { getFrequencyData, getWaveformData, calculateRMSLevels } from './analyzer';

// Color utilities for visualizations
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
			b: parseInt(hex.substring(4, 6), 16)
		};
	}
	// Fallback for non-hex colors
	return { r: 0, g: 255, b: 0 };
}

// Update all visualizer data
export function updateVisualizerData() {
	if (!get(analyzerNode)) return;

	// Update spectrum data
	const freqData = getFrequencyData();
	spectrum.set(freqData);

	// Update waveform data
	const waveData = getWaveformData();
	waveform.set(waveData);

	// Update RMS levels
	const levels = calculateRMSLevels();
	rmsLevels.set(levels);

	// Update playback position (critical for UI updates)
	updatePlaybackPosition();
}

// Update the playback position during playback
function updatePlaybackPosition() {
	const context = get(audioContext);
	const buffer = get(audioBuffer);
	const playing = get(isPlaying);

	if (context && buffer && playing) {
		// Calculate current playback position based on elapsed time
		const startTimeValue = get(startTime);
		const elapsed = context.currentTime - startTimeValue;
		const progress = Math.min(1, Math.max(0, elapsed / buffer.duration));

		// Update the store
		playbackPosition.set(progress);
	}
}

// Start visualization update loop
export function startVisualizerUpdates() {
	let animationId: number;

	function update() {
		updateVisualizerData();
		animationId = requestAnimationFrame(update);
	}

	update();

	// Return cleanup function
	return () => {
		if (animationId) {
			cancelAnimationFrame(animationId);
		}
	};
}

// Calculate levels for visualizers
export function calculateLevels() {
	if (!get(isPlaying)) return;
	updateVisualizerData();
}
