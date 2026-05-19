/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Catppuccin Mocha Palette (Semantic + Peach Accent)
        bgBase: '#11111b',      // Crust
        bgSurface: '#181825',   // Mantle
        bgElevated: '#313244',  // Surface0
        borderCustom: '#45475a', // Surface1
        textPrimary: '#cdd6f4',  // Text
        textSecondary: '#bac2de',// Subtext1
        textMuted: '#7f849c',    // Overlay1

        // Compatibilidad con variables previas mapeadas a Catppuccin Mocha
        bg: {
          DEFAULT: '#11111b',   // Crust
          soft: '#181825',      // Mantle
          card: '#181825',      // Mantle
          line: '#45475a',      // Surface1
        },
        fg: {
          DEFAULT: '#cdd6f4',   // Text
          muted: '#bac2de',     // Subtext1
          dim: '#7f849c',       // Overlay1
        },
        prompt: {
          user: '#a6e3a1',      // Green
          path: '#bac2de',      // Subtext1
          sym: '#cba6f7',       // Mauve (Morado Claro)
        },
        accent: {
          DEFAULT: '#cba6f7',   // Mauve (Morado Claro)
          mauve: '#cba6f7',     // Mauve
          purple: '#cba6f7',    // Mauve
          sapphire: '#74c7ec',  // Sapphire (Azul Brillante)
          blue: '#74c7ec',      // Sapphire (Azul Brillante)
          green: '#a6e3a1',     // Green (Éxito)
          yellow: '#f9e2af',    // Yellow (Cabecera macOS)
          red: '#f38ba8',       // Red (Fallo)
          peach: '#fab387',     // Peach (Catppuccin Peach)
          cyan: '#94e2d5',      // Catppuccin Teal
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(203, 166, 247, 0.2), 0 0 24px -8px rgba(203, 166, 247, 0.35)',
        glowBlue: '0 0 0 1px rgba(116, 199, 236, 0.2), 0 0 24px -8px rgba(116, 199, 236, 0.35)',
        glowGreen: '0 0 0 1px rgba(166, 227, 161, 0.2), 0 0 24px -8px rgba(166, 227, 161, 0.35)',
        glowRed: '0 0 0 1px rgba(243, 139, 168, 0.2), 0 0 24px -8px rgba(243, 139, 168, 0.35)',
      },
    },
  },
  plugins: [],
};
