<script lang="ts">
  import { browser } from '$app/environment';
  import { createEventDispatcher, onDestroy } from 'svelte';
  
  // Props
  export let value = 0;
  export let min = -12;
  export let max = 12;
  export let label = '';
  export let primaryColor = '#ffffff';
  
  // Rotation constants - modified to start at top left diagonal
  export let rotRange = 2 * Math.PI * 0.75; // 270 degrees of rotation
  export let startRotation = -3 * Math.PI / 4; // -135 degrees (45 degrees left of top)
  export let pixelRange = 150;
  
  const dispatch = createEventDispatcher<{ change: number }>();
  
  // Variables for tracking interaction
  let startY: number;
  let startValue: number;
  let dragging = false;
  
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
    
    const delta = (startY - event.clientY) / pixelRange * valueRange;
    const newValue = clamp(startValue + delta, min, max);
    
    // Only dispatch if value actually changed
    if (newValue !== value) {
      value = newValue;
      dispatch('change', value);
    }
  }
  
  function pointerDown(event: PointerEvent) {
    dragging = true;
    startY = event.clientY;
    startValue = value;
    
    // Add event listeners only in browser context
    if (browser) {
      window.addEventListener('pointermove', pointerMove);
      window.addEventListener('pointerup', pointerUp);
      // Prevent text selection during dragging
      window.addEventListener('selectstart', preventDefault);
    }
  }
  
  function pointerUp() {
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

<div class="knob-wrapper">
  <div 
    class="knob {dragging ? 'dragging' : ''}" 
    style="--rotation: {rotation}; --primary-color: {primaryColor};"
    on:pointerdown={pointerDown}
  >
    <!-- Indicator line that extends from center to edge -->
    <div class="indicator"></div>
    
    <!-- Center dot for the knob -->
    <div class="center-dot"></div>
    
    <!-- Zero indicator shown when value is close to zero -->
    {#if Math.abs(value) < 0.1}
      <div class="zero-indicator"></div>
    {/if}
  </div>
  <div class="value-display">
    {value.toFixed(1)} dB
  </div>
</div>

<style>
  .knob-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 70px;
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
  }
  
  .knob.dragging {
    border-width: 2px;
  }
  
  .indicator {
    position: absolute;
    width: 1.5px;
    height: 20px; /* Reduced from 30px */
    background-color: var(--primary-color);
    transform-origin: bottom center;
    bottom: 50%; /* Position to start from the center */
    margin-bottom: 10px; /* Push away from center by 10px */
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
    margin-top: 8px;
    font-size: 0.8rem;
    min-height: 1rem;
    text-align: center;
  }
</style> 