<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { spectrum, isPlaying } from '$lib/audio/engine';
  import VisualizerCanvas from './base/VisualizerCanvas.svelte';
  import { visualizerTheme } from '$lib/theme';
  
  // Props
  const { 
    fullHeight = false,
    debug = false // Add debug option
  } = $props();
  
  // Canvas and drawing state
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(0);
  let height = $state(0);
  let scale = $state(1); // Scale factor from parent
  let animationId: number;
  let isCanvasReady = $state(false);
  
  // Bar styling
  const barColor = visualizerTheme.visualizations.spectrum || '#00ff00';
  const barWidth = 2;
  const barGap = 1;
  
  // Draw the frequency spectrum
  function drawSpectrum() {
    if (!ctx || !isCanvasReady) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // If in debug mode, draw a colored background to show the extent of the canvas
    if (debug) {
      ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
      ctx.fillRect(0, 0, width, height);
      
      // Draw crosshair to show center
      ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
      ctx.beginPath();
      ctx.moveTo(0, height/2);
      ctx.lineTo(width, height/2);
      ctx.moveTo(width/2, 0);
      ctx.lineTo(width/2, height);
      ctx.stroke();
      
      // Draw text showing dimensions
      ctx.fillStyle = 'blue';
      ctx.font = '10px monospace';
      ctx.fillText(`Spectrum: ${width}x${height} (scale: ${scale.toFixed(2)})`, 5, 15);
    }
    
    // Get the current spectrum data
    const spectrumData = $spectrum;
    if (!spectrumData || spectrumData.length === 0) {
      if (debug) {
        ctx.fillStyle = 'blue';
        ctx.font = '12px sans-serif';
        ctx.fillText('No spectrum data', width / 2 - 60, height / 2);
      }
      return;
    }
    
    // Setup fill style
    ctx.fillStyle = barColor;
    
    // Calculate bar width and spacing
    const barCount = Math.min(spectrumData.length, Math.floor(width / 3)); // Limit to available width
    const barWidth = Math.max(1, Math.floor(width / barCount) - 1);
    const barSpacing = 1;
    const totalBarWidth = barWidth + barSpacing;
    
    // Draw each bar
    for (let i = 0; i < barCount; i++) {
      // Get the frequency value (0-255)
      const value = spectrumData[i];
      
      // Calculate bar height (scale to fit canvas height)
      // The scale factor helps ensure the bars don't overflow
      const barHeight = (value / 255) * height * 0.9 * scale;
      
      // Calculate position
      const x = i * totalBarWidth;
      const y = height - barHeight;
      
      // Draw the bar
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }
  
  // Start the animation loop
  function startAnimation() {
    if (animationId) cancelAnimationFrame(animationId);
    
    function animate() {
      drawSpectrum();
      animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
  }
  
  // Handle canvas resize
  function handleResize(event: CustomEvent) {
    console.log("Spectrum: Resize", event.detail);
    width = event.detail.width;
    height = event.detail.height;
    scale = event.detail.scale || 1;
    
    // Redraw with new dimensions
    drawSpectrum();
  }
  
  // Handle canvas ready
  function handleCanvasReady(event: CustomEvent) {
    console.log("Spectrum: Canvas ready", event.detail);
    canvas = event.detail.canvas;
    ctx = event.detail.ctx;
    width = event.detail.width;
    height = event.detail.height;
    scale = event.detail.scale || 1;
    isCanvasReady = true;
    
    // Start animation once canvas is ready
    startAnimation();
  }
  
  // Clean up on destroy
  onDestroy(() => {
    if (browser && animationId) {
      cancelAnimationFrame(animationId);
    }
  });
</script>

<VisualizerCanvas
  on:ready={handleCanvasReady}
  on:resize={handleResize}
  fullHeight={fullHeight}
  scaleToFit={true}
  id="frequency-spectrum"
>
  
</VisualizerCanvas> 