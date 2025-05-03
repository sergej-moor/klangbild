<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { theme } from '$lib/theme';
  import { onMount } from 'svelte';
  import Knob from './Knob.svelte';
  import { setVolume, getVolume } from '$lib/audio/index';
  
  // Local state for volume value (initialize to 100)
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
    // Set initial volume to 100% before reading from audio system
    setVolume(1);
    
    // Try to get current volume from audio system
    try {
      const currentVol = getVolume();
      // Only update if we get a valid value (between 0-1)
      if (currentVol !== undefined && currentVol !== null && 
          !isNaN(currentVol) && currentVol >= 0 && currentVol <= 1) {
        volume = Math.round(currentVol * 100); // Convert from 0-1 to 0-100 range
      } else {
        // Fallback to 100% if value is invalid
        volume = 100;
      }
    } catch (error) {
      // Fallback to 100% if there's an error
      volume = 100;
    }
    
    // Ensure volume is set correctly in the audio system
    setVolume(volume / 100);
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