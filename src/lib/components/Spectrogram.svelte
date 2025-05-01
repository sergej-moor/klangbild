<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { spectrum, isPlaying } from '$lib/audio/engine';
  import VisualizerCanvas from './base/VisualizerCanvas.svelte';
  
  // Props
  const { 
    fullHeight = false,
    debug = false // Add debug option
  } = $props();
  
  // Canvas and context
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(0);
  let height = $state(0);
  let spectrogramData: Uint8Array[] = [];
  let isCanvasReady = $state(false);
  let scale = $state(1); // Add scale factor
  
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
    if (!ctx || !isCanvasReady) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // Background fill
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw the spectrogram data if available
    if (spectrogramData.length > 0) {
      // Draw each spectrum sample as a vertical line of colored pixels
      for (let i = 0; i < spectrogramData.length; i++) {
        const x = width - (spectrogramData.length - i) * Math.max(1, Math.ceil(width / historyLength));
        
        if (x < 0) continue; // Skip if outside canvas
        
        const spectrum = spectrogramData[i];
        
        // Calculate how many frequency bins to display
        // Adjust based on available height and scale
        const maxBins = Math.floor(spectrum.length * Math.min(1, scale));
        const binCount = Math.min(maxBins, Math.floor(height));
        const binHeight = height / binCount;
        
        // Draw each frequency bin with a color representing its intensity
        for (let j = 0; j < binCount; j++) {
          // Calculate the spectrum index based on scale
          const spectrumIndex = Math.floor(j * (spectrum.length / binCount));
          
          // Get the intensity for this frequency bin (0-255)
          const intensity = spectrum[spectrumIndex];
          
          // Calculate y-position (invert to have low frequencies at bottom)
          const y = height - (j + 1) * binHeight;
          
          // Set color based on intensity
          ctx.fillStyle = getColor(intensity);
          
          // Draw a rectangle for this frequency bin
          ctx.fillRect(x, y, Math.max(1, Math.ceil(width / historyLength)), binHeight + 0.5);
        }
      }
    }
    
    // Draw debug information AFTER everything else so it's on top
    if (debug) {
      // Semi-transparent border to show canvas boundaries
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, width, height);
      
      // Black background for text to ensure visibility
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, 200, 20);
      
      // Draw dimensions text
      ctx.fillStyle = 'rgba(0, 255, 0, 1)';
      ctx.font = '10px monospace';
      ctx.fillText(`Spectrogram: ${width}x${height} (scale: ${scale.toFixed(2)})`, 5, 15);
      
      // If no data, show a message
      if (spectrogramData.length === 0) {
        // Background for the message
        const noDataMsg = 'No spectrogram data';
        const textMetrics = ctx.measureText(noDataMsg);
        const msgWidth = textMetrics.width + 20;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(width/2 - msgWidth/2, height/2 - 10, msgWidth, 20);
        
        // Text message
        ctx.fillStyle = 'rgba(0, 255, 0, 1)';
        ctx.font = '12px sans-serif';
        ctx.fillText(noDataMsg, width/2 - textMetrics.width/2, height/2 + 5);
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
    width = event.detail.width;
    height = event.detail.height;
    scale = event.detail.scale; // Get scale factor
    isCanvasReady = true;
    
    // Start animation
    startAnimation();
  }
  
  // Handle resize event
  function handleResize(event: CustomEvent) {
    width = event.detail.width;
    height = event.detail.height;
    scale = event.detail.scale; // Get scale factor
    
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
  scaleToFit={true}
  id="spectrogram"
/>

<style>
  /* Any spectrogram-specific styles can go here */
</style> 