<script>
	import { onMount } from 'svelte';
	import { loadAudio } from '$lib/audio/engine';
	import { theme } from '$lib/theme';
	import Oscilloscope from "$lib/components/Oscilloscope.svelte";
	import FrequencySpectrum from "$lib/components/FrequencySpectrum.svelte";
	import Spectrogram from "$lib/components/Spectrogram.svelte";
	import Waveform from "$lib/components/Waveform.svelte";
	import PlayPauseControls from "$lib/components/PlayPauseControls.svelte";
	
	import RmsMeter from '$lib/components/RMSMeter.svelte';
	
	// Song name - you can replace this with dynamic content if needed
	const songName = "Demo Track";
	
	// Debug mode toggle
	const debug = true;
	
	// Preload audio when the page loads
	onMount(async () => {
		console.log('Main page mounted, preloading audio...');
		await loadAudio();
		console.log('Audio preloaded in main page');
	});
</script>

<div class="visualizer-container">
	<div class="main-visualizers">
		<div class="peak-meter-container">
			<RmsMeter fullHeight={true} debug={debug} />
		</div>
		<div class="main-viz-grid">
			<FrequencySpectrum fullHeight={true} debug={debug} />
			<Spectrogram fullHeight={true} debug={debug} />
			<Oscilloscope fullHeight={true} debug={debug} />
		</div>
	</div>
	
	<div class="bottom-controls">
		<Waveform compactMode={true} />
		<div class="play-controls">
			<PlayPauseControls compact={true} songName={songName} />
		</div>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: var(--bg-color);
		color: var(--text-color);
		font-family: sans-serif;
	}
	
	:root {
		--bg-color: #000000;
		--text-color: #ffffff;
		--primary-color: #00ff00;
		--border-color: #00ff00;
	}
	
	.visualizer-container {
		display: grid;
		grid-template-rows: 88vh auto; /* Allocate 88% to visualizers, rest to controls */
		height: 100vh;
		width: 100%;
		max-width: 100vw;
		margin: 0 auto;
		padding: 0.25rem 0.75rem;
		gap: 0.25rem;
		background-color: var(--bg-color);
		color: var(--text-color);
		overflow: hidden;
	}
	
	.main-visualizers {
		display: grid;
		grid-template-columns: 0.2fr 1.8fr; /* 10% width for peak meter, 90% for other visualizers */
		gap: 0.25rem;
		overflow: hidden;
	}
	
	.peak-meter-container {
		border: 1px solid var(--primary-color);
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
		border: 1px solid var(--primary-color);
		min-height: 0;
		max-height: 29vh; /* Ensure each visualizer doesn't exceed its allocated space */
	}
	
	.bottom-controls {
		display: grid;
		grid-template-rows: 1fr auto;
		gap: 0.25rem;
		max-height: 10vh;
		overflow: hidden; /* Prevent overflow */
	}
	
	.bottom-controls > :global(*) {
		border: 1px solid var(--primary-color);
		min-height: 0; /* Allow compressing */
		overflow: hidden;
	}
	
	.play-controls {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 24px; /* Fixed height */
		overflow: hidden;
	}
</style>
