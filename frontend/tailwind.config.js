export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#07070f',
          900: '#0b0b18',
          800: '#101026',
          700: '#171734',
          600: '#1f1f45',
        },
        accent: {
          violet: '#7c6cff',
          cyan: '#22d3ee',
          pink: '#ff5fa2',
          amber: '#fbbf24',
        },
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(124, 108, 255, 0.45)',
        glowCyan: '0 0 40px -8px rgba(34, 211, 238, 0.4)',
        card: '0 20px 60px -15px rgba(0, 0, 0, 0.6)',
      },
      backgroundImage: {
        'radial-violet': 'radial-gradient(circle at 20% 20%, rgba(124,108,255,0.25), transparent 45%)',
        'radial-cyan': 'radial-gradient(circle at 80% 30%, rgba(34,211,238,0.18), transparent 45%)',
        'radial-pink': 'radial-gradient(circle at 60% 85%, rgba(255,95,162,0.16), transparent 48%)',
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(124,108,255,0.5)' },
          '50%': { boxShadow: '0 0 0 12px rgba(124,108,255,0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(30px,-40px) scale(1.1)' },
          '66%': { transform: 'translate(-20px,20px) scale(0.95)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        blob: 'blob 12s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}