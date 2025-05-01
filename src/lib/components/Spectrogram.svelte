<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { spectrum, isPlaying } from '$lib/audio/engine';
  import VisualizerCanvas from './base/VisualizerCanvas.svelte';
  
  // Props
  const { 
    fullHeight = false
  } = $props();
  
  // Canvas and context
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(0);
  let height = $state(0);
  let spectrogramData: Uint8Array[] = [];
  let isCanvasReady = $state(false);
  
  // Animation frame ID for continuous updates
  let animationId: number;
  
  // Number of history frames to keep
  const historyLength = 200;
  
  // Color gradient for intensity representation
  function getColor(value: number): string {
    // Convert value (0-255) to hue (240-0)
    // Low values (quiet) are blue, high values (loud) are red
    const hue = 240 - (value / 255) * 240;
    return `hsl(${hue}, 100%, ${10 + (value / 255) * 50}%)`;
  }
  
  // Function to draw the spectrogram
  function drawSpectrogram() {
    if (!ctx || !isCanvasReady || spectrogramData.length === 0) return;
    
    // Calculate column width based on canvas width and history length
    const columnWidth = Math.max(1, Math.ceil(width / historyLength));
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw each spectrum sample as a vertical line of colored pixels
    for (let i = 0; i < spectrogramData.length; i++) {
      const x = width - (spectrogramData.length - i) * columnWidth;
      
      if (x < 0) continue; // Skip if outside canvas
      
      const spectrum = spectrogramData[i];
      
      // Calculate how many frequency bins to display
      // Typically we don't show all frequencies because higher ones have less perceptual value
      const binCount = Math.min(spectrum.length, Math.floor(height));
      const binHeight = height / binCount;
      
      // Draw each frequency bin with a color representing its intensity
      for (let j = 0; j < binCount; j++) {
        // Get the intensity for this frequency bin (0-255)
        const intensity = spectrum[j];
        
        // Calculate y-position (invert to have low frequencies at bottom)
        const y = height - (j + 1) * binHeight;
        
        // Set color based on intensity
        ctx.fillStyle = getColor(intensity);
        
        // Draw a rectangle for this frequency bin
        ctx.fillRect(x, y, columnWidth, binHeight + 0.5); // Slight overlap to avoid gaps
      }
    }
  }
  
  // Start the visualization animation
  function startAnimation() {
    if (animationId) cancelAnimationFrame(animationId);
    
    function animate() {
      // Add the latest spectrum data
      if ($spectrum && $spectrum.length > 0) {
        // Log occasionally to verify we're getting data
        if (Math.random() < 0.01) {
          console.log("Spectrogram data sample:", $spectrum[0], $spectrum[100], $spectrum[200]);
        }
        
        // Make a copy of the current spectrum
        const currentSpectrum = new Uint8Array($spectrum);
        
        // Add to history
        spectrogramData.push(currentSpectrum);
        
        // Limit history length
        if (spectrogramData.length > historyLength) {
          spectrogramData.shift();
        }
        
        // Draw the updated spectrogram
        drawSpectrogram();
      } else {
        // Debug if we're not getting spectrum data
        if (Math.random() < 0.01) {
          console.log("No spectrum data available");
        }
      }
      
      // Continue animation
      animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
  }
  
  // Handle canvas ready event
  function handleCanvasReady(event: CustomEvent) {
    canvas = event.detail.canvas;
    ctx = event.detail.ctx;
    isCanvasReady = true;
    
    // Start animation
    startAnimation();
  }
  
  // Handle resize event
  function handleResize(event: CustomEvent) {
    width = event.detail.width;
    height = event.detail.height;
    
    // Redraw on resize
    drawSpectrogram();
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
/>

<style>
  /* Any spectrogram-specific styles can go here */
</style> 