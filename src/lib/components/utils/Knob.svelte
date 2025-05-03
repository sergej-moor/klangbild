<script lang="ts">
	import { browser } from '$app/environment';
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { theme } from '$lib/theme';

	// Props
	export let value = 0;
	export let min = -12;
	export let max = 12;
	export let label = '';
	export let unit = 'dB';
	export let showZeroIndicator = false;
	export let numTicks = 9; // Changed back to 9 tick marks
	export let snapStrength = 0.3; // How strong the "lock in" effect is (0-1)
	export let snapThreshold = 0.8; // Size of the snap zone (in value units)
	export let defaultValue: number | null = null; // The value to snap to (null means center of range)

	// Rotation constants - modified to start at top left diagonal
	export let rotRange = 2 * Math.PI * 0.75; // 270 degrees of rotation
	export let startRotation = (-3 * Math.PI) / 4; // -135 degrees (45 degrees left of top)
	export let pixelRange = 150;

	const dispatch = createEventDispatcher<{ change: number }>();

	// Variables for tracking interaction
	let startY: number;
	let startValue: number;
	let dragging = false;
	let knobElement: HTMLDivElement;
	
	// Calculate the default snap position based on props
	$: actualDefaultValue = defaultValue !== null ? defaultValue : 
		(min < 0 && max > 0) ? 0 : // If range crosses zero, default to zero
		(min >= 0) ? min : // If all positive, default to min
		max; // If all negative, default to max

	// Calculate rotation based on value
	$: valueRange = max - min;
	$: normalized = (value - min) / valueRange;
	$: rotation = startRotation + normalized * rotRange;
	
	// Is the value in the "snap zone"
	$: isInSnapZone = Math.abs(value - actualDefaultValue) < snapThreshold;

	// Generate tick marks based on the rotation range
	$: ticks = Array.from({ length: numTicks }, (_, i) => {
		const tickNormalized = i / (numTicks - 1); // 0 to 1
		const tickRotation = startRotation + tickNormalized * rotRange;
		return tickRotation;
	});

	// Utility function to keep values in range
	function clamp(num: number, min: number, max: number) {
		return Math.max(min, Math.min(num, max));
	}

	// Event handlers for pointer interactions
	function pointerMove(event: PointerEvent) {
		if (!dragging) return;

		event.preventDefault();
		event.stopPropagation();

		// Calculate basic drag delta
		const sensitivity = valueRange / pixelRange;
		const rawDelta = (startY - event.clientY) * sensitivity;
		
		// Apply the snapping effect
		let delta = rawDelta;
		
		// If we're close to defaultValue and moving away from it, add resistance
		if (Math.abs(value - actualDefaultValue) < snapThreshold) {
			// Direction we're moving
			const movingAwayFromDefault = 
				(value < actualDefaultValue && delta < 0) || 
				(value > actualDefaultValue && delta > 0);
			
			// If moving away from default, reduce the delta (add resistance)
			if (movingAwayFromDefault) {
				delta = rawDelta * (1 - snapStrength);
			}
		}
		
		// If we're outside the snap zone but new value would be inside it,
		// make it easier to snap back to default
		const newValueBeforeSnap = startValue + delta;
		if (Math.abs(newValueBeforeSnap - actualDefaultValue) < snapThreshold &&
			Math.abs(value - actualDefaultValue) >= snapThreshold) {
			// Snap to default more strongly
			delta = actualDefaultValue - startValue;
		}
		
		// Apply the adjusted delta
		const newValue = clamp(startValue + delta, min, max);

		// Only dispatch if value actually changed
		if (newValue !== value) {
			value = newValue;
			dispatch('change', value);
		}
	}

	function pointerDown(event: PointerEvent) {
		// Stop propagation to prevent other knobs or elements from being affected
		event.stopPropagation();
		event.preventDefault();

		dragging = true;
		startY = event.clientY;
		startValue = value;

		// Set pointer capture to ensure events go to this element even if mouse moves outside
		knobElement.setPointerCapture(event.pointerId);

		// Add event listeners only in browser context
		if (browser) {
			window.addEventListener('pointermove', pointerMove, { passive: false });
			window.addEventListener('pointerup', pointerUp);
			// Prevent text selection during dragging
			window.addEventListener('selectstart', preventDefault);
		}
	}

	function pointerUp(event: PointerEvent) {
		if (!dragging) return;

		if (event) {
			event.stopPropagation();

			// Release pointer capture
			if (knobElement && event.pointerId) {
				try {
					knobElement.releasePointerCapture(event.pointerId);
				} catch (e) {
					// Ignore errors if pointer was already released
				}
			}
		}

		dragging = false;

		if (browser) {
			window.removeEventListener('pointermove', pointerMove);
			window.removeEventListener('pointerup', pointerUp);
			window.removeEventListener('selectstart', preventDefault);
		}
		
		// Final snap to default if very close
		if (Math.abs(value - actualDefaultValue) < snapThreshold * 0.5) {
			value = actualDefaultValue;
			dispatch('change', value);
		}
	}

	function preventDefault(e: Event) {
		e.preventDefault();
	}

	// Clean up event listeners on component destroy
	onDestroy(() => {
		if (browser) {
			window.removeEventListener('pointermove', pointerMove);
			window.removeEventListener('pointerup', pointerUp);
			window.removeEventListener('selectstart', preventDefault);
		}
	});
