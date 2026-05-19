/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Paleta inspirada en Kali Linux terminal
        bg: {
          DEFAULT: '#0a0e14',
          soft: '#10151c',
          card: '#141a22',
          line: '#1c2530',
        },
        fg: {
          DEFAULT: '#d7e0ea',
          muted: '#7a8794',
          dim: '#4f5b68',
        },
        // Prompt segments (Kali default)
        prompt: {
          user: '#2bd57c',  // verde brillante (usuario@host)
          path: '#3aa6ff',  // azul (cwd)
          sym: '#d7e0ea',   // dolar/símbolo
        },
        accent: {
          green: '#2bd57c',
          blue: '#3aa6ff',
          yellow: '#f5c542',
          red: '#ff5566',
          purple: '#c678dd',
          cyan: '#5cd4d8',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(43, 213, 124, 0.25), 0 0 24px -8px rgba(43, 213, 124, 0.35)',
      },
    },
  },
  plugins: [],
};
