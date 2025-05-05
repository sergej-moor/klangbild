<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { isPlaying } from '$lib/audio/stores';
	import { theme } from '$lib/theme';
	import { debugMode } from '$lib/stores/debug';
	import VisualizerCanvas from './VisualizerCanvas.svelte';

	// Props that all visualizers should support
	const {
		id = 'visualizer-' + Math.random().toString(36).substring(2, 9),
		title = '', // Title to display for the visualizer
		titlePosition = 'top', // 'top', 'bottom', 'left', or 'right'
		draw = null // Accept the draw function from child component
	} = $props();

	// Shared state for all visualizers
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let width = $state(0);
	let height = $state(0);
	let scale = $state(1);
	let deviceScale = $state(1);
	let animationId: number;
	let isCanvasReady = $state(false);

	// Standard theme colors for consistency
	const debugColor = theme.primary;
	
	// Get theme colors directly
	const titleBgColor = theme.primary;
	const titleTextColor = theme.background;

	// Event dispatcher for child component events
	const dispatch = createEventDispatcher();

	// Helper to determine if title should be vertical
	const isVertical = titlePosition === 'left' || titlePosition === 'right';

	// Default draw function if none is provided
	function defaultDraw() {
		// Base implementation just clears the canvas
		if (!ctx || !isCanvasReady) return;
		ctx.clearRect(0, 0, width, height);

		// Draw debug info if enabled
		if ($debugMode) {
			drawDebugInfo();
		}
	}

	// Standard debug info rendering
	function drawDebugInfo() {
		if (!ctx) return;

		// Semi-transparent overlay
		ctx.fillStyle = `${debugColor}20`;
		ctx.fillRect(0, 0, width, height);

		// Draw crosshair to show center
		ctx.strokeStyle = `${debugColor}80`;
		ctx.beginPath();
		ctx.moveTo(0, height / 2);
		ctx.lineTo(width, height / 2);
		ctx.moveTo(width / 2, 0);
		ctx.lineTo(width / 2, height);
		ctx.stroke();

		// Draw text showing dimensions
		ctx.fillStyle = debugColor;
		ctx.font = '10px monospace';
		ctx.fillText(`${id}: ${width}x${height} (scale: ${scale.toFixed(2)})`, 5, 15);
	}

	// Standard animation function
	function startAnimation() {
		if (animationId) cancelAnimationFrame(animationId);

		function animate() {
			// Run the provided draw function, or fall back to the default
			if (typeof draw === 'function') {
				draw();
			} else {
				defaultDraw();
			}

			// Draw debug info if enabled (after component's drawing)
			if ($debugMode) {
				drawDebugInfo();
			}

			animationId = requestAnimationFrame(animate);
		}

		animationId = requestAnimationFrame(animate);
	}

	// Handle canvas resize event
	function handleResize(event: CustomEvent) {
		width = event.detail.width;
		height = event.detail.height;
		scale = event.detail.scale || 1;
		deviceScale = event.detail.deviceScale || 1;

		// Forward event to child components
		dispatch('resize', {
			width,
			height,
			scale,
			deviceScale,
			ctx,
			canvas
		});

		// Redraw on resize
		if (typeof draw === 'function') {
			draw();
		} else {
			defaultDraw();
		}

		// Draw debug info if enabled
		if ($debugMode) {
			drawDebugInfo();
		}
	}

	// Handle canvas ready event
	function handleCanvasReady(event: CustomEvent) {
		canvas = event.detail.canvas;
		ctx = event.detail.ctx;
		width = event.detail.width;
		height = event.detail.height;
		scale = event.detail.scale || 1;
		deviceScale = event.detail.deviceScale || 1;
		isCanvasReady = true;

		// Forward ready event to child components
		dispatch('ready', {
			ctx,
			canvas,
			width,
			height,
			scale,
			deviceScale
		});

		// Start animation if playing
		if ($isPlaying) {
			startAnimation();
		} else {
			// Just draw once
			if (typeof draw === 'function') {
				draw();
			} else {
				defaultDraw();
			}

			// Draw debug info if enabled
			if ($debugMode) {
				drawDebugInfo();
			}
		}
	}
	
	// Forward mouse events from canvas
	function handleMouseMove(event: CustomEvent) {
		dispatch('mousemove', event.detail);
		// Draw on mouse move for immediate update
		if (typeof draw === 'function' && isCanvasReady) {
			draw();
		}
	}
	
	function handleMouseLeave(event: CustomEvent) {
		dispatch('mouseleave', event.detail);
		// Redraw on mouse leave to clear any hover effects
		if (typeof draw === 'function' && isCanvasReady) {
			draw();
		}
	}
	
	function handleMouseEnter(event: CustomEvent) {
		dispatch('mouseenter', event.detail);
	}
	
	function handleClick(event: CustomEvent) {
		dispatch('click', event.detail);
	}

	// Watch isPlaying state to start/stop animation
	$effect(() => {
		if (!isCanvasReady) return;

		if ($isPlaying) {
			startAnimation();
		} else if (animationId) {
			// When stopping playback, don't immediately cancel animation
			// Instead, let it run for a few more frames to properly reset visualizations
			
			// Store current animation ID to cancel it after delay
			const currentAnimId = animationId;
			
			// After a short delay (200ms should be enough for ~12 frames @ 60fps)
			setTimeout(() => {
				// Only cancel if this is still the current animation
				if (animationId === currentAnimId) {
					cancelAnimationFrame(animationId);
					animationId = 0;
					
					// Force a final redraw to ensure proper reset state
					if (typeof draw === 'function') {
						draw();
					} else {
						defaultDraw();
					}
					
					// Draw debug info if enabled
					if ($debugMode) {
						drawDebugInfo();
					}
				}
			}, 200);
		}
	});

	// Clean up on destroy
	onDestroy(() => {
		if (browser && animationId) {
			cancelAnimationFrame(animationId);
		}
	});
