<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import BaseVisualizer from './BaseVisualizer.svelte';
	import type { HoverableVisualizer } from '$lib/audio/visualizer';

	// Props that all hoverable visualizers should support
	const {
		id = 'hoverable-visualizer-' + Math.random().toString(36).substring(2, 9),
		draw = null // Accept the draw function from child component
	} = $props();

	// Mouse tracking state that all hoverable visualizers need
	let mouseX = $state(-1);
	let mouseY = $state(-1);
	let isHovering = $state(false);

	// Event dispatcher for child components
	const dispatch = createEventDispatcher();

	// Handle ready event from BaseVisualizer
	function handleReady(event: CustomEvent) {
		// Forward the ready event
		dispatch('ready', event.detail);
	}

	// Handle resize event from BaseVisualizer
	function handleResize(event: CustomEvent) {
		// Forward the resize event
		dispatch('resize', event.detail);
	}

	// Handle mouse events from BaseVisualizer
	function handleMouseMove(event: CustomEvent) {
		mouseX = event.detail.x;
		mouseY = event.detail.y;
		isHovering = true;

		// Forward the mousemove event with the tracked state
		dispatch('mousemove', {
			...event.detail,
			mouseX,
			mouseY,
			isHovering
		});
	}

	function handleMouseLeave(event: CustomEvent) {
		isHovering = false;

		// Forward the mouseleave event
		dispatch('mouseleave', {
			...event.detail,
			isHovering
		});
	}

	function handleMouseEnter(event: CustomEvent) {
		// Forward the mouseenter event
		dispatch('mouseenter', event.detail);
	}

	function handleClick(event: CustomEvent) {
		// Forward the click event
		dispatch('click', event.detail);
	}
</script>

<BaseVisualizer
	on:ready={handleReady}
	on:resize={handleResize}
	on:mousemove={handleMouseMove}
	on:mouseleave={handleMouseLeave}
	on:mouseenter={handleMouseEnter}
	on:click={handleClick}
	{draw}
	{id}
/> 