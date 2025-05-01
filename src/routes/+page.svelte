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

<h1 class="text-center mb-8">Audio Visualizer</h1>

<div class="max-w-[800px] mx-auto p-4">
    <div class="mb-8">
		<Waveform />
	</div>
    <div class="mb-8">
		<FrequencySpectrum />
	</div>
	<div class="mb-8">
		<Oscilloscope />
	</div>
	
	<div class="mt-8 pt-4 border-t border-gray-300 text-center">
		<PlayPauseControls />
	</div>
</div>