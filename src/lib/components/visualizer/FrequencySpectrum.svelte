<script lang="ts">
  import { spectrum, sampleRate } from '$lib/audio/engine';
  import { theme } from '$lib/theme';
  import BaseVisualizer from './BaseVisualizer.svelte';
  import { blendColors, parseColor } from '$lib/utils/visualizerUtils';
  
  // Props
  const { 
    fullHeight = false,
    debug = false
  } = $props();
  
  // References to canvas context
  let ctx: CanvasRenderingContext2D;
  let width = 0;
  let height = 0;
  let scale = 1;
  
  // Frequency scaling
  const freqScalingPower = 3.0; // Controls logarithmic curve (higher = more emphasis on low frequencies)
  const minFreqPercent = 0.001; // Start from very low frequencies
  
  // Handle ready event from BaseVisualizer
  function handleReady(event) {
    ({ ctx, width, height, scale } = event.detail);
  }
  
  // Handle resize event from BaseVisualizer
  function handleResize(event) {
    ({ width, height, scale } = event.detail);
  }
  
  // Draw the frequency spectrum - this will be called by BaseVisualizer
  function drawSpectrum() {
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get the current spectrum data
    const spectrumData = $spectrum;
    if (!spectrumData || spectrumData.length === 0) {
      return;
    }
    
    // Calculate how many points to draw
    const pointCount = width;
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
    
    // First fill the area under the curve with simplified energy-based coloring
    for (let i = 0; i < points.length; i++) {
      const {x, y, amplitude} = points[i];
      
      // Skip if we're at the right edge
      if (i >= points.length - 1) continue;
      
      // Get the next point
      const nextPoint = points[i + 1];
      
      // Calculate the width of this segment (usually 1 pixel)
      const segmentWidth = nextPoint.x - x;
      
      // Simplify to a direct gradient from background to high energy (red)
      // Apply a non-linear curve to make the transition more dramatic
      const factor = Math.pow(amplitude, 1.5); // Use power curve to emphasize peaks
      const alpha = 0.2 + (factor * 0.8); // Maintain some minimum opacity
      
      // Create the color by blending background to high energy red
      const fillColor = blendColors(theme.background, theme.energy.high, factor, alpha);
      
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
  }
</script>

<BaseVisualizer 
  on:ready={handleReady}
  on:resize={handleResize}
  {fullHeight}
  {debug}
  id="frequency-spectrum"
  draw={drawSpectrum}
/> 