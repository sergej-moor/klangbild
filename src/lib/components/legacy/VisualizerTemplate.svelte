<script lang="ts">
	import VisualizerCanvas from '../visualizer/VisualizerCanvas.svelte';
	import { visualizerTheme } from '$lib/theme';

	// References to base component values
	let visualizer: VisualizerCanvas;
	let ctx: CanvasRenderingContext2D;

	// Replace with your data source
	import { waveform } from '$lib/audio/engine';

	// Customize these parameters for your visualizer
	const mainColor = visualizerTheme.visualizations.waveform;

	// Your main drawing function - customize for your visualization type
	function draw(data: Float32Array) {
		// Get latest context and dimensions
		ctx = visualizer.getContext();
		const { width, height } = visualizer.getDimensions();

		if (!ctx) return;

		// Clear the canvas
		visualizer.clearCanvas();

		// Your visualization drawing code here
		ctx.fillStyle = mainColor;
		ctx.fillRect(0, 0, width * Math.random(), height * Math.random());
	}

	// Update visualization when data changes or canvas is resized
	$effect(() => {
		if (ctx) {
			draw($waveform);
		}
	});

	function handleReady(event: CustomEvent) {
		ctx = event.detail.ctx;
	}
</script>

<VisualizerCanvas
	bind:this={visualizer}
	on:ready={handleReady}
	on:resize={() => draw($waveform)}
	id="your-visualizer-id"
>
	<div class="text-center text-sm opacity-70">Your Visualizer Name</div>
</VisualizerCanvas>