</script>

<div class="knob-group">
	{#if label}
		<span class="label">{label}</span>
	{/if}

	<div class="knob-wrapper">
		<div
			class="knob {dragging ? 'dragging' : ''} {isInSnapZone ? 'in-snap-zone' : ''}"
			style="transform: translate(-50%, -50%) rotate({rotation}rad); border-color: {theme.primary};"
			on:pointerdown={pointerDown}
			bind:this={knobElement}
			data-label={label}
		>
			<!-- Inner ring -->
			<div class="inner-ring" style="border-color: {theme.primary};"></div>
			
			<!-- Circle indicator near the edge -->
			<div class="indicator-circle" style="background-color: {theme.primary};"></div>
		</div>
		
		<!-- Separate ticks element outside the knob -->
		<div class="outer-ticks">
			{#each ticks as tickRotation, i}
				<div 
					class="tick" 
					style="transform: rotate({tickRotation}rad); background-color: {theme.primary};"
					class:tick-zero={i === Math.floor(numTicks / 2) && numTicks % 2 !== 0}>
				</div>
			{/each}
		</div>
		
		<div class="value-display" title="{value.toFixed(1)} {unit}">
			<span class="value-text">
				{#if unit}
					{value.toFixed(1)} {unit}
				{:else}
					{value.toFixed(1)}
				{/if}
			</span>
		</div>
	</div>
</div>

<style>
	.knob-group {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 60px;
		user-select: none;
		-webkit-user-select: none;
		touch-action: none;
	}

	.label {
		font-size: 0.75rem;
		font-weight: 500;
		margin-bottom: 0.15rem;
	}

	.knob-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 70px;
		height: 70px;
		position: relative;
		touch-action: none;
	}

	.knob {
		position: absolute;
		width: 54px;
		height: 54px;
		border-radius: 50%;
		background-color: transparent;
		border: 2px solid transparent; /* Color set via style attribute */
		transform-origin: 50% 50%;
		cursor: ns-resize;
		display: flex;
		align-items: center;
		justify-content: center;
		touch-action: none;
		z-index: 1;
		top: 50%;
		left: 50%;
		transition: border-width 0.1s ease-in-out;
	}
	
	.knob.in-snap-zone {
		border-width: 2.5px;
	}
	
	.inner-ring {
		position: absolute;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1.5px solid transparent; /* Color set via style attribute */
		background-color: transparent;
		transition: border-width 0.1s ease-in-out;
	}

	.knob.in-snap-zone .inner-ring {
		border-width: 2px;
	}

	.knob.dragging {
		opacity: 0.9;
	}

	.indicator-circle {
		position: absolute;
		width: 7px;
		height: 7px;
		background-color: transparent; /* Color set via style attribute */
		border-radius: 50%;
		top: 7%;
		transform: translateY(-50%);
	}
	
	.outer-ticks {
		position: absolute;
		width: 70px;
		height: 70px;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		pointer-events: none;
	}
	
	.tick {
		position: absolute;
		top: 0;
		left: 50%;
		margin-left: -1px;
		width: 2px;
		height: 5px;
		background-color: transparent; /* Color set via style attribute */
		transform-origin: 50% 35px;
	}

	.tick-zero {
		width: 2px;
		height: 5px;
		margin-left: -1px;
	}

	.value-display {
		position: absolute;
		bottom: -20px;
		font-size: 0.7rem;
		min-height: 1rem;
		text-align: center;
		opacity: 0.8;
	}

	.value-text {
		white-space: nowrap;
	}

	@media (max-width: 1024px) {
		.value-display {
			display: none;
		}
	}

	/* Medium-sized devices */
	@media (max-width: 796px) {
		.knob-group {
			min-width: 42px;
		}

		.knob-wrapper {
			width: 55px;
			height: 55px;
		}
		
		.outer-ticks {
			width: 55px;
			height: 55px;
		}
		
		.inner-ring {
			width: 24px;
			height: 24px;
			border-width: 1px;
		}
		
		.knob.in-snap-zone .inner-ring {
			border-width: 1.5px;
		}

		.tick {
			width: 2px;
			height: 4px;
			margin-left: -1px;
			transform-origin: 50% 27.5px;
		}

		.tick-zero {
			width: 2px;
			height: 4px;
			margin-left: -1px;
		}

		.knob {
			width: 40px;
			height: 40px;
			border-width: 1.5px;
		}
		
		.knob.in-snap-zone {
			border-width: 2px;
		}

		.indicator-circle {
			width: 5px;
			height: 5px;
		}
	}

	/* Small devices */
	@media (max-width: 640px) {
		.knob-group {
			min-width: 45px;
		}

		.label {
			font-size: 0.7rem;
		}
	}
</style>
