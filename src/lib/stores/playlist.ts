import { writable, derived } from 'svelte/store';
import type { PlaylistTrack } from '$lib/audio/types';

// Define interface for our playlist store
interface PlaylistStore extends Array<PlaylistTrack> {
	activeTrackId: string | null;
	activeTrack: PlaylistTrack | null;
	isShuffleMode: boolean;
	isRepeatMode: boolean;
}

// Initial playlist with demo track
const initialTracks: PlaylistTrack[] = [
	{ id: '1', title: 'demo.mp3', path: '/demo.mp3', duration: 120 }
];

// Create a proper integrated playlist store
function createPlaylistStore() {
	// Create the underlying stores
	const tracks = writable<PlaylistTrack[]>(initialTracks);
	const activeTrackId = writable<string | null>(initialTracks[0]?.id || null);
	const isShuffleMode = writable<boolean>(false);
	const isRepeatMode = writable<boolean>(false);

	// Create a derived store for the active track
	const activeTrack = derived([tracks, activeTrackId], ([$tracks, $activeTrackId]) => {
		return $tracks.find((track) => track.id === $activeTrackId) || null;
	});

	// Create a type-safe store
	const store = {
		...tracks,
		subscribe: (run: (value: PlaylistStore) => void) => {
			return derived(
				[tracks, activeTrackId, activeTrack, isShuffleMode, isRepeatMode],
				([$tracks, $activeTrackId, $activeTrack, $isShuffleMode, $isRepeatMode]) => {
					return Object.assign([], $tracks, {
						activeTrackId: $activeTrackId,
						activeTrack: $activeTrack,
						isShuffleMode: $isShuffleMode,
						isRepeatMode: $isRepeatMode
					}) as unknown as PlaylistStore;
				}
			).subscribe(run);
		},
		addTrack: (track: PlaylistTrack) => {
			tracks.update((list) => [...list, track]);
		},
		removeTrack: (id: string) => {
			tracks.update((list) => list.filter((track) => track.id !== id));
		},
		clear: () => tracks.set([]),
		reset: () => tracks.set(initialTracks),
		setActiveTrack: (id: string) => {
			console.log(`Setting active track ID to: ${id}`);
			activeTrackId.set(id);
		},
		toggleShuffleMode: () => {
			isShuffleMode.update(value => !value);
		},
		toggleRepeatMode: () => {
			isRepeatMode.update(value => !value);
		}
	};

	return store;
}

export const playlist = createPlaylistStore();
