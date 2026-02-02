import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        brand: {
          DEFAULT: 'var(--vb-color-brand-primary)',
          teal: {
            50: 'var(--vb-color-brand-teal-50)',
            100: 'var(--vb-color-brand-teal-100)',
            200: 'var(--vb-color-brand-teal-200)',
            300: 'var(--vb-color-brand-teal-300)',
            400: 'var(--vb-color-brand-teal-400)',
            500: 'var(--vb-color-brand-teal-500)',
            600: 'var(--vb-color-brand-teal-600)',
            700: 'var(--vb-color-brand-teal-700)',
          },
        },
        // Service Colors
        service: {
          sell: 'var(--vb-color-service-sell)',
          buy: 'var(--vb-color-service-buy)',
          library: 'var(--vb-color-service-library)',
        },
        // Semantic Colors
        semantic: {
          error: 'var(--vb-color-semantic-error)',
          accent: 'var(--vb-color-semantic-accent)',
          disabled: 'var(--vb-color-semantic-disabled)',
        },
        // Gray Scale (vb namespace)
        vb: {
          gray: {
            50: 'var(--vb-color-gray-50)',
            100: 'var(--vb-color-gray-100)',
            200: 'var(--vb-color-gray-200)',
            300: 'var(--vb-color-gray-300)',
            400: 'var(--vb-color-gray-400)',
            500: 'var(--vb-color-gray-500)',
          },
          white: 'var(--vb-color-base-white)',
          black: 'var(--vb-color-base-black)',
          cream: 'var(--vb-color-cream-vb-cream)',
        },
        // Text Color Aliases
        text: {
          primary: 'var(--vb-color-text-primary)',
          secondary: 'var(--vb-color-text-secondary)',
          inverse: 'var(--vb-color-text-inverse)',
          disabled: 'var(--vb-color-text-disabled)',
        },
        // Background Color Aliases
        background: {
          DEFAULT: 'var(--vb-color-background-default)',
          secondary: 'var(--vb-color-background-secondary)',
          cream: 'var(--vb-color-background-cream)',
          disabled: 'var(--vb-color-background-disabled)',
        },
        // Border Color Aliases
        border: {
          DEFAULT: 'var(--vb-color-border-default)',
          subtle: 'var(--vb-color-border-subtle)',
        },
      },
      fontFamily: {
        sans: ['var(--vb-font-family-base)', 'sans-serif'],
      },
      spacing: {
        'vb-base': 'var(--vb-spacing-base)',
        'vb-header': 'var(--vb-header-height)',
      },
      ringColor: {
        brand: 'var(--vb-color-brand-primary)',
      },
    },
  },
  plugins: [],
};

export default config;
