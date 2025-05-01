<script lang="ts">
  import { isPlaying, togglePlayPause } from '$lib/audio/engine';
</script>

<div class="controls">
  <button class="control-button" on:click={togglePlayPause}>
    {$isPlaying ? 'Pause' : 'Play'}
  </button>
</div>

<style>
  .controls {
    display: flex;
    justify-content: center;
    margin-top: 0.5rem;
  }
  
  .control-button {
    background-color: #2a2a2a;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .control-button:hover {
    background-color: #3a3a3a;
  }
  
  .control-button:active {
    background-color: #4a4a4a;
  }
</style> 