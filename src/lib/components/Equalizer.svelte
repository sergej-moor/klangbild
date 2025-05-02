<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { theme } from '$lib/theme';
  
  // Define interface for equalizer values
  export interface EqualizerValues {
    low: number;
    mid: number;
    high: number;
  }
  
  // Initial values (centered at 0)
  let low = 0;
  let mid = 0;
  let high = 0;
  
  // Range limits
  const MIN_VALUE = -12;
  const MAX_VALUE = 12;
  const STEP = 0.5;
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    change: EqualizerValues;
  }>();
  
  // Handle value changes and dispatch event
  function handleChange(): void {
    dispatch('change', { low, mid, high });
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
        bind:value={low} 
        on:input={handleChange}
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
        bind:value={mid} 
        on:input={handleChange}
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
        bind:value={high} 
        on:input={handleChange}
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
