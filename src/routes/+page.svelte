<script lang="ts">
	import { onMount } from 'svelte';
	import { loadAudio } from '$lib/audio/index';
	import { isPlaying } from '$lib/audio/stores';
	import { theme } from '$lib/theme';
	import { debugMode } from '$lib/stores/debug';
	import Oscilloscope from "$lib/components/visualizer/Oscilloscope.svelte";
	import FrequencySpectrum from "$lib/components/visualizer/FrequencySpectrum.svelte";
	import Spectrogram from "$lib/components/visualizer/Spectrogram.svelte";
	import Waveform from "$lib/components/Waveform.svelte";
	import PlayPauseControls from "$lib/components/PlayPauseControls.svelte";
	
	import RmsMeter from '$lib/components/visualizer/RMSMeter.svelte';
	
	// Song name - you can replace this with dynamic content if needed
	const songName = "Demo Track";
	
	// Preload audio when the page loads
	onMount(async () => {
		console.log('Main page mounted, preloading audio...');
		await loadAudio('/demo.wav');
		console.log('Audio preloaded in main page');
	});

	// Add debug mode indicator
	$effect(() => {
		if ($debugMode) {
			console.log('Debug mode: ON - Press O to toggle');
		} else {
			console.log('Debug mode: OFF - Press O to toggle');
		}
	});
</script>

<div class="visualizer-container" style="background-color: {theme.background}; color: {theme.primary};">
	<div class="main-visualizers">
		<div class="peak-meter-container" style="border-color: {theme.primary};">
			<RmsMeter />
		</div>
		<div class="main-viz-grid">
			<FrequencySpectrum />
			<Spectrogram />
			<Oscilloscope />
		</div>
      
        
	</div>
	
	<!-- Display debug mode indicator if debug is on -->
	{#if $debugMode}
		<div class="debug-indicator">
			Debug Mode ON (Press 'O' to toggle)
		</div>
	{/if}
	
	<div class="bottom-controls">
		<Waveform   />
		<div class="play-controls">
			<PlayPauseControls compact={true} songName={songName} />
		</div>
	</div>
</div>

<style>

	
	.visualizer-container {
		display: grid;
		grid-template-rows: 60vh auto; /* Allocate 88% to visualizers, rest to controls */
		height: 100vh;
		width: 100%;
		max-width: 100vw;
		margin: 0 auto;
		padding: 0.25rem 0.75rem;
		gap: 0.25rem;
		overflow: hidden;
	}
	
	.main-visualizers {
		display: grid;
		grid-template-columns: 0.2fr 1.8fr; /* 10% width for peak meter, 90% for other visualizers */
		gap: 0.25rem;
		overflow: hidden;
	}
	
	.peak-meter-container {
		border: 1px solid; /* Color set by inline style */
		height: 100%; /* Take full height */
		min-height: 0;
		overflow: hidden;
	}
	
	.main-viz-grid {
		display: grid;
		grid-template-rows: 1fr 1fr 1fr; /* Three equal rows */
		gap: 0.25rem;
		overflow: hidden;
		height: 100%;
	}
	
	.main-viz-grid > :global(*) {
		border: 1px solid; /* Color set by component */
		min-height: 0;
		max-height: 29vh; /* Ensure each visualizer doesn't exceed its allocated space */
	}
	
	.bottom-controls {
		display: grid;
		grid-template-rows: 1fr auto;
		gap: 0.25rem;
		max-height: 40vh;
		overflow: hidden; /* Prevent overflow */
	}
	
	.bottom-controls > :global(*) {
		border: 1px solid; /* Color set by component */
		min-height: 0; /* Allow compressing */
		overflow: hidden;
	}
	
	.play-controls {
		display: flex;
		justify-content: center;
		align-items: center;
	 /* Fixed height */
		overflow: hidden;
        padding: 12px;

	}
	
	.debug-indicator {
		position: fixed;
		bottom: 10px;
		right: 10px;
		background-color: rgba(0, 0, 0, 0.7);
		color: #f42e1f;
		padding: 5px 10px;
		border-radius: 3px;
		font-size: 12px;
		z-index: 1000;
	}
</style>
