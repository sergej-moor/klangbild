<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { isPlaying, togglePlayPause, playbackPosition, seekToPosition, getAudioDuration } from '$lib/audio/engine';
  import { theme } from '$lib/theme';
  
  // Props
  const { 
    songName = "Untitled"
  } = $props();
  
  // Component state
  let sliderValue = $state(0);
  let currentTime = $state(0);
  let totalDuration = $state(0);
  let isDragging = $state(false);
  let audioElement: HTMLAudioElement | null = null;
  
  // Format time as MM:SS
  function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Handle slider input
  function handleSeek(event: Event) {
    const newPosition = parseFloat((event.target as HTMLInputElement).value);
    sliderValue = newPosition;
    if (isDragging) {
      currentTime = newPosition * totalDuration;
    }
  }
  
  // Handle when slider is released
  function handleSeekComplete() {
    isDragging = false;
    seekToPosition(sliderValue);
  }
  
  // Handle when slider is pressed
  function handleSeekStart() {
    isDragging = true;
  }
  
  // Create a derived value for progress width to ensure reactivity
  const progressWidth = $derived(`${sliderValue * 100}%`);
  
  // Update component when playback position changes
  $effect(() => {
    if (!isDragging) {
      sliderValue = $playbackPosition;
      currentTime = totalDuration * $playbackPosition;
    }
  });
  
  // Update duration asynchronously
  async function updateDuration() {
    try {
      // Get duration and handle Promise
      const duration = await getAudioDuration();
      
      // Update state if we got a valid duration
      if (duration && duration > 0) {
        totalDuration = duration;
        
        // Update current time based on position
        if (!isDragging) {
          currentTime = totalDuration * $playbackPosition;
        }
        
        console.log("Updated duration:", totalDuration);
      }
    } catch (error) {
      console.error("Error getting audio duration:", error);
    }
  }
  
  // Function to get an audio element directly
  function getAudioElementDuration() {
    // Try to get the audio element
    const audio = document.querySelector('audio');
    if (audio && !isNaN(audio.duration) && audio.duration > 0) {
      totalDuration = audio.duration;
      console.log("Got duration directly from audio element:", totalDuration);
      return true;
    }
    return false;
  }
  
  onMount(() => {
    // Initial duration update
    updateDuration();
    
    // Also try to get duration directly from audio element as a fallback
    getAudioElementDuration();
    
    // Setup an interval to force UI updates
    const interval = setInterval(() => {
      // Try to get duration from the audio element first (most reliable)
      if (!getAudioElementDuration()) {
        // Fall back to the engine function if that fails
        updateDuration();
      }
      
      // Update position and time
      if ($isPlaying && !isDragging && totalDuration > 0) {
        sliderValue = $playbackPosition;
        currentTime = totalDuration * $playbackPosition;
      }
    }, 250);
    
    // Clean up on component destruction
    return () => clearInterval(interval);
  });
</script>

<div class="player-controls">
  <button 
    class="play-button" 
    on:click={togglePlayPause}
    aria-label={$isPlaying ? "Pause" : "Play"}
    style="border-color: {theme.primary}; color: {theme.primary};"
  >
    {#if $isPlaying}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="4" width="4" height="16" rx="1" fill={theme.primary}/>
        <rect x="14" y="4" width="4" height="16" rx="1" fill={theme.primary}/>
      </svg>
    {:else}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5.14V19.14C8 19.94 8.92 20.42 9.58 19.98L20.29 12.99C20.89 12.59 20.89 11.69 20.29 11.29L9.58 4.3C8.92 3.86 8 4.34 8 5.14Z" fill={theme.primary}/>
      </svg>
    {/if}
  </button>
  
  <div class="time" style="color: {theme.primary};">
    {formatTime(currentTime)} / {formatTime(totalDuration)}
  </div>
  
  <div class="progress-container">
    <input
      type="range"
      min="0"
      max="1"
      step="0.001"
      value={sliderValue}
      class="progress-slider"
      on:input={handleSeek}
      on:mousedown={handleSeekStart}
      on:mouseup={handleSeekComplete}
      on:touchstart={handleSeekStart}
      on:touchend={handleSeekComplete}
    />
    <div class="progress-bar" style="background-color: rgba(255, 255, 255, 0.2);">
      <div 
        class="progress-fill" 
        style="width: {progressWidth}; background-color: {theme.primary};"
      ></div>
    </div>
  </div>
  
  <div class="song-name" style="color: {theme.primary};">
    {songName}
  </div>
</div>

<style>
  .player-controls {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    
    padding: 12px;
    color: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  
  .time {
    font-size: 12px;
    white-space: nowrap;
    min-width: 90px;
  }
  
  .song-name {
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }
  
  .progress-container {
    flex: 1;
    position: relative;
    height: 16px;
    display: flex;
    align-items: center;
  }
  
  .progress-slider {
    position: absolute;
    width: 100%;
    height: 16px;
    opacity: 0;
    cursor: pointer;
    z-index: 10;
    margin: 0;
  }
  
  .progress-bar {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    overflow: hidden;
    position: relative;
  }
  
  .progress-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    border-radius: 2px;
    transition: width 0.1s;
  }
  
  .play-button {
    background: none;
    border: 1px solid;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    min-width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: background 0.2s;
  }
  
  .play-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .play-button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
  }
</style> 