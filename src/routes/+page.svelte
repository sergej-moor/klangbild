<script>
	import Oscilloscope from "$lib/components/Oscilloscope.svelte";
	import FrequencySpectrum from "$lib/components/FrequencySpectrum.svelte";
	import PlayPauseControls from "$lib/components/PlayPauseControls.svelte";
</script>

<h1>Audio Visualizer</h1>

<div class="container">
	<div class="visualization-section">
		<Oscilloscope />
	</div>
	
	<div class="visualization-section">
		<FrequencySpectrum />
	</div>
	
	<div class="standalone-controls">
		<PlayPauseControls />
	</div>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 1rem;
	}
	
	h1 {
		text-align: center;
		margin-bottom: 2rem;
	}
	
	.visualization-section {
		margin-bottom: 2rem;
	}
	
	.standalone-controls {
		margin-top: 2rem;
		padding: 1rem;
		border-top: 1px solid #ccc;
		text-align: center;
	}
	
	h2 {
		font-size: 1.2rem;
		margin-bottom: 1rem;
		color: #555;
		text-align: center;
	}
</style>