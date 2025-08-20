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
	export let numTicks = 9; // Changed back to 9 tick marks
	export let snapStrength = 0.3; // How strong the "lock in" effect is (0-1)
	export let snapThreshold = 0.8; // Size of the snap zone (in value units)
	export let defaultValue: number | null = null; // The value to snap to (null means center of range)

	// Rotation constants - correctly removing the bottom part of circle
	export let rotRange = 2 * Math.PI * 0.75; // 270 degrees of rotation 
	export let startRotation = Math.PI * 0.75; // 135 degrees (bottom left)
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

	// Calculate arc values for the SVG paths (for the outer and inner arcs)
	$: endRotation = startRotation + rotRange;
	$: ringRadius = 24; // Size of the ring
	$: strokeWidth =  5; // Thicker stroke for the ring
	$: indicatorRadius = 24; // Position indicator more inside the ring
	
	// Calculate SVG arc paths
	$: ringArcPath = createArcPath(0, 0, ringRadius, startRotation, endRotation);
	
	// Calculate position for the indicator circle along the arc
	$: indicatorAngle = rotation;
	$: indicatorX = Math.cos(indicatorAngle) * indicatorRadius;
	$: indicatorY = Math.sin(indicatorAngle) * indicatorRadius;

	// Calculate position for default value marker
	$: defaultNormalized = (actualDefaultValue - min) / valueRange;
	$: defaultRotation = startRotation + defaultNormalized * rotRange;
	$: defaultMarkerX = Math.cos(defaultRotation) * (ringRadius + 1);
	$: defaultMarkerY = Math.sin(defaultRotation) * (ringRadius + 1);

	// Function to create an SVG arc path
	function createArcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
		const startX = cx + r * Math.cos(startAngle);
		const startY = cy + r * Math.sin(startAngle);
		const endX = cx + r * Math.cos(endAngle);
		const endY = cy + r * Math.sin(endAngle);
		
		// Large arc flag is 0 if arc is less than 180 degrees, 1 if more
		const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;
		
		return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
	}

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

<div class="flex flex-col items-center min-w-[60px] select-none touch-none">
	<div class="relative flex flex-col items-center w-[70px] h-[70px] touch-none">
		<div
			class="absolute w-[54px] h-[54px] flex items-center justify-center z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize {dragging ? 'opacity-90' : ''}"
			onpointerdown={pointerDown}
			bind:this={knobElement}
			data-label={label}
		>
			<!-- SVG arcs for the knob -->
			<svg class="absolute inset-0 w-full h-full" viewBox="-30 -30 60 60">
				<!-- Ring arc -->
				<path 
					class="ring-arc" 
					d={ringArcPath} 
					stroke={theme.primary} 
					stroke-linecap="round"
					stroke-width={strokeWidth}
					fill="none" 
				/>
				
				<!-- Indicator circle that moves along the arc -->
				<circle 
					class="transition-[cx,cy] duration-50 ease-out"
					cx={indicatorX}
					cy={indicatorY}
					r="3"
					fill={theme.background}
					stroke={theme.primary}
					stroke-width="1"
				/>
				
				<!-- Value text in the center -->
				<text 
					x="0" 
					y="0" 
					text-anchor="middle" 
					dominant-baseline="middle" 
					class="text-[10px] font-bold select-none"
					fill={theme.primary}
				>
					{value.toFixed(1)}
				</text>
			</svg>
		</div>
		
		<!-- Replace ticks element with single default marker -->
		<svg class="absolute w-[70px] h-[70px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" viewBox="-30 -30 60 60">
			<circle 
				cx={defaultMarkerX}
				cy={defaultMarkerY}
				r="2"
				fill={theme.primary}
			/>
		</svg>
		
		<div class="value-display hidden" title="{value.toFixed(1)} {unit}">
			<span class="value-text">
				{#if unit}
					{value.toFixed(1)} {unit}
				{:else}
					{value.toFixed(1)}
				{/if}
			</span>
		</div>
		
		<!-- Moved label inside the knob wrapper and positioned it closer to the knob -->
		{#if label}
			<span class="absolute bottom-[-4px] text-xs font-medium text-center w-full">{label}</span>
		{/if}
	</div>
</div>

<style>
	.touch-none {
		touch-action: none;
	}
	
	.ring-arc {
		transition: stroke-width 0.1s ease-in-out;
	}
</style>
