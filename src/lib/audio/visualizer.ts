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
export function blendColors(
	baseColor: string,
	overlayColor: string,
	factor: number,
	alpha = 1.0
): string {
	const base = parseColor(baseColor);
	const overlay = parseColor(overlayColor);

	// Blend the colors based on the factor (0-1)
	const r = Math.round(base.r + (overlay.r - base.r) * factor);
	const g = Math.round(base.g + (overlay.g - base.g) * factor);
	const b = Math.round(base.b + (overlay.b - base.b) * factor);

	// Return as RGBA if alpha < 1, otherwise as RGB
	if (alpha < 1.0) {
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	} else {
		return `rgb(${r}, ${g}, ${b})`;
	}
}

export function parseColor(color: string): { r: number; g: number; b: number } {
	// Handle hexadecimal colors
	if (color.startsWith('#')) {
		const hex = color.slice(1);
		const bigint = parseInt(hex, 16);
		const r = (bigint >> 16) & 255;
		const g = (bigint >> 8) & 255;
		const b = bigint & 255;
		return { r, g, b };
	}

	// Handle rgb/rgba colors
	const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
	if (rgbMatch) {
		return {
			r: parseInt(rgbMatch[1], 10),
			g: parseInt(rgbMatch[2], 10),
			b: parseInt(rgbMatch[3], 10)
		};
	}

	// Default to black if the color format is not recognized
	return { r: 0, g: 0, b: 0 };
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

// --- Frequency Display & Tooltip Utilities ---

// Interface for visualizers that support hover
export interface HoverableVisualizer {
	isHovering: boolean;
	mouseX: number;
	mouseY: number;
	hoverFrequency: number;
	updateHoverFrequency(): void;
}

// Format frequency for display
export function formatFrequency(freq: number): string {
	if (freq >= 1000) {
		return `${(freq / 1000).toFixed(1)} kHz`;
	} else {
		return `${Math.round(freq)} Hz`;
	}
}

// Draw tooltip with frequency and note information
export interface TooltipOptions {
	ctx: CanvasRenderingContext2D;
	x: number;
	y: number;
	width: number;
	frequency: number;
	backgroundColor: string;
	textColor: string;
	showNote?: boolean;
	formatNote?: (frequency: number, includeCents?: boolean) => string;
}

export interface TooltipResult {
	textX: number;
	textY: number;
	textWidth: number;
}

export function drawFrequencyTooltip(options: TooltipOptions): TooltipResult {
	const {
		ctx,
		x,
		y,
		width,
		frequency,
		backgroundColor,
		textColor,
		showNote = true,
		formatNote
	} = options;

	// Set font
	ctx.font = '12px Arial';
	
	// Create frequency text
	const frequencyText = formatFrequency(frequency);
	
	// Create note text if requested and formatter provided
	let displayText = frequencyText;
	if (showNote && formatNote) {
		const noteText = formatNote(frequency, true); // Include cents deviation
		displayText = `${frequencyText}  ${noteText}`;
	}
	
	// Calculate dimensions
	const textWidth = ctx.measureText(displayText).width;
	const padding = 4;
	const textHeight = 14; // Approximate text height
	const boxHeight = textHeight + 4; // Small buffer
	
	// Position text slightly above the cursor
	const textY = y - 4; // Move up a bit (-7 pixels) from cursor position
	
	// Adjust x position to ensure tooltip stays within canvas bounds
	let textX = x+padding;
	if (textX + textWidth + 2 * padding > width) {
		textX = width - textWidth - 2 * padding;
	}
	
	// Draw background
	ctx.fillStyle = backgroundColor;
	ctx.fillRect(
		textX - padding, 
		textY - textHeight, // Position background to contain text
		textWidth + padding * 2, 
		boxHeight
	);
	
	// Draw text
	ctx.fillStyle = textColor;
	ctx.fillText(displayText, textX, textY);
	
	return { textX, textY, textWidth };
}

// Draw a reference line at a specified position
export function drawReferenceLine(
	ctx: CanvasRenderingContext2D,
	x: number,
	height: number,
	color: string,
	alpha = 0.5
): void {
	ctx.strokeStyle = color + (alpha < 1 ? Math.round(alpha * 255).toString(16).padStart(2, '0') : '');
	ctx.beginPath();
	ctx.moveTo(x, 0);
	ctx.lineTo(x, height);
	ctx.stroke();
}