</script>

<!-- Use horizontal or vertical layout based on title position -->
{#if isVertical}
	<!-- Vertical layout with title on left or right -->
	<div class="flex flex-row w-full h-full">
		{#if titlePosition === 'left' && title}
			<div 
				class="writing-mode-vertical-lr flex items-center justify-center px-1 text-center text-xs sm:text-sm" 
				style="background-color: {titleBgColor}; color: {titleTextColor}; writing-mode: vertical-lr;"
			>
				{title}
			</div>
		{/if}
		
		<div class="flex-1 relative">
			<VisualizerCanvas 
				on:ready={handleCanvasReady} 
				on:resize={handleResize} 
				on:mousemove={handleMouseMove}
				on:mouseleave={handleMouseLeave}
				on:mouseenter={handleMouseEnter}
				on:click={handleClick}
				scaleToFit={true} 
				{id}
			/>
		</div>
		
		{#if titlePosition === 'right' && title}
			<div 
				class="writing-mode-vertical-rl flex items-center justify-center px-1 text-center text-xs sm:text-sm" 
				style="background-color: {titleBgColor}; color: {titleTextColor}; writing-mode: vertical-rl;"
			>
				{title}
			</div>
		{/if}
	</div>
{:else}
	<!-- Horizontal layout with title on top or bottom -->
	<div class="flex flex-col w-full h-full">
		{#if titlePosition === 'top' && title}
			<div 
				class="w-full text-center text-xs sm:text-sm py-1" 
				style="background-color: {titleBgColor}; color: {titleTextColor};"
			>
				{title}
			</div>
		{/if}
		
		<div class="flex-1 relative">
			<VisualizerCanvas 
				on:ready={handleCanvasReady} 
				on:resize={handleResize} 
				on:mousemove={handleMouseMove}
				on:mouseleave={handleMouseLeave}
				on:mouseenter={handleMouseEnter}
				on:click={handleClick}
				scaleToFit={true} 
				{id}
			/>
		</div>
		
		{#if titlePosition === 'bottom' && title}
			<div 
				class="w-full text-center text-xs sm:text-sm py-1" 
				style="background-color: {titleBgColor}; color: {titleTextColor};"
			>
				{title}
			</div>
		{/if}
	</div>
{/if}
