<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { spectrum, isPlaying, sampleRate } from '$lib/audio/engine';
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
  
  // Frequency scaling
  const freqScalingPower = 3.0; // Controls logarithmic curve (higher = more emphasis on low frequencies)
  const minFreqPercent = 0.001; // Start from very low frequencies
  
  // Draw the frequency spectrum
  function drawSpectrum() {
    if (!ctx || !isCanvasReady) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
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
    ctx.lineWidth = visualizerTheme.visualizations.waveform.lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = peakColor;
    
    // Begin the path for the line
    ctx.beginPath();
    
    // Create points for the line
    for (let i = 0; i < width; i++) {
      const xPercent = i / width;
      
      // Use scaling power variable for frequency distribution
      const logPos = minFreqPercent + (1 - minFreqPercent) * 
                    Math.pow(xPercent, freqScalingPower);
      
      // Calculate exact position in the data array (with decimal part)
      const exactIndex = logPos * spectrumData.length;
      
      // Get integer part and fractional part for interpolation
      const indexLow = Math.floor(exactIndex);
      const indexHigh = Math.min(spectrumData.length - 1, indexLow + 1);
      const fraction = exactIndex - indexLow;
      
      // Linear interpolation between two adjacent data points for smoother curve
      const valueLow = spectrumData[indexLow];
      const valueHigh = spectrumData[indexHigh];
      const interpolatedValue = valueLow + fraction * (valueHigh - valueLow);
      
      // Calculate y position (scale to fit canvas height)
      const y = height - (interpolatedValue / 255) * height * 0.9 * scale;
      
      // Draw the point
      if (i === 0) {
        ctx.moveTo(i, y);
      } else {
        ctx.lineTo(i, y);
      }
    }
    
    // Stroke the line
    ctx.stroke();
    
    // Fill area under the line with amplitude-based gradient
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    
    // Create gradient based on theme colors
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    
    // Use primary color at the top (high amplitudes)
    gradient.addColorStop(0, visualizerTheme.colors.primary);
    
    // Use secondary color in the middle for smooth transition
    gradient.addColorStop(0.5, `${visualizerTheme.colors.primary}90`); 
    
    // Use lowIntensity color at the bottom (low amplitudes)
    gradient.addColorStop(1, visualizerTheme.visualizations.spectrogram.lowIntensity);
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
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
      
      // Use imported sample rate instead of hardcoded value
      const actualSampleRate = $sampleRate || 44100; // Fallback to 44100 if not available
      const nyquist = actualSampleRate / 2;
      const freqMarkers = [20, 100, 500, 1000, 5000, 10000, 20000]; // Hz
      
      ctx.fillStyle = debugColor;
      ctx.font = '9px monospace';
      
      freqMarkers.forEach(freq => {
        // Convert frequency to position
        const freqPercent = freq / nyquist;
        
        // Ensure frequency percent is at least minFreqPercent to avoid negative values
        const adjustedFreqPercent = Math.max(freqPercent, minFreqPercent);
        
        // Apply inverse using the same scaling power variable
        // For frequencies below minFreqPercent, we'll just position them at the beginning
        let xPercent;
        if (freqPercent < minFreqPercent) {
          // For frequencies below our minimum, place them proportionally at the start
          xPercent = (freqPercent / minFreqPercent) * 0.02; // First 2% of the display
        } else {
          xPercent = Math.pow(
            (adjustedFreqPercent - minFreqPercent) / (1 - minFreqPercent),
            1 / freqScalingPower
          );
        }
        
        const x = Math.floor(xPercent * width);
        
        if (x >= 0 && x < width) {
          // Draw marker and label
          ctx.fillRect(x, height - 30, 1, 10);
          ctx.fillText(freq >= 1000 ? `${freq/1000}k` : `${freq}`, x - 8, height - 15);
        }
      });
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