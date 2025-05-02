<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { theme } from '$lib/theme';
  import { adjustEqualizer, eqSettings } from '$lib/audio/index';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  
  // Define interface for equalizer values
  export interface EqualizerValues {
    low: number;
    mid: number;
    high: number;
  }
  
  // Local state for sliders
  let low = $eqSettings.low;
  let mid = $eqSettings.mid;
  let high = $eqSettings.high;
  
  // Range limits
  const MIN_VALUE = -12;
  const MAX_VALUE = 12;
  const STEP = 0.5;
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    change: EqualizerValues;
  }>();
  
  // Handle the slider input events directly
  function handleLowChange(e) {
    low = parseFloat(e.target.value);
    adjustEqualizer('low', low);
    dispatch('change', { low, mid, high });
  }
  
  function handleMidChange(e) {
    mid = parseFloat(e.target.value);
    adjustEqualizer('mid', mid);
    dispatch('change', { low, mid, high });
  }
  
  function handleHighChange(e) {
    high = parseFloat(e.target.value);
    adjustEqualizer('high', high);
    dispatch('change', { low, mid, high });
  }
  
  // Initialize when mounted (browser-only)
  onMount(() => {
    // Initial sync with the store
    low = $eqSettings.low;
    mid = $eqSettings.mid;
    high = $eqSettings.high;
  });
  
  // Sync with store - only run in browser and only when not actively dragging
  $: if (browser) {
    const isSliderActive = browser && 
      document.activeElement && 
      document.activeElement.matches('input[type="range"]');
    
    if (!isSliderActive) {
      low = $eqSettings.low;
      mid = $eqSettings.mid;
      high = $eqSettings.high;
    }
  }
</script>

<div class="equalizer">
  <h3 class="title">Equalizer</h3>
  
  <div class="sliders">
    <div class="slider-group">
      <span class="label">Low</span>
      <input 
        type="range" 
        min={MIN_VALUE} 
        max={MAX_VALUE} 
        step={STEP}
        value={low}
        on:input={handleLowChange}
        style="--track-color: {theme.primary};"
      />
      <span class="value">{low.toFixed(1)} dB</span>
    </div>
    
    <div class="slider-group">
      <span class="label">Mid</span>
      <input 
        type="range" 
        min={MIN_VALUE} 
        max={MAX_VALUE} 
        step={STEP}
        value={mid}
        on:input={handleMidChange}
        style="--track-color: {theme.primary};"
      />
      <span class="value">{mid.toFixed(1)} dB</span>
    </div>
    
    <div class="slider-group">
      <span class="label">High</span>
      <input 
        type="range" 
        min={MIN_VALUE} 
        max={MAX_VALUE} 
        step={STEP}
        value={high}
        on:input={handleHighChange}
        style="--track-color: {theme.primary};"
      />
      <span class="value">{high.toFixed(1)} dB</span>
    </div>
  </div>
</div>

<style>
  .equalizer {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  
  .title {
    font-size: 1.2rem;
    margin-bottom: 1rem;
    text-align: center;
  }
  
  .sliders {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .slider-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }
  
  .label {
    font-size: 0.9rem;
    font-weight: 500;
  }
  
  .value {
    font-size: 0.8rem;
    width: 3.5rem;
    text-align: center;
  }
  
  input[type="range"] {
    -webkit-appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #33333333;
    outline: none;
    margin: 0.5rem 0;
  }
  
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--track-color);
    cursor: pointer;
    margin-top: -5px; /* Center the thumb vertically */
  }
  
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--track-color);
    cursor: pointer;
    border: none;
  }
  
  /* Simple solid color track instead of gradient */
  input[type="range"]::-webkit-slider-runnable-track {
    background: #33333333;
    height: 6px;
    border-radius: 3px;
  }
  
  input[type="range"]::-moz-range-track {
    background: #33333333;
    height: 6px;
    border-radius: 3px;
  }
</style>
