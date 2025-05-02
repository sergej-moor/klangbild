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

<div class="equalizer">
  <div class="knobs">
    <div class="knob-group">
      <span class="label">Low</span>
      <EqKnob 
        bind:value={low}
        min={MIN_VALUE}
        max={MAX_VALUE}
        primaryColor={theme.primary}
        on:change={() => handleLowChange(low)}
      />
    </div>
    
    <div class="knob-group">
      <span class="label">Mid</span>
      <EqKnob 
        bind:value={mid}
        min={MIN_VALUE}
        max={MAX_VALUE}
        primaryColor={theme.primary}
        on:change={() => handleMidChange(mid)}
      />
    </div>
    
    <div class="knob-group">
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
  
  .knobs {
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 1rem;
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
    max-width: 240px;
  }
  
  .reset-button:hover {
    background: var(--btn-color);
    color: white;
  }
  
  .knob-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  
  .label {
    font-size: 0.9rem;
    font-weight: 500;
  }
</style>
