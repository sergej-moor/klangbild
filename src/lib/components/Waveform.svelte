<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { fullWaveform, loadAudio, playbackPosition, isPlaying, seekToPosition } from '$lib/audio/engine';
  import { visualizerTheme, sizes } from '$lib/theme';
  
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
  const bgColor = visualizerTheme.background.primary;
  const waveformColor = visualizerTheme.visualizations.waveform || '#6366f1'; // Unplayed portion
  const progressColor = visualizerTheme.visualizations.progress || '#f43f5e'; // Played portion
  const barWidth = 2; // Width of each bar
  const barGap = 1;   // Gap between bars
  
  // Handle resize for responsiveness
  function handleResize() {
    if (!browser || !canvas || !ctx) return;
    
    const container = canvas.parentElement;
    if (container) {
      width = container.clientWidth;
      height = Math.min(sizes.defaultHeight, container.clientWidth / 2);
      
      // Update canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Redraw if data is available
      if ($fullWaveform && $fullWaveform.length > 0) {
        drawWaveform($fullWaveform, progress);
      }
    }
  }
  
  // Clear the canvas
  function clearCanvas() {
    if (!ctx) return;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }
  
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
  
  // Handle click on the waveform to seek
  function handleWaveformClick(event: MouseEvent) {
    if (!isReady || !canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
    // Calculate the click position relative to the canvas
    const x = event.clientX - rect.left;
    
    // Convert to a position between 0 and 1
    const position = x / rect.width;
    
    // Seek to this position
    seekToPosition(position);
  }
  
  function drawWaveform(data: Float32Array, currentProgress: number) {
    if (!ctx || !canvas) return;
    
    // Clear the canvas
    clearCanvas();
    
    // Calculate how many bars we can fit
    const totalBarWidth = barWidth + barGap;
    const numBars = Math.min(Math.floor(width / totalBarWidth), data.length);
    
    // Calculate scaling and sampling
    const verticalScale = height * 0.4; // 40% of height (above and below center)
    const step = Math.ceil(data.length / numBars);
    
    // Calculate the bar index at which the progress marker should appear
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
    
    // Mark as ready
    isReady = true;
    
    // Load audio data
    await loadAudio();
    
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

<div class="w-full max-w-[800px] mx-auto flex flex-col gap-2" id="full-waveform">
  <div class="w-full rounded-md overflow-hidden shadow-md">
    <canvas bind:this={canvas} width={width} height={height} class="block w-full h-full"></canvas>
  </div>
  <div class="text-sm opacity-70 text-center">
     ({Math.round(progress * 100)}%) 
  
  </div>
</div> 