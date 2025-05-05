<script lang="ts">
	import '../app.css';
	import Cursor from '$lib/components/Cursor.svelte';

	let { children } = $props();
</script>

<Cursor />
{@render children()}
