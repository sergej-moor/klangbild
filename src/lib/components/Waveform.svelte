<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { audioBuffer, playbackPosition, isPlaying } from '$lib/audio/stores';
  import { seekToPosition } from '$lib/audio/controls';
  import { theme, sizes } from '$lib/theme';
  
  // Props
  const { 
    compactMode = false 
  } = $props();
  
  // Canvas references and state
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(0);
  let height = $state(sizes.defaultHeight);
  let isReady = $state(false);
  let progress = $state(0); // Track progress locally
  
  // Animation frame ID for continuous updates
  let animationId: number;
  
  // Styling parameters for bars
  const bgColor = 'transparent';
  const waveformColor = theme.secondary;
  const progressColor = theme.primary;
  const barWidth = compactMode ? 1 : 2;
  const barGap = compactMode ? 0 : 1;
  
  // Store full waveform data (replacement for the store from engine.ts)
  let fullWaveform = $state<Float32Array | null>(null);
  
  // Handle resize for responsiveness
  function handleResize() {
    if (!browser || !canvas || !ctx) return;
    
    const container = canvas.parentElement;
    if (container) {
      width = container.clientWidth;
      
      if (compactMode) {
        height = 40;
      } else {
        height = Math.min(sizes.defaultHeight, container.clientWidth / 2);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      if (fullWaveform && fullWaveform.length > 0) {
        drawWaveform(fullWaveform, progress);
      }
    }
  }
  
  // Generate waveform data from audio buffer
  function generateWaveformData() {
    if (!$audioBuffer) return;
    
    // Use the first channel of audio data
    const rawData = $audioBuffer.getChannelData(0);
    const samples = rawData.length;
    
    // For very large buffers, downsample to improve performance
    const downsampleFactor = Math.max(1, Math.floor(samples / 10000));
    const downsampledLength = Math.floor(samples / downsampleFactor);
    const data = new Float32Array(downsampledLength);
    
    // Take peak of each downsampled section
    for (let i = 0; i < downsampledLength; i++) {
      const start = i * downsampleFactor;
      const end = Math.min(start + downsampleFactor, samples);
      let max = 0;
      
      for (let j = start; j < end; j++) {
        const absolute = Math.abs(rawData[j]);
        if (absolute > max) max = absolute;
      }
      
      data[i] = max;
    }
    
    fullWaveform = data;
  }
  
  // Clear the canvas
  function clearCanvas() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
  }
  
  // Setup continuous animation for progress updates
  function startProgressAnimation() {
    if (animationId) cancelAnimationFrame(animationId);
    
    function animate() {
      if (isReady && ctx && fullWaveform?.length > 0) {
        // Always get the latest progress directly from the store
        progress = $playbackPosition;
        drawWaveform(fullWaveform, progress);
      }
      animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
  }
  
  // Handle click on the waveform to seek
  function handleWaveformClick(event: MouseEvent) {
    if (!isReady || !canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
    // Calculate the click position relative to the canvas
    const x = event.clientX - rect.left;
    
    // Convert to a position between 0 and 1
    const position = x / rect.width;
    
    // Force seek regardless of playing state
    seekToPosition(position);
  }
  
  function drawWaveform(data: Float32Array, currentProgress: number) {
    if (!ctx || !canvas) return;
    
    // Clear the canvas
    clearCanvas();
    
    // Ensure we're using the entire data array
    if (!data || data.length === 0) return;
    
    // Calculate how many bars we can fit (use available width)
    const totalBarWidth = barWidth + barGap;
    const maxBars = Math.floor(width / totalBarWidth);
    
    // Calculate step size based on data length to ensure the entire waveform fits
    const step = data.length / maxBars;
    
    // Calculate the bar index at which the progress marker should appear
    const progressBarIndex = Math.floor(maxBars * currentProgress);
    
    // Calculate vertical scaling factor
    const verticalScale = height * (compactMode ? 0.6 : 0.4);
    
    // Draw the bars
    for (let i = 0; i < maxBars; i++) {
      // Get data index for this bar (ensuring we use the full data range)
      const startIdx = Math.floor(i * step);
      const endIdx = Math.min(Math.floor((i + 1) * step), data.length);
      
      // Find maximum amplitude in this segment
      let maxValue = 0;
      for (let j = startIdx; j < endIdx; j++) {
        maxValue = Math.max(maxValue, Math.abs(data[j]));
      }
      
      // Calculate bar height based on value
      const barHeight = Math.max(1, maxValue * verticalScale); // Ensure at least 1px height
      
      // Calculate position
      const x = i * totalBarWidth;
      const centerY = height / 2;
      
      // Set color based on playback progress
      if (i <= progressBarIndex) {
        ctx.fillStyle = progressColor;
      } else {
        ctx.fillStyle = waveformColor;
      }
      
      // Draw top bar (above center line)
      ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
      
      // Draw bottom bar (below center line, mirror of top)
      ctx.fillRect(x, centerY, barWidth, barHeight);
    }
  }
  
  // Watch for audio buffer changes to generate the waveform
  $effect(() => {
    if ($audioBuffer) {
      generateWaveformData();
    }
  });
  
  // Watch for playback position changes
  $effect(() => {
    progress = $playbackPosition;
  });
  
  // Lifecycle hooks
  onMount(async () => {
    if (!browser) return;
    
    // Initialize canvas context
    ctx = canvas.getContext('2d')!;
    
    // Set up resize listener
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Add click event listener to the canvas
    canvas.addEventListener('click', handleWaveformClick);
    
    // Generate waveform data if already loaded
    if ($audioBuffer) {
      generateWaveformData();
    }
    
    // Mark as ready
    isReady = true;
    
    // Start animation
    startProgressAnimation();
  });
  
  onDestroy(() => {
    if (!browser) return;
    
    // Clean up event listeners and animation
    window.removeEventListener('resize', handleResize);
    if (canvas) {
      canvas.removeEventListener('click', handleWaveformClick);
    }
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  });
</script>

<div class="waveform-container" >
  <div class="w-full h-full mx-auto flex flex-col {compactMode ? 'gap-0' : 'gap-2'}" id="full-waveform">
    <div class="w-full rounded-md overflow-hidden">
      <canvas bind:this={canvas} width={width} height={height} class="block w-full h-full"></canvas>
    </div>
  </div>
</div>

<style>
  .waveform-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    border-radius: 3px;
  }
  
  .waveform-container.compact-mode {
    height: 40px;
  }
  
  .waveform-canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: pointer;
  }
</style> 