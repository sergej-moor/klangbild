<script lang="ts">
  import { theme } from '$lib/theme';
  import { createEventDispatcher } from 'svelte';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { volume, setVolume } from '$lib/audio/index';
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    change: number;
  }>();
  
  // Min/max values
  const MIN_VOLUME = 0;
  const MAX_VOLUME = 100;
  
  // Initialize volume from store
  let localVolume = $volume;
  
  // Handle volume change
  function handleVolumeChange(e) {
    const newVolume = parseFloat(e.target.value);
    // Update audio system volume
    setVolume(newVolume);
    // Dispatch event for other components
    dispatch('change', newVolume);
  }
  
  // Keep local value in sync with store
  $: localVolume = $volume;
</script>

<div class="volume-slider">
  <h3 class="title">Volume</h3>
  
  <div class="slider-container">
    <input 
      type="range" 
      min={MIN_VOLUME} 
      max={MAX_VOLUME} 
      step="1"
      value={localVolume}
      on:input={handleVolumeChange}
      style="--track-color: {theme.primary};"
      class="vertical-slider"
    />
  </div>
  <div class="value">{localVolume}%</div>
</div>

<style>
  .volume-slider {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
  }
  
  .title {
    font-size: 1rem;
    margin-bottom: 0.5rem;
    text-align: center;
  }
  
  .slider-container {
    position: relative;
    height: 160px;
    width: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 1;
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
  
  /* Simple solid color track */
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
  
  .value {
    font-size: 0.9rem;
    width: 3.5rem;
    text-align: center;
    margin-top: 0.5rem;
  }
</style> 