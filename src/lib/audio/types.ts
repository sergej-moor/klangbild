// Common audio type definitions

export interface RmsLevels {
  left: number;
  right: number;
}

export interface PeakLevels {
  left: number;
  right: number;
}

export interface VisualizerData {
  waveform: Float32Array;
  spectrum: Uint8Array;
  rms: RmsLevels;
  peaks: PeakLevels;
}

export interface AudioEventDetail {
  time: number;
  position: number;
}
