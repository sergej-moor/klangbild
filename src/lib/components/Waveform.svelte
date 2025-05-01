<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fullWaveform, loadAudio, playbackPosition, isPlaying } from '$lib/audio/engine';
  import VisualizerCanvas from './base/VisualizerCanvas.svelte';
  import { visualizerTheme } from '$lib/theme';
  
  // References to base component values
  let visualizer: VisualizerCanvas;
  let ctx: CanvasRenderingContext2D;
  let width = $state(0);
  let height = $state(0);
  let isReady = $state(false);
  let progress = $state(0); // Track progress locally
  
  // Animation frame ID for continuous updates
  let animationId: number;
  
  // Styling parameters for bars
  const waveformColor = visualizerTheme.visualizations.waveform || '#6366f1'; // Unplayed portion
  const progressColor = visualizerTheme.visualizations.progress || '#f43f5e'; // Played portion
  const barWidth = 2; // Width of each bar
  const barGap = 1;   // Gap between bars
  
  // Setup continuous animation for progress updates
  function startProgressAnimation() {
    if (animationId) cancelAnimationFrame(animationId);
    
    function animate() {
      if (isReady && ctx && $fullWaveform?.length > 0) {
        // Always get the latest progress directly from the store
        progress = $playbackPosition;
        drawWaveform($fullWaveform, progress);
      }
      animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
  }
  
  // Ensure audio is loaded when component mounts
  onMount(async () => {
    await loadAudio();
    startProgressAnimation();
  });
  
  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
  });
  
  function drawWaveform(data: Float32Array, currentProgress: number) {
    if (!visualizer?.isInitialized || !ctx) {
      return;
    }
    
    // Get latest context and dimensions
    ctx = visualizer.getContext();
    const dims = visualizer.getDimensions();
    width = dims.width;
    height = dims.height;
    
    // Clear the canvas
    visualizer.clearCanvas();
    
    // Calculate how many bars we can fit
    const totalBarWidth = barWidth + barGap;
    const numBars = Math.min(Math.floor(width / totalBarWidth), data.length);
    
    // Calculate scaling and sampling
    const verticalScale = height * 0.4; // 40% of height (above and below center)
    const step = Math.ceil(data.length / numBars);
    
    // Calculate the bar index at which the progress marker should appear
    // Ensure it's properly calculated as an integer
    const progressBarIndex = Math.floor(numBars * currentProgress);
    
    // Draw the bars
    for (let i = 0; i < numBars; i++) {
      // Sample data (average or max of a segment if downsampling needed)
      const dataIndex = i * step;
      let value = 0;
      
      // Get max value for this segment
      const segmentEnd = Math.min(dataIndex + step, data.length);
      for (let j = dataIndex; j < segmentEnd; j++) {
        value = Math.max(value, data[j]);
      }
      
      // Calculate bar height based on value (0.0-1.0)
      const barHeight = Math.max(1, value * verticalScale); // Ensure at least 1px height
      
      // Calculate position
      const x = i * totalBarWidth;
      const centerY = height / 2;
      
      // Set color based on playback progress
      // Use a direct comparison for clarity
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
  
  function handleReady(event: CustomEvent) {
    ctx = event.detail.ctx;
    const { width: w, height: h } = visualizer.getDimensions();
    width = w;
    height = h;
    isReady = true;
    
    // Initial draw if data is available
    if ($fullWaveform && $fullWaveform.length > 0) {
      progress = $playbackPosition;
      drawWaveform($fullWaveform, progress);
    }
  }
  
  function handleResize() {
    if (isReady && $fullWaveform && $fullWaveform.length > 0) {
      drawWaveform($fullWaveform, progress);
    }
  }
</script>

<VisualizerCanvas 
  bind:this={visualizer} 
  on:ready={handleReady} 
  on:resize={handleResize}
  id="full-waveform"
>
  <div class="text-sm opacity-70 text-center">Full Track Waveform ({Math.round(progress * 100)}%)</div>
</VisualizerCanvas> 