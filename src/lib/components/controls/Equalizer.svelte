<script context="module" lang="ts">
  // Define interface for equalizer values
  export interface EqualizerValues {
    low: number;
    mid: number;
    high: number;
  }
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { theme } from '$lib/theme';
  import { adjustEqualizer, eqSettings } from '$lib/audio/index';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import Knob from '$lib/components/utils/Knob.svelte';
  
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

<div class="w-full h-full flex flex-col items-center justify-center">
  <div class="knobs flex justify-evenly w-full px-2">
    <Knob 
      bind:value={low}
      min={MIN_VALUE}
      max={MAX_VALUE}
      label="Low"
      on:change={() => handleLowChange(low)}
    />
    
    <Knob 
      bind:value={mid}
      min={MIN_VALUE}
      max={MAX_VALUE}
      label="Mid"
      on:change={() => handleMidChange(mid)}
    />
    
    <Knob 
      bind:value={high}
      min={MIN_VALUE}
      max={MAX_VALUE}
      label="High"
      on:change={() => handleHighChange(high)}
    />
  </div>
</div>


