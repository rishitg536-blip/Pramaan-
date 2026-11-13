/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./verify.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F2EFE2',
        ink: '#0F0F0F',
        muted: '#6B6B5F',
        terminal: '#0B0B0B',
        'terminal-text': '#E6E6E6',
        field: '#1E3A9E',
        yellow: '#FFE24A',
        pink: '#FF6EA8',
        green: '#35D07F',
        blue: '#3D6DFF',
        red: '#E8452C',
      },
      fontFamily: {
        sans: ['"Inter Tight Variable"', '"Inter Tight"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        hand: ['"Caveat"', 'cursive'],
      },
      boxShadow: {
        brutal: '6px 6px 0 var(--ink)',
        'brutal-sm': '3px 3px 0 var(--ink)',
        'brutal-lg': '8px 8px 0 var(--ink)',
      },
    },
  },
  plugins: [],
}

