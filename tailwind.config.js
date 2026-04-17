/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: 'var(--ps-brand)',
        primary: 'var(--ps-primary)',
        background: 'var(--ps-background)',
        card: 'var(--ps-card)',
        surface: 'var(--ps-surface)',
        'active-soft': 'var(--ps-active-soft)',
        border: 'var(--ps-border)',
        text: {
          primary: 'var(--ps-text-primary)',
          secondary: 'var(--ps-text-secondary)',
        },
        success: {
          bg: 'var(--ps-success-bg)',
          text: 'var(--ps-success-text)',
        },
        'badge-blue-bg': 'var(--ps-badge-blue-bg)',
        'badge-blue-text': 'var(--ps-badge-blue-text)',
        'badge-purple-bg': 'var(--ps-badge-purple-bg)',
        'badge-purple-text': 'var(--ps-badge-purple-text)',
        'sidebar-bg': 'var(--ps-sidebar-bg)',
        'sidebar-border': 'var(--ps-sidebar-border)',
        'sidebar-hover': 'var(--ps-sidebar-hover)',
      },
    },
  },
  plugins: [],
};
