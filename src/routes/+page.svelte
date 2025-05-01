<script>
	import { onMount } from 'svelte';
	import { loadAudio } from '$lib/audio/engine';
	import Oscilloscope from "$lib/components/Oscilloscope.svelte";
	import FrequencySpectrum from "$lib/components/FrequencySpectrum.svelte";
	import Waveform from "$lib/components/Waveform.svelte";
	import PlayPauseControls from "$lib/components/PlayPauseControls.svelte";
	
	// Preload audio when the page loads
	onMount(async () => {
		console.log('Main page mounted, preloading audio...');
		await loadAudio();
		console.log('Audio preloaded in main page');
	});
</script>

<div class="visualizer-container">
	<div class="main-visualizers">
		<FrequencySpectrum fullHeight={true} />
		<Oscilloscope fullHeight={true} />
	</div>
	
	<div class="bottom-controls">
		<Waveform compactMode={true} />
		<div class="play-controls">
			<PlayPauseControls />
		</div>
	</div>
</div>

<style>
	.visualizer-container {
		display: grid;
		grid-template-rows: 1fr auto;
		height: 100vh;
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding: 0.5rem 1.5rem;
		gap: 0.5rem;
		overflow: hidden;
		background-color: #000;
		color: #fff;
	}
	
	.main-visualizers {
		display: grid;
		grid-template-rows: 1fr 1fr;
		gap: 0.5rem;
		overflow: hidden;
		border: 1px solid #00ff00;
	}
	
	.main-visualizers > :global(*) {
		border: 1px solid #00ff00;
	}
	
	.bottom-controls {
		display: grid;
		grid-template-rows: auto auto;
		gap: 0.25rem;
		max-height: 60px;
		border: 1px solid #00ff00;
	}
	
	.bottom-controls > :global(*) {
		border: 1px solid #00ff00;
	}
	
	.play-controls {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 20px;
	}
</style>