// Main entry point that re-exports everything
export * from './core';
export * from './analyzer';
export * from './controls';
export * from './stores';
export * from './visualizer';
export * from './utils';

// Simplified API functions
import { loadAudioFile } from './core';
import {
	togglePlayPause,
	seekToPosition,
	adjustEqualizer,
	setVolume,
	getVolume,
	toggleMute
} from './controls';
import { startVisualizerUpdates } from './visualizer';
import { isPlaying, audioBuffer, playbackPosition, eqSettings, volume, isLoading, loadingError } from './stores';
import { playlist } from '$lib/stores/playlist';
import { get } from 'svelte/store';

/**
 * Loads an audio file and prepares it for playback with proper error handling
 */
export async function loadAudio(audioSrc: string): Promise<boolean> {
	try {
		// Validate input
		if (!audioSrc) {
			throw new Error('No audio source provided');
		}

		// Set loading state
		isLoading.set(true);
		loadingError.set(null);

		// Check if we need to pause current playback
		const wasPlaying = get(isPlaying);
		if (wasPlaying) {
			togglePlayPause(); // Pause current playback
		}

		// Reset position
		playbackPosition.set(0);

		// Load the audio file using the core function
		const buffer = await loadAudioFile(audioSrc);
		
		if (!buffer) {
			throw new Error('Failed to load audio buffer');
		}

		// Update playlist duration if this is the active track
		const currentPlaylist = get(playlist);
		const activeTrack = currentPlaylist.activeTrack;
		if (activeTrack && activeTrack.path === audioSrc) {
			playlist.updateTrackDuration(activeTrack.id, buffer.duration);
		}

		// Start visualizer updates if not already running
		startVisualizerUpdates();

		// Auto-play if previous track was playing
		if (wasPlaying) {
			togglePlayPause(); // Resume playback with new track
		}

		isLoading.set(false);
		// Explicitly clear any error state on successful load
		loadingError.set(null);
		return true;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		
		// Set error state
		loadingError.set(errorMessage);
		isLoading.set(false);
		
		// Reset audio buffer on error
		audioBuffer.set(null);
		
		return false;
	}
}

// Re-export commonly used functions directly
export { togglePlayPause, seekToPosition };

// Export function to get audio duration that uses the store
export function getAudioDuration(): number {
	const buffer = get(audioBuffer);
	return buffer ? buffer.duration : 0;
}

// Re-export the equalizer function
export { eqSettings };

// Simplified EQ adjustment function for all bands at once
export function setEqualizerValues(values: { low: number; mid: number; high: number }) {
	// Update all bands
	adjustEqualizer('low', values.low);
	adjustEqualizer('mid', values.mid);
	adjustEqualizer('high', values.high);
}

// Re-export volume-related functions and stores
export { setVolume, getVolume, toggleMute, volume };

// Re-export loading state stores
export { isLoading, loadingError };

/**
 * Safely loads the demo audio file with fallback handling
 */
export async function loadDemoAudio(): Promise<boolean> {
	const demoFiles = ['/demo.mp3', '/demo.wav'];
	
	// Clear any previous error state at the start
	loadingError.set(null);
	
	for (const demoFile of demoFiles) {
		const success = await loadAudio(demoFile);
		if (success) {
			// Ensure error state is cleared on success
			loadingError.set(null);
			return true;
		}
	}
	
	return false;
}
