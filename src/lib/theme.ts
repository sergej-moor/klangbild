// Base color palette (single source of truth for all colors)
const palette = {
  // Primary colors
  colors: {
    primary: '#00ffff', // Bright green
    secondary: '#00cc66', // Medium green
    tertiary: '#99ff99', // Light green
    accent: '#33ccff', // Blue accent
  },

  // Other colors
  blue: '#33ccff',

  // Monochrome
  mono: {
    black: '#000000',
    darkGray: '#111111',
    mediumGray: '#333333',
    lightGray: '#999999',
    white: '#ffffff',
  },

  // Visualization specific
  visualizations: {
    spectrogram: {
      low: '#000066',
      mid: '#00cc00',
      high: '#ffff00',
    },
  },
};

// Semantic color assignments (what colors mean in the UI)
export const visualizerTheme = {
  // Main color assignments
  colors: {
    primary: palette.colors.primary,
    secondary: palette.colors.secondary,
    tertiary: palette.colors.tertiary,
    accent: palette.colors.accent,

    // Background colors
    background: palette.mono.black,
    backgroundAlt: palette.mono.darkGray,

    // Text colors
    text: palette.mono.white,
    textMuted: palette.mono.lightGray,
  },

  // Visualization specific settings that reference the base colors
  visualizations: {
    waveform: {
      lineColor: palette.colors.primary,
      lineWidth: 2,
    },

    spectrum: {
      barColor: palette.colors.primary,
      peakColor: palette.colors.secondary,
    },

    spectrogram: {
      lowIntensity: palette.visualizations.spectrogram.low,
      midIntensity: palette.visualizations.spectrogram.mid,
      highIntensity: palette.visualizations.spectrogram.high,
    },

    playback: {
      progress: palette.colors.primary,
      background: palette.mono.mediumGray,
    },
  },

  // UI element styling
  ui: {
    border: palette.colors.primary,
    buttonBg: palette.mono.darkGray,
    buttonHover: palette.mono.mediumGray,
    borderRadius: '3px',
  },
};

// Common sizing values
export const sizes = {
  defaultHeight: 200,
  minHeight: 50,
  maxHeight: 400,
  borderWidth: 1,
  borderRadius: 3,
};
