import { writable, derived } from 'svelte/store';
import type { PlaylistTrack } from '$lib/audio/types';

// Define interface for our playlist store
interface PlaylistStore extends Array<PlaylistTrack> {
  activeTrackId: string | null;
  activeTrack: PlaylistTrack | null;
}

// Initial playlist with just the demo track
const initialTracks: PlaylistTrack[] = [
  { id: '1', title: 'Demo Track', path: '/demo.wav', duration: 120 },
];

// Create a proper integrated playlist store
function createPlaylistStore() {
  // Create the underlying stores
  const tracks = writable<PlaylistTrack[]>(initialTracks);
  const activeTrackId = writable<string | null>(initialTracks[0]?.id || null);

  // Create a derived store for the active track
  const activeTrack = derived([tracks, activeTrackId], ([$tracks, $activeTrackId]) => {
    return $tracks.find((track) => track.id === $activeTrackId) || null;
  });

  // Create a type-safe store
  const store = {
    ...tracks,
    subscribe: (run: (value: PlaylistStore) => void) => {
      return derived(
        [tracks, activeTrackId, activeTrack],
        ([$tracks, $activeTrackId, $activeTrack]) => {
          return Object.assign([], $tracks, {
            activeTrackId: $activeTrackId,
            activeTrack: $activeTrack,
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
  };

  return store;
}

export const playlist = createPlaylistStore();
