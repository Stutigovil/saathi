/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        card: '#111118',
        border: '#1e1e2e',
        accent: '#8b5cf6',
        'accent-glow': 'rgba(139,92,246,0.2)'
      },
      boxShadow: {
        'glow-violet': '0 0 30px rgba(139,92,246,0.3)',
        'glow-green': '0 0 20px rgba(16,185,129,0.3)',
        'glow-red': '0 0 30px rgba(239,68,68,0.3)'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        glow: 'glow 2s ease-in-out infinite alternate'
      },
      keyframes: {
        glow: {
          from: { boxShadow: '0 0 10px rgba(139,92,246,0.2)' },
          to: { boxShadow: '0 0 30px rgba(139,92,246,0.4)' }
        }
      }
    }
  },
  plugins: []
};
