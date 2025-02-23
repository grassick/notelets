/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // This enables manual dark mode
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            h1: {
              fontSize: '1.5em',
              marginTop: '1em',
              marginBottom: '1em',
              fontWeight: 700,
              color: 'var(--tw-prose-headings)',
              lineHeight: '1.3',
            },
            h2: {
              fontSize: '1.25em',
              marginTop: '0.75em',
              marginBottom: '0.75em',
              fontWeight: 600,
              color: 'var(--tw-prose-headings)',
              lineHeight: '1.3',
            },
            h3: {
              fontSize: '1.1em',
              marginTop: '0.5em',
              marginBottom: '0.5em',
              fontWeight: 500,
              color: 'var(--tw-prose-headings)',
              lineHeight: '1.3',
            },
            // Remove margins from paragraphs inside list items
            'li p': {
              margin: '0',
            },
            // Ensure list items themselves have proper spacing
            'li': {
              margin: '0',
              '&:not(:first-child)': {
                marginTop: '0em',
              },
            },
          },
        },
        sm: {
          css: {
            h1: {
              fontSize: '1.5em',
              marginTop: '1em',
              marginBottom: '1em',
              fontWeight: 700,
              lineHeight: '1.3',
            },
            h2: {
              fontSize: '1.25em',
              marginTop: '0.75em',
              marginBottom: '0.75em',
              fontWeight: 600,
              lineHeight: '1.3',
            },
            h3: {
              fontSize: '1.1em',
              marginTop: '0.5em',
              marginBottom: '0.5em',
              fontWeight: 500,
              lineHeight: '1.3',
            },
            // Remove margins from paragraphs inside list items
            'li p': {
              margin: '0',
            },
            // Ensure list items themselves have proper spacing
            'li': {
              margin: '0',
              '&:not(:first-child)': {
                marginTop: '0em',
              },
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 