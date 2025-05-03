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
	export let showZeroIndicator = true;

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

	// Calculate rotation based on value
	$: valueRange = max - min;
	$: normalized = (value - min) / valueRange;
	$: rotation = startRotation + normalized * rotRange;

	// Utility function to keep values in range
	function clamp(num: number, min: number, max: number) {
		return Math.max(min, Math.min(num, max));
	}

	// Event handlers for pointer interactions
	function pointerMove(event: PointerEvent) {
		if (!dragging) return;

		event.preventDefault();
		event.stopPropagation();

		// Calculate sensitivity based on value range and adjust for drag distance
		const sensitivity = valueRange / pixelRange;
		const delta = (startY - event.clientY) * sensitivity;
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
			class="knob {dragging ? 'dragging' : ''}"
			style="--rotation: {rotation}; --primary-color: {theme.primary};"
			on:pointerdown={pointerDown}
			bind:this={knobElement}
			data-label={label}
		>
			<!-- Indicator line that extends from center to edge -->
			<div class="indicator"></div>

			<!-- Center dot for the knob -->
			<div class="center-dot"></div>

			<!-- Zero indicator shown when value is close to zero -->
			{#if showZeroIndicator && Math.abs(value) < 0.1}
				<div class="zero-indicator"></div>
			{/if}
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
		touch-action: none;
	}

	.knob {
		position: relative;
		width: 60px;
		height: 60px;
		border-radius: 50%;
		border: 1.5px solid var(--primary-color);
		transform: rotate(calc(var(--rotation) * 1rad));
		transform-origin: 50% 50%;
		cursor: ns-resize;
		display: flex;
		align-items: center;
		justify-content: center;
		touch-action: none;
	}

	.knob.dragging {
		border-width: 2px;
		opacity: 1;
		box-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
	}

	.indicator {
		position: absolute;
		width: 1.5px;
		height: 20px;
		background-color: var(--primary-color);
		transform-origin: bottom center;
		bottom: 50%;
		margin-bottom: 10px;
	}

	.center-dot {
		position: absolute;
		width: 4px;
		height: 4px;
		background-color: var(--primary-color);
		border-radius: 50%;
	}

	.zero-indicator {
		position: absolute;
		width: 8px;
		height: 8px;
		border: 1.5px solid var(--primary-color);
		border-radius: 50%;
		background: transparent;
	}

	.value-display {
		margin-top: 4px;
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
			min-width: 45px;
		}

		.knob-wrapper {
			width: 50px;
		}

		.knob {
			width: 45px;
			height: 45px;
			border-width: 1.2px;
		}

		.indicator {
			width: 1.2px;
			height: 15px;
			margin-bottom: 8px;
		}

		.center-dot {
			width: 3px;
			height: 3px;
		}

		.zero-indicator {
			width: 6px;
			height: 6px;
			border-width: 1.2px;
		}
	}

	/* Small devices */
	@media (max-width: 640px) {
		.knob-group {
			min-width: 50px;
		}

		.label {
			font-size: 0.7rem;
		}
	}
</style>
