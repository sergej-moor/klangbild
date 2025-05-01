<script lang="ts">
  import { isPlaying, togglePlayPause, playbackPosition, seekToPosition, getAudioDuration } from '$lib/audio/engine';
  import { visualizerTheme } from '$lib/theme';
  import { onMount } from 'svelte';
  
  // Props
  const { 
    compact = false,
    songName = "" 
  } = $props();
  
  // State for the component - explicitly using $state for reactivity
  let duration = $state(0);
  let currentTime = $state(0);
  let sliderValue = $state(0);
  let isDragging = $state(false);
  
  // Format time as MM:SS
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Handle slider input
  function handleSeek(event) {
    const newPosition = parseFloat(event.target.value);
    sliderValue = newPosition;
    if (isDragging) {
      // Update display time while dragging
      currentTime = duration * newPosition;
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
    console.log("Effect running, position:", $playbackPosition);
    if (!isDragging) {
      sliderValue = $playbackPosition;
      currentTime = duration * $playbackPosition;
    }
  });
  
  onMount(async () => {
    // Get audio duration
    duration = await getAudioDuration();
    console.log("Track duration loaded:", duration);
    
    // Setup an interval to force UI updates (failsafe)
    const interval = setInterval(() => {
      if ($isPlaying && !isDragging) {
        sliderValue = $playbackPosition;
        currentTime = duration * $playbackPosition;
      }
    }, 250);
    
    return () => clearInterval(interval);
  });
</script>

<div class="player-controls {compact ? 'compact' : ''}">
  {#if compact}
    <!-- Compact horizontal layout -->
    <button 
      class="play-button"
      on:click={togglePlayPause}
      aria-label={$isPlaying ? 'Pause' : 'Play'}
    >
      {#if $isPlaying}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="4" width="4" height="16" rx="1" fill="#00ff00"/>
          <rect x="14" y="4" width="4" height="16" rx="1" fill="#00ff00"/>
        </svg>
      {:else}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 5.14V19.14C8 19.94 8.92 20.42 9.58 19.98L20.29 12.99C20.89 12.59 20.89 11.69 20.29 11.29L9.58 4.3C8.92 3.86 8 4.34 8 5.14Z" fill="#00ff00"/>
        </svg>
      {/if}
    </button>
    
    <div class="compact-progress">
      <div class="time">{formatTime(currentTime)} / {formatTime(duration)}</div>
      
      <div class="progress-container">
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.001" 
          value={sliderValue}
          on:input={handleSeek}
          on:mousedown={handleSeekStart} 
          on:mouseup={handleSeekComplete}
          on:touchstart={handleSeekStart}
          on:touchend={handleSeekComplete}
          class="progress-slider"
        />
        
        <div class="progress-bar">
          <div class="progress-fill" style="width: {progressWidth}"></div>
        </div>
      </div>
      
      <div class="song-name">{songName}</div>
    </div>
  {:else}
    <!-- Original vertical layout -->
    <div class="time-display">
      <span>{formatTime(currentTime)}</span>
      <span class="total-time">{formatTime(duration)}</span>
    </div>
    
    <div class="progress-container">
      <input 
        type="range" 
        min="0" 
        max="1" 
        step="0.001" 
        value={sliderValue}
        on:input={handleSeek}
        on:mousedown={handleSeekStart} 
        on:mouseup={handleSeekComplete}
        on:touchstart={handleSeekStart}
        on:touchend={handleSeekComplete}
        class="progress-slider"
      />
      
      <div class="progress-bar">
        <div class="progress-fill" style="width: {progressWidth}"></div>
      </div>
    </div>
    
    <button 
      class="play-button"
      on:click={togglePlayPause}
      aria-label={$isPlaying ? 'Pause' : 'Play'}
    >
      {#if $isPlaying}
        <!-- Pause icon -->
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="4" width="4" height="16" rx="1" fill="#00ff00"/>
          <rect x="14" y="4" width="4" height="16" rx="1" fill="#00ff00"/>
        </svg>
      {:else}
        <!-- Play icon -->
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 5.14V19.14C8 19.94 8.92 20.42 9.58 19.98L20.29 12.99C20.89 12.59 20.89 11.69 20.29 11.29L9.58 4.3C8.92 3.86 8 4.34 8 5.14Z" fill="#00ff00"/>
        </svg>
      {/if}
    </button>
  {/if}
</div>

<style>
  .player-controls {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 4px;
    color: #fff;
  }
  
  .player-controls.compact {
    flex-direction: row;
    align-items: center;
    padding: 4px 0;
    gap: 8px;
  }
  
  .compact-progress {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 8px;
  }
  
  .time {
    font-size: 10px;
    color: #00ff00;
    white-space: nowrap;
    min-width: 80px; /* Ensure time has minimum width */
  }
  
  .song-name {
    font-size: 10px;
    color: #00ff00;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }
  
  .time-display {
    width: 100%;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #00ff00;
    margin-bottom: 2px;
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
    background-color: #333;
    border-radius: 2px;
    overflow: hidden;
    position: relative; /* Ensure proper stacking */
  }
  
  .progress-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background-color: #00ff00;
    border-radius: 2px;
    transition: width 0.1s;
  }
  
  .play-button {
    background: none;
    border: 1px solid #00ff00;
    color: #00ff00;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    min-width: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: background 0.2s;
  }
  
  .compact .play-button {
    width: 24px;
    height: 24px;
    min-width: 24px;
  }
  
  .play-button:hover {
    background: rgba(0, 255, 0, 0.1);
  }
  
  .play-button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 255, 0, 0.5);
  }
</style> 