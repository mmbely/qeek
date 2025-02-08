export const theme = {
  colors: {
    // Dark mode colors
    dark: {
      primary: '#1e2132', // Left nav background
      secondary: '#2b2f44', // Hover state
      text: {
        primary: '#f3f4f6', // Light text on dark background
        secondary: '#9ca3af', // Dimmed text
        muted: '#6b7280', // Even more dimmed text
      },
      background: {
        primary: '#0f1015', // Main background
        secondary: '#1a1c23', // Secondary background
        hover: '#2b2f44', // Hover state
      },
      border: '#2d3748',
    },
    // Light mode colors
    light: {
      primary: '#ffffff',
      secondary: '#f3f4f6',
      text: {
        primary: '#111827',
        secondary: '#4b5563',
        muted: '#6b7280',
      },
      background: {
        primary: '#ffffff',
        secondary: '#f9fafb',
        hover: '#f3f4f6',
      },
      border: '#e5e7eb',
    },
    // Shared colors (same in both modes)
    shared: {
      blue: {
        primary: '#1d4ed8',
        hover: '#1e40af',
      },
      status: {
        success: '#059669',
        warning: '#d97706',
        error: '#dc2626',
      },
      priority: {
        high: {
          text: '#dc2626',
          bg: '#fee2e2',
        },
        medium: {
          text: '#d97706',
          bg: '#fef3c7',
        },
        low: {
          text: '#059669',
          bg: '#d1fae5',
        },
      },
    },
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  spacing: {
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
  },
};

export const commonStyles = {
  button: {
    base: `
      px-4 py-2 rounded-xl transition-colors duration-200
      flex items-center gap-2 font-medium
    `,
    primary: `
      bg-[#1e2132] text-gray-100
      hover:bg-[#2b2f44]
      dark:bg-[#2b2f44] dark:hover:bg-[#363b54]
    `,
    secondary: `
      text-gray-700 hover:bg-[#1e2132] hover:text-gray-100
      dark:text-gray-100 dark:hover:bg-[#2b2f44]
    `,
  },
  card: `
    bg-white dark:bg-[#1e2132]
    border border-gray-200 dark:border-gray-700
    rounded-xl shadow-sm
    transition-all duration-200
  `,
  input: `
    w-full px-4 py-2
    bg-white dark:bg-[#2b2f44]
    border border-gray-200 dark:border-gray-600
    rounded-xl
    text-gray-900 dark:text-gray-100
    focus:outline-none focus:ring-2 focus:ring-blue-500
    transition-colors duration-200
  `,
  modal: `
    bg-white dark:bg-[#1e2132]
    border border-gray-200 dark:border-gray-700
    rounded-xl shadow-lg
  `,
  sidebar: {
    nav: {
      item: `
        flex items-center px-4 py-2 rounded-xl
        transition-colors duration-200
        font-medium
      `,
      active: `
        bg-[#2b2f44] text-gray-100
      `,
      inactive: `
        text-gray-400 hover:text-gray-100 hover:bg-[#2b2f44]
      `,
    },
  },
  header: {
    wrapper: `
      sticky top-0 z-10
      bg-white dark:bg-[#1e2132]
      border-b border-gray-200 dark:border-gray-700
      backdrop-blur-sm bg-white/80 dark:bg-[#1e2132]/80
    `,
    container: `
      flex items-center justify-between
      px-6 py-4
    `,
    titleWrapper: `
      flex flex-col
    `,
    title: `
      text-lg font-semibold
      text-gray-900 dark:text-gray-100
    `,
    subtitle: `
      text-sm
      text-gray-500 dark:text-gray-400
      mt-0.5
    `,
    actions: `
      flex items-center gap-3
    `
  },
};
