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
  
  // Reset all equalizer values to 0
  function resetEqualizer() {
    low = 0;
    mid = 0;
    high = 0;
    
    // Apply changes to audio processing
    adjustEqualizer('low', 0);
    adjustEqualizer('mid', 0);
    adjustEqualizer('high', 0);
    
    // Dispatch event for other components
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
  <div class="sliders">
    <div class="slider-group">
      <span class="label">Low</span>
      <div class="slider-container">
        <input 
          type="range" 
          min={MIN_VALUE} 
          max={MAX_VALUE} 
          step={STEP}
          value={low}
          on:input={handleLowChange}
          style="--track-color: {theme.primary};"
          class="vertical-slider"
        />
      </div>
      <span class="value">{low.toFixed(1)} dB</span>
    </div>
    
    <div class="slider-group">
      <span class="label">Mid</span>
      <div class="slider-container">
        <input 
          type="range" 
          min={MIN_VALUE} 
          max={MAX_VALUE} 
          step={STEP}
          value={mid}
          on:input={handleMidChange}
          style="--track-color: {theme.primary};"
          class="vertical-slider"
        />
      </div>
      <span class="value">{mid.toFixed(1)} dB</span>
    </div>
    
    <div class="slider-group">
      <span class="label">High</span>
      <div class="slider-container">
        <input 
          type="range" 
          min={MIN_VALUE} 
          max={MAX_VALUE} 
          step={STEP}
          value={high}
          on:input={handleHighChange}
          style="--track-color: {theme.primary};"
          class="vertical-slider"
        />
      </div>
      <span class="value">{high.toFixed(1)} dB</span>
    </div>
  </div>
  
  <div class="eq-footer">
    <button 
      class="reset-button" 
      on:click={resetEqualizer}
      style="--btn-color: {theme.primary};"
      title="Reset EQ"
    >
      Reset
    </button>
  </div>
</div>

<style>
  .equalizer {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
  }
  
  .sliders {
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    margin: auto 0;
    padding: 1rem 0;
  }
  
  .eq-footer {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: auto;
  }
  
  .reset-button {
    background: transparent;
    color: var(--btn-color);
    border: 1px solid var(--btn-color);
    border-radius: 4px;
    padding: 0.25rem 0;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    max-width: calc(3 * 24px + 2 * 0.5rem); /* Width of 3 sliders plus gaps */
  }
  
  .reset-button:hover {
    background: var(--btn-color);
    color: white;
  }
  
  .slider-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    gap: 0.25rem;
    padding: 0 0.25rem;
  }
  
  .slider-container {
    position: relative;
    height: 160px;
    width: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .vertical-slider {
    -webkit-appearance: none;
    width: 160px;
    height: 6px;
    border-radius: 3px;
    background: #33333333;
    outline: none;
    margin: 0;
    transform: rotate(-90deg);
    transform-origin: center;
    position: absolute;
  }
  
  .vertical-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--track-color);
    cursor: pointer;
    margin-top: -5px; /* Center the thumb vertically */
  }
  
  .vertical-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--track-color);
    cursor: pointer;
    border: none;
  }
  
  /* Simple solid color track instead of gradient */
  .vertical-slider::-webkit-slider-runnable-track {
    background: #33333333;
    height: 6px;
    border-radius: 3px;
  }
  
  .vertical-slider::-moz-range-track {
    background: #33333333;
    height: 6px;
    border-radius: 3px;
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
</style>
