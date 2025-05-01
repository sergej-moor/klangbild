<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import { visualizerTheme, sizes } from '$lib/theme';
  
  // Props using Svelte 5 runes syntax
  const { 
    bgColor = 'transparent',
    canvasHeight = sizes.defaultHeight,
    id = 'visualizer-' + Math.random().toString(36).substring(2, 9),
    fullHeight = false // Ensure this is correctly typed
  } = $props();
  
  // Internal state
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(500);
  let height = $state(canvasHeight);
  let isInitialized = $state(false);  // Track initialization state
  
  // Event dispatcher for communicating with parent components
  const dispatch = createEventDispatcher<{
    resize: { width: number; height: number; ctx: CanvasRenderingContext2D };
    ready: { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement };
  }>();
  
  // Handle resize for responsiveness
  function handleResize() {
    if (!browser || !canvas || !ctx) return;
    
    const container = canvas.parentElement;
    if (container) {
      width = container.clientWidth;
      
      // Allow the component to use the full available height
      if (fullHeight) {
        height = container.clientHeight || canvasHeight;
      } else {
        // For non-full height mode, still limit height but more responsive
        height = Math.min(canvasHeight, container.clientWidth / 2);
      }
      
      // Update canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Notify parent component about resize
      dispatch('resize', { width, height, ctx });
    }
  }
  
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
  
  onMount(() => {
    if (!browser) return;
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      if (!canvas) return;
      
      ctx = canvas.getContext('2d')!;
      handleResize();
      
      // Set up resize listener
      window.addEventListener('resize', handleResize);
      
      isInitialized = true;
      console.log(`${id} initializing with dimensions:`, width, height);
      
      // Notify parent that canvas is ready
      dispatch('ready', { ctx, canvas });
    }, 0);
  });
  
  onDestroy(() => {
    if (!browser) return;
    window.removeEventListener('resize', handleResize);
  });
  
  // Expose methods to parent components via bindings
  export function getContext() {
    return ctx;
  }
  
  export function getDimensions() {
    if (!isInitialized) {
      console.warn(`${id} - getDimensions called before initialization`);
      return { width: 0, height: 0 };
    }
    return { width, height };
  }
  
  // Add this method to expose the canvas element
  export function getCanvas() {
    return canvas;
  }
  
  export { clearCanvas, isInitialized };
</script>

<div class="w-full h-full mx-auto flex flex-col gap-2" {id}>
  <div class="w-full h-full rounded-md overflow-hidden">
    <canvas bind:this={canvas} width={width} height={height} class="block w-full h-full"></canvas>
  </div>
  <slot />
</div> 