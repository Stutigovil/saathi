/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-outfit)', 'Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        background: '#0b0f1a',
        'background-light': '#101728',
        card: '#111827',
        'card-hover': '#1a2234',
        border: '#1e293b',
        'border-light': '#334155',
        accent: '#f59e0b',
        'accent-hover': '#d97706',
        'accent-light': 'rgba(245,158,11,0.15)',
        'accent-secondary': '#8b5cf6',
        'accent-secondary-light': 'rgba(139,92,246,0.15)',
        muted: '#94a3b8',
        'muted-dark': '#64748b'
      },
      boxShadow: {
        'glow-amber': '0 0 30px rgba(245,158,11,0.25), 0 0 60px rgba(245,158,11,0.1)',
        'glow-violet': '0 0 30px rgba(139,92,246,0.25), 0 0 60px rgba(139,92,246,0.1)',
        'glow-emerald': '0 0 20px rgba(16,185,129,0.25)',
        'glow-red': '0 0 30px rgba(239,68,68,0.25)',
        glass: '0 8px 32px rgba(0,0,0,0.3)',
        'glass-lg': '0 16px 48px rgba(0,0,0,0.4)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.05)'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        shimmer: 'shimmer 2s linear infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0,0,0.2,1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        wiggle: 'wiggle 1s ease-in-out infinite',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite'
      },
      keyframes: {
        glow: {
          from: { boxShadow: '0 0 10px rgba(245,158,11,0.2)' },
          to: { boxShadow: '0 0 30px rgba(245,158,11,0.4)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '1' },
          '75%, 100%': { transform: 'scale(1.3)', opacity: '0' }
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' }
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' }
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-warm': 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #8b5cf6 100%)',
        'gradient-warm-subtle': 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(139,92,246,0.1) 100%)',
        'gradient-card': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
};
