<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import { visualizerTheme, sizes } from '$lib/theme';
  
  // Props using Svelte 5 runes syntax
  const { 
    bgColor = 'transparent',
    canvasHeight = sizes.defaultHeight,
    id = 'visualizer-' + Math.random().toString(36).substring(2, 9),
    fullHeight = false,
    scaleToFit = true // New prop to control auto-scaling
  } = $props();
  
  // Canvas reference and state
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(0);
  let height = $state(0);
  let scale = $state(1); // Scale factor for visualizations
  
  // Create an event dispatcher for communication with parent
  const dispatch = createEventDispatcher();
  
  // Handle resize for responsiveness
  function handleResize() {
    if (!browser || !canvas || !ctx) return;
    
    const container = canvas.parentElement;
    if (container) {
      width = container.clientWidth;
      
      // Allow the component to use the full available height
      if (fullHeight) {
        height = container.clientHeight;
      } else {
        // For non-full height mode, be more responsive to available space
        height = Math.min(canvasHeight, Math.max(50, container.clientHeight));
      }
      
      // Calculate scale factor based on height
      // This helps visualizations scale appropriately
      scale = height / sizes.defaultHeight;
      
      // Update canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Notify parent component about resize and scale
      dispatch('resize', { width, height, ctx, scale });
    }
  }
  
  // Clear the canvas
  function clearCanvas() {
    if (!ctx) return;
    
    if (bgColor === 'transparent') {
      // For transparent background, clear with clearRect
      ctx.clearRect(0, 0, width, height);
    } else {
      // For colored background, use fillRect
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    }
  }
  
  // Initialize canvas and report readiness
  function initCanvas() {
    if (!browser || !canvas) return;
    
    ctx = canvas.getContext('2d')!;
    
    // Initial sizing
    handleResize();
    
    // Notify parent that canvas is ready
    dispatch('ready', { canvas, ctx, width, height, scale });
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
  
  // Expose methods to parent components via bindings
  export function getContext() {
    return ctx;
  }
  
  export function getDimensions() {
    if (!scale) {
      console.warn(`${id} - getDimensions called before initialization`);
      return { width: 0, height: 0 };
    }
    return { width, height };
  }
  
  // Add this method to expose the canvas element
  export function getCanvas() {
    return canvas;
  }
  
  export { clearCanvas, scale };
</script>

<div class="canvas-container" {id}>
  <canvas bind:this={canvas} width={width} height={height} class="visualization-canvas"></canvas>
  <slot />
</div>

<style>
  .canvas-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .visualization-canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
</style> 