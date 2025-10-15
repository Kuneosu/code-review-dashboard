/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        severity: {
          critical: '#EF4444',
          high: '#F97316',
          medium: '#F59E0B',
          low: '#10B981',
        },
        category: {
          security: '#DC2626',
          performance: '#2563EB',
          quality: '#7C3AED',
        },
      },
    },
  },
  plugins: [],
}
