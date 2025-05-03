<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { theme, sizes } from '$lib/theme';

	// Props
	const { scaleToFit = false, id = 'canvas-container' } = $props();

	// State
	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let width = 0;
	let height = 0;
	let deviceScale = 1; // For high DPI displays
	let uiScale = 1; // For UI scaling calculations
	let isReady = false;
	let resizeObserver: ResizeObserver | null = null;

	// Default height for the UI scale calculation
	const DEFAULT_HEIGHT = sizes?.defaultHeight || 300;

	// Create event dispatcher
	const dispatch = createEventDispatcher();

	// Initialize canvas and context
	function initCanvas() {
		if (!browser || !container) return;

		// Get container dimensions
		const rect = container.getBoundingClientRect();
		width = rect.width;
		height = rect.height;

		// Set canvas dimensions with high DPI support
		deviceScale = window.devicePixelRatio || 1;
		canvas.width = width * deviceScale;
		canvas.height = height * deviceScale;

		// Scale canvas display size with CSS
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;

		// Calculate UI scale relative to default height
		uiScale = height / DEFAULT_HEIGHT;

		// Get context
		ctx = canvas.getContext('2d');

		if (ctx) {
			// Scale the context for high DPI displays
			ctx.scale(deviceScale, deviceScale);

			// Dispatch ready event
			isReady = true;
			dispatch('ready', {
				canvas,
				ctx,
				width,
				height,
				scale: uiScale,
				deviceScale
			});
		}
	}

	// Handle container resize
	function handleResize() {
		if (!browser || !container || !ctx) return;

		// Get new dimensions
		const rect = container.getBoundingClientRect();
		width = rect.width;
		height = rect.height;

		// Recalculate UI scale
		uiScale = height / DEFAULT_HEIGHT;

		// Resize canvas
		canvas.width = width * deviceScale;
		canvas.height = height * deviceScale;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;

		// Reset context transform and re-apply high DPI scaling
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.scale(deviceScale, deviceScale);

		// Dispatch resize event
		dispatch('resize', {
			width,
			height,
			scale: uiScale,
			deviceScale
		});
	}

	// Window resize handler for better responsiveness
	function handleWindowResize() {
		if (isReady) {
			handleResize();
		}
	}

	// Setup on mount
	onMount(() => {
		if (browser && container) {
			// Initialize canvas
			initCanvas();

			// Setup resize observer for the container
			resizeObserver = new ResizeObserver(handleResize);
			resizeObserver.observe(container);

			// Also listen to window resize for better update frequency
			window.addEventListener('resize', handleWindowResize);
		}

		return () => {
			// Clean up
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
			window.removeEventListener('resize', handleWindowResize);
		};
	});

	// Exported functions and properties
	export function getDimensions() {
		if (!uiScale) {
			console.warn(`${id} - getDimensions called before initialization`);
			return { width: 0, height: 0 };
		}
		return { width, height };
	}
</script>

<div class="relative h-full w-full overflow-hidden" bind:this={container} {id}>
	<canvas bind:this={canvas} class="absolute top-0 left-0 h-full w-full"></canvas>
	<slot />
</div>
