<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { theme } from '$lib/theme';
  import { onMount } from 'svelte';
  import Knob from './Knob.svelte';
  import { setVolume, getVolume } from '$lib/audio/index';
  
  // Local state for volume value
  let volume = 100;
  
  // Range limits
  const MIN_VALUE = 0;
  const MAX_VALUE = 100;
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    change: number;
  }>();
  
  // Handle knob value change
  function handleVolumeChange(value: number) {
    volume = value;
    setVolume(volume / 100); // Normalize to 0-1 range for audio API
    dispatch('change', volume);
  }
  
  // Initialize when mounted
  onMount(() => {
    // Get current volume from audio system
    const currentVol = getVolume();
    volume = currentVol * 100; // Convert from 0-1 to 0-100 range
  });
</script>

<div class="volume-control h-full flex items-center justify-center">
  <Knob 
    bind:value={volume}
    min={MIN_VALUE}
    max={MAX_VALUE}
    label="Volume"
    unit="%"
    showZeroIndicator={false}
    on:change={() => handleVolumeChange(volume)}
  />
</div>

<style>
  .volume-control {
    width: 100%;
  }
</style> 