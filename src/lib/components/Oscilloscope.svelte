<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { waveform, isPlaying } from '$lib/audio/engine';
  import VisualizerCanvas from './base/VisualizerCanvas.svelte';
  import { theme } from '$lib/theme';
  
  // Props
  const { 
    fullHeight = false,
    debug = false
  } = $props();
  
  // Canvas and context
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(0);
  let height = $state(0);
  let scale = $state(1);
  let animationId: number;
  let isCanvasReady = $state(false);
  
  // Theme colors
  const lineColor = theme.primary;
  const lineWidth = 1; // Simplified from theme reference
  const debugColor = theme.energy.high;
  
  // Draw the oscilloscope waveform
  function drawOscilloscope() {
    if (!ctx || !isCanvasReady) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // If in debug mode, draw debug info
    if (debug) {
      ctx.fillStyle = `${debugColor}20`; // Using alpha for transparency
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
      ctx.fillText(`Oscilloscope: ${width}x${height} (scale: ${scale.toFixed(2)})`, 5, 15);
    }
    
    // Get the current waveform data
    let waveformData = $waveform;
    if (!waveformData || waveformData.length === 0) {
      if (debug) {
        ctx.fillStyle = debugColor;
        ctx.font = '12px sans-serif';
        ctx.fillText('No waveform data', width / 2 - 60, height / 2);
      }
      return;
    }
    
    // Downsample the waveform data to simulate a smaller FFT size (1024)
    // This makes the oscilloscope more responsive and focused
    const targetSize = 1024;
    if (waveformData.length > targetSize) {
      const downsampled = new Float32Array(targetSize);
      const step = Math.floor(waveformData.length / targetSize);
      
      for (let i = 0; i < targetSize; i++) {
        downsampled[i] = waveformData[i * step];
      }
      
      waveformData = downsampled;
    }
    
    // Setup line style
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Begin path
    ctx.beginPath();
    
    // Calculate the center line and amplitude scaling
    const centerY = height / 2;
    
    // Auto-scale amplitude based on available height and current scale factor
    const scaleFactor = (height * 0.8) / 2 * scale;
    
    // Always stretch the waveform to fill the entire canvas width
    // by adjusting the step size based on the available data points
    const step = waveformData.length / width;
    
    // Plot each point in the waveform
    for (let i = 0; i < width; i++) {
      // Calculate the data index for this x position
      const dataIndex = Math.min(waveformData.length - 1, Math.floor(i * step));
      
      // Get the waveform value (-1.0 to 1.0)
      const value = waveformData[dataIndex];
      
      // Calculate y position (invert and scale)
      const y = centerY - (value * scaleFactor);
      
      // Plot the point
      if (i === 0) {
        ctx.moveTo(i, y);
      } else {
        ctx.lineTo(i, y);
      }
    }
    
    // Draw the line
    ctx.stroke();
  }
  
  // Start the visualization animation
  function startAnimation() {
    if (animationId) cancelAnimationFrame(animationId);
    
    function animate() {
      drawOscilloscope();
      animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
  }
  
  // Handle canvas ready event
  function handleCanvasReady(event: CustomEvent) {
    console.log("Oscilloscope: Canvas ready", event.detail);
    canvas = event.detail.canvas;
    ctx = event.detail.ctx;
    width = event.detail.width;
    height = event.detail.height;
    scale = event.detail.scale || 1;
    isCanvasReady = true;
    
    // Start animation
    startAnimation();
  }
  
  // Handle resize event
  function handleResize(event: CustomEvent) {
    console.log("Oscilloscope: Resize", event.detail);
    width = event.detail.width;
    height = event.detail.height;
    scale = event.detail.scale || 1;
    
    // Redraw on resize
    drawOscilloscope();
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
  id="oscilloscope"
/>
