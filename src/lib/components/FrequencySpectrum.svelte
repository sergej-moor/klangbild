<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { spectrum, isPlaying } from '$lib/audio/engine';
  import { visualizerTheme } from '$lib/theme';
  import VisualizerCanvas from './base/VisualizerCanvas.svelte';
  
  // Props
  const { 
    fullHeight = false,
    debug = false
  } = $props();
  
  // Canvas and drawing state
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(0);
  let height = $state(0);
  let scale = $state(1);
  let animationId: number;
  let isCanvasReady = $state(false);
  
  // Theme colors
  const barColor = visualizerTheme.colors.primary;
  const peakColor = visualizerTheme.colors.secondary;
  const debugColor = visualizerTheme.colors.accent;
  
  // Bar styling
  const barWidth = 2;
  const barGap = 1;
  
  // Draw the frequency spectrum
  function drawSpectrum() {
    if (!ctx || !isCanvasReady) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // If in debug mode, draw debug info
    if (debug) {
      ctx.fillStyle = `${debugColor}20`;
      ctx.fillRect(0, 0, width, height);
      
      // Draw crosshair to show center
      ctx.strokeStyle = `${debugColor}80`;
      ctx.beginPath();
      ctx.moveTo(0, height/2);
      ctx.lineTo(width, height/2);
      ctx.moveTo(width/2, 0);
      ctx.lineTo(width/2, height);
      ctx.stroke();
      
      // Draw text showing dimensions
      ctx.fillStyle = debugColor;
      ctx.font = '10px monospace';
      ctx.fillText(`Spectrum: ${width}x${height} (scale: ${scale.toFixed(2)})`, 5, 15);
    }
    
    // Get the current spectrum data
    const spectrumData = $spectrum;
    if (!spectrumData || spectrumData.length === 0) {
      if (debug) {
        ctx.fillStyle = debugColor;
        ctx.font = '12px sans-serif';
        ctx.fillText('No spectrum data', width / 2 - 60, height / 2);
      }
      return;
    }
    
    // Setup line style
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = peakColor;
    
    // Begin the path for the line
    ctx.beginPath();
    
    // Create points for the line
    for (let i = 0; i < width; i++) {
      // Map canvas x position to spectrum data index
      const dataIndex = Math.floor((i / width) * spectrumData.length);
      
      // Get the frequency value (0-255)
      const value = spectrumData[dataIndex];
      
      // Calculate y position (scale to fit canvas height)
      const y = height - (value / 255) * height * 0.9 * scale;
      
      // Draw the point
      if (i === 0) {
        ctx.moveTo(i, y);
      } else {
        ctx.lineTo(i, y);
      }
    }
    
    // Stroke the line
    ctx.stroke();
    
    // Fill area under the line with gradient
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    
    // Create gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `${peakColor}80`); // Semi-transparent
    gradient.addColorStop(1, `${barColor}10`);  // Almost transparent
    
    ctx.fillStyle = gradient;
    ctx.fill();
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