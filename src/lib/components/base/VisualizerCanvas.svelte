<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import { theme, sizes } from '$lib/theme';
  
  // Props using Svelte 5 runes syntax
  const { 
    bgColor = theme.background,
    canvasHeight = sizes.defaultHeight,
    id = 'visualizer-' + Math.random().toString(36).substring(2, 9),
    fullHeight = false,
    scaleToFit = true,
    pixelRatio = 2 // Added pixel ratio with default of 2x resolution
  } = $props();
  
  // Canvas reference and state
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(0);
  let height = $state(0);
  let scale = $state(1);
  let displayWidth = $state(0);
  let displayHeight = $state(0);
  
  // Create an event dispatcher for communication with parent
  const dispatch = createEventDispatcher();
  
  // Handle resize for responsiveness
  function handleResize() {
    if (!browser || !canvas || !ctx) return;
    
    const container = canvas.parentElement;
    if (container) {
      // Set display dimensions (CSS size)
      displayWidth = container.clientWidth;
      
      // Allow the component to use the full available height
      if (fullHeight) {
        displayHeight = container.clientHeight;
      } else {
        // For non-full height mode, be more responsive to available space
        displayHeight = Math.min(canvasHeight, Math.max(50, container.clientHeight));
      }
      
      // Set actual canvas dimensions (with higher resolution)
      width = displayWidth * pixelRatio;
      height = displayHeight * pixelRatio;
      
      // Calculate scale factor based on height
      scale = displayHeight / sizes.defaultHeight;
      
      // Update canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Set CSS dimensions
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      
      // Scale the context to account for the higher resolution
      ctx.scale(pixelRatio, pixelRatio);
      
      // Notify parent component about resize and scale
      dispatch('resize', { 
        width: displayWidth, 
        height: displayHeight, 
        ctx, 
        scale,
        pixelRatio
      });
    }
  }
  
  // Clear the canvas
  function clearCanvas() {
    if (!ctx) return;
    
    if (bgColor === 'transparent') {
      // For transparent background, clear with clearRect
      ctx.clearRect(0, 0, displayWidth, displayHeight);
    } else {
      // For colored background, use fillRect
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, displayWidth, displayHeight);
    }
  }
  
  // Initialize canvas and report readiness
  function initCanvas() {
    if (!browser || !canvas) return;
    
    ctx = canvas.getContext('2d', { alpha: bgColor === 'transparent' })!;
    
    // Initial sizing
    handleResize();
    
    // Notify parent that canvas is ready
    dispatch('ready', { 
      canvas, 
      ctx, 
      width: displayWidth, 
      height: displayHeight, 
      scale,
      pixelRatio
    });
  }
  
  // Lifecycle hooks
  onMount(() => {
    if (!browser) return;
    
    // Initialize canvas
    initCanvas();
    
    // Set up resize handler
    window.addEventListener('resize', handleResize);
    
    // Clean up on component destroy
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });
  
  // Exported functions and properties
  export function getDimensions() {
    if (!scale) {
      console.warn(`${id} - getDimensions called before initialization`);
      return { width: 0, height: 0 };
    }
    return { width: displayWidth, height: displayHeight };
  }
  
  export { clearCanvas, scale };
</script>

<div class="canvas-container" {id} style="--border-color: {theme.primary}">
  <canvas bind:this={canvas} class="visualization-canvas"></canvas>
  <slot />
</div>

<style>
  .canvas-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--border-color, #00ff00);
    box-sizing: border-box;
  }
  
  .visualization-canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
</style> 