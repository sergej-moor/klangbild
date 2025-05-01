<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { spectrum, isPlaying, sampleRate } from '$lib/audio/engine';
  import { theme } from '$lib/theme';
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
  
  // Theme colors - use energy colors for visualization
  const debugColor = theme.energy.high;
  
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
    
    // Calculate how many points to draw
    const pointCount = width;
    
    // Array to store the calculated y positions and amplitude values
    const points: {x: number, y: number, amplitude: number}[] = [];
    
    // Calculate all points first
    for (let i = 0; i < pointCount; i++) {
      const xPercent = i / pointCount;
      
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
      
      // Calculate normalized amplitude (0-1)
      const amplitude = interpolatedValue / 255;
      
      // Calculate y position (scale to fit canvas height)
      const y = height - amplitude * height * 0.9 * scale;
      
      // Store the point
      points.push({x: i, y, amplitude});
    }
    
    // First fill the area under the curve with energy-based coloring
    for (let i = 0; i < points.length; i++) {
      const {x, y, amplitude} = points[i];
      
      // Skip if we're at the right edge
      if (i >= points.length - 1) continue;
      
      // Get the next point
      const nextPoint = points[i + 1];
      
      // Calculate the width of this segment (usually 1 pixel)
      const segmentWidth = nextPoint.x - x;
      
      // Create gradient for this vertical slice based on amplitude
      // Use energy color gradient: low (blue) -> mid (yellow) -> high (red)
      let fillColor;
      const alpha = amplitude * 0.8 + 0.2; // Calculate alpha (0.2 to 1.0)
      
      if (amplitude < 0.3) {
        // Low energy - blend from background to low energy color
        const factor = amplitude / 0.3;
        fillColor = blendColors(theme.background, theme.energy.low, factor, alpha);
      } else if (amplitude < 0.7) {
        // Mid energy - blend from low to mid energy color
        const factor = (amplitude - 0.3) / 0.4;
        fillColor = blendColors(theme.energy.low, theme.energy.mid, factor, alpha);
      } else {
        // High energy - blend from mid to high energy color
        const factor = (amplitude - 0.7) / 0.3;
        fillColor = blendColors(theme.energy.mid, theme.energy.high, factor, alpha);
      }
      
      // Fill this vertical slice with the calculated color
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, segmentWidth, height - y);
    }
    
    // Now draw the line on top for crisp definition
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = theme.primary;
    
    ctx.beginPath();
    
    // Draw the line connecting all points
    for (let i = 0; i < points.length; i++) {
      const {x, y} = points[i];
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    // Stroke the line
    ctx.stroke();
    
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
  
  // Helper function to blend two hex colors with alpha
  function blendColors(color1: string, color2: string, factor: number, alpha = 1.0): string {
    // Parse the colors
    const c1 = parseColor(color1);
    const c2 = parseColor(color2);
    
    // Blend the RGB values
    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    
    // Return as RGBA string
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  // Helper to parse a hex color
  function parseColor(color: string): {r: number, g: number, b: number} {
    if (color.startsWith('#')) {
      const hex = color.substring(1);
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
      };
    }
    // Fallback for non-hex colors
    return {r: 0, g: 255, b: 0};
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