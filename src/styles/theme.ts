import { animations } from './animations';

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
        primary: '#262b3d', // Main background
        secondary: '#1e2132', // Secondary background (cards, etc)
        hover: '#313a55', // Hover state
        table: {
          header: '#1f2937', // Table header background
          headerText: '#f3f4f6', // Table header text
          row: '#1e2132', // Table row background
          rowHover: '#2b2f44', // Table row hover
        }
      },
      border: '#374151',
    },
    // Light mode colors
    light: {
      primary: '#ffffff',
      secondary: '#f3f4f6',
      text: {
        primary: '#111827',    // Almost black for primary text
        secondary: '#374151',  // Dark gray for secondary text
        muted: '#6B7280',     // Medium gray for muted text
      },
      background: {
        primary: '#ffffff',
        secondary: '#f9fafb',
        hover: '#f3f4f6',
        table: {
          header: '#f9fafb', // Table header background
          headerText: '#111827', // Table header text
          row: '#ffffff', // Table row background
          rowHover: '#f3f4f6', // Table row hover
        }
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
      notification: {
        success: {
          background: {
            light: '#f0fdf4',
            dark: 'rgba(5, 46, 22, 0.3)'
          },
          border: {
            light: '#bbf7d0',
            dark: '#052e16'
          },
          text: {
            light: '#15803d',
            dark: '#4ade80'
          }
        },
        error: {
          background: {
            light: '#fef2f2',
            dark: 'rgba(69, 10, 10, 0.3)'
          },
          border: {
            light: '#fecaca',
            dark: '#450a0a'
          },
          text: {
            light: '#dc2626',
            dark: '#f87171'
          }
        }
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
  layout: {
    sidebar: `
      w-64 h-full flex flex-col
      bg-[#1e2132] dark:bg-[#1e2132]
      border-r border-gray-700
    `,
    main: `
      flex-1 
      bg-[#262b3d] dark:bg-[#262b3d]
    `,
    content: `
      min-h-screen
      bg-white dark:bg-[#262b3d]
      p-6
    `,
  },

  button: {
    base: `
      flex items-center gap-2 px-4 py-2 rounded-lg
      font-medium
      ${animations.transition.normal}
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    primary: `
      bg-[${theme.colors.dark.background.hover}] hover:bg-[${theme.colors.dark.secondary}]
      text-white
      shadow-sm
    `,
    secondary: `
      bg-[${theme.colors.dark.background.hover}] hover:bg-[${theme.colors.dark.secondary}]
      text-gray-200
    `,
    danger: `
      bg-red-600 
      text-white 
      hover:bg-red-700 
      dark:bg-red-500 
      dark:hover:bg-red-600
      flex items-center
    `,
  },

  navLink: {
    base: `
      flex items-center p-2 rounded-lg
      text-gray-400 hover:text-gray-200 hover:bg-[#313a55]
    `,
    active: `
      bg-[#313a55] text-gray-200
    `,
  },

  ticket: {
    card: `
      bg-white dark:bg-[${theme.colors.dark.background.secondary}]
      border border-gray-200 dark:border-gray-700
      rounded-lg p-4 mb-4
      hover:bg-gray-50 dark:hover:bg-[${theme.colors.dark.background.hover}]
      ${animations.transition.normal}
    `,
    priority: {
      low: 'text-green-400',
      medium: 'text-yellow-400',
      high: 'text-red-400',
    },
    title: `
      text-gray-900 dark:text-gray-200
      font-medium text-base
    `,
    description: `
      text-gray-700 dark:text-gray-300
      text-sm mt-1
    `,
    metadata: `
      text-gray-600 dark:text-gray-400
      text-sm
    `,
  },

  card: `
    bg-white dark:bg-gray-800
    border border-gray-200 dark:border-gray-700
    rounded-lg shadow-sm
  `,
  input: `
    w-full px-4 py-2 rounded-lg
    bg-white dark:bg-gray-700
    border border-gray-200 dark:border-gray-600
    text-gray-900 dark:text-gray-100
    placeholder-gray-500 dark:placeholder-gray-400
    focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
    focus:border-transparent
    ${animations.transition.normal}
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
      bg-gray-100 dark:bg-[${theme.colors.dark.background.primary}]
      border-b border-gray-200 dark:border-gray-700
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
      text-gray-900 dark:text-gray-200
    `,
    subtitle: `
      text-sm
      text-gray-600 dark:text-gray-400
    `,
    actions: `
      flex items-center gap-3
    `,
  },
  table: {
    container: `
      bg-white dark:bg-gray-800 
      shadow-sm overflow-auto
      rounded-lg
    `,
    header: {
      cell: `
        sticky top-0
        bg-gray-50 dark:bg-gray-800
        text-gray-900 dark:text-gray-100
        border-b dark:border-gray-600
        cursor-pointer
        transition-colors
        hover:bg-gray-100 dark:hover:bg-gray-700
      `,
      sortIcon: {
        active: 'text-gray-900 dark:text-gray-100',
        inactive: 'text-gray-400 dark:text-gray-500',
      }
    },
    body: {
      row: `
        cursor-pointer
        hover:bg-gray-50 dark:hover:bg-gray-700
        transition-colors duration-150
      `,
      cell: `
        text-gray-900 dark:text-gray-100
        border-b dark:border-gray-600
      `,
      cellWithScroll: `
        text-gray-900 dark:text-gray-100
        border-b dark:border-gray-600
        max-w-[200px]
        whitespace-normal break-words
        max-h-[100px] overflow-y-auto
      `
    },
    pagination: `
      text-gray-900 dark:text-gray-100
      sticky bottom-0
      bg-white dark:bg-gray-800
      border-t dark:border-gray-600
    `
  },
};

export const typography = {
  brand: 'text-xl font-semibold text-gray-200',
  sidebarHeader: 'text-lg font-semibold text-gray-200',
  sectionHeader: 'text-sm font-medium text-gray-900 dark:text-gray-200 mb-4',
  h1: 'text-xl font-semibold text-gray-900 dark:text-gray-200',
  h2: 'text-lg font-semibold text-gray-900 dark:text-gray-200',
  h3: 'text-base font-semibold text-gray-900 dark:text-gray-200',
  h4: 'text-sm font-semibold text-gray-900 dark:text-gray-200',
  body: 'text-gray-700 dark:text-gray-300',
  small: 'text-sm text-gray-600 dark:text-gray-400',
  subtitle: 'text-gray-600 dark:text-gray-400 text-sm',
};
