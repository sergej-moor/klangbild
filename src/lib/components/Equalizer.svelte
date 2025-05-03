<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { theme } from '$lib/theme';
  import { adjustEqualizer, eqSettings } from '$lib/audio/index';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import EqKnob from './EqKnob.svelte';
  
  // Define interface for equalizer values
  export interface EqualizerValues {
    low: number;
    mid: number;
    high: number;
  }
  
  // Local state for EQ values
  let low = $eqSettings.low;
  let mid = $eqSettings.mid;
  let high = $eqSettings.high;
  
  // Range limits
  const MIN_VALUE = -12;
  const MAX_VALUE = 12;
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    change: EqualizerValues;
  }>();
  
  // Handle knob value changes
  function handleLowChange(value: number) {
    low = value;
    adjustEqualizer('low', low);
    dispatch('change', { low, mid, high });
  }
  
  function handleMidChange(value: number) {
    mid = value;
    adjustEqualizer('mid', mid);
    dispatch('change', { low, mid, high });
  }
  
  function handleHighChange(value: number) {
    high = value;
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
  
  // Sync with store when it changes (but not when actively changing a knob)
  $: if (browser && $eqSettings) {
    // Only update if we're not actively interacting with knobs
    if (document.activeElement?.tagName !== 'DIV' || 
        !document.activeElement?.classList.contains('knob')) {
      low = $eqSettings.low;
      mid = $eqSettings.mid;
      high = $eqSettings.high;
    }
  }
</script>

<div class="equalizer h-full flex flex-col">
  <div class="flex items-center justify-between mb-1">
    <h3 class="text-sm font-semibold ml-2">Equalizer</h3>
    <button 
      class="reset-button mr-2" 
      on:click={resetEqualizer}
      style="--btn-color: {theme.primary};"
      title="Reset EQ"
    >
      Reset
    </button>
  </div>
  
  <div class="knobs-container flex-1 flex justify-center items-center">
    <div class="knobs flex justify-evenly w-full px-4">
      <div class="knob-group flex flex-col items-center">
        <span class="label">Low</span>
        <EqKnob 
          bind:value={low}
          min={MIN_VALUE}
          max={MAX_VALUE}
          primaryColor={theme.primary}
          on:change={() => handleLowChange(low)}
        />
      </div>
      
      <div class="knob-group flex flex-col items-center">
        <span class="label">Mid</span>
        <EqKnob 
          bind:value={mid}
          min={MIN_VALUE}
          max={MAX_VALUE}
          primaryColor={theme.primary}
          on:change={() => handleMidChange(mid)}
        />
      </div>
      
      <div class="knob-group flex flex-col items-center">
        <span class="label">High</span>
        <EqKnob 
          bind:value={high}
          min={MIN_VALUE}
          max={MAX_VALUE}
          primaryColor={theme.primary}
          on:change={() => handleHighChange(high)}
        />
      </div>
    </div>
  </div>
</div>

<style>
  .equalizer {
    width: 100%;
  }
  
  .reset-button {
    background: transparent;
    color: var(--btn-color);
    border: 1px solid var(--btn-color);
    border-radius: 4px;
    padding: 0.15rem 0.5rem;
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .reset-button:hover {
    background: var(--btn-color);
    color: white;
  }
  
  .knob-group {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .label {
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
</style>
