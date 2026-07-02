export const DESIGN_TOKENS = {
  // Spacing scale (Atlassian 8px base)
  spacing: {
    '0': '0',
    '025': '0.125rem', // 2px
    '050': '0.25rem', // 4px
    '075': '0.375rem', // 6px
    '100': '0.5rem', // 8px
    '150': '0.75rem', // 12px
    '200': '1rem', // 16px
    '250': '1.25rem', // 20px
    '300': '1.5rem', // 24px
    '400': '2rem', // 32px
    '500': '2.5rem', // 40px
    '600': '3rem', // 48px
    '800': '4rem', // 64px
    '1000': '5rem', // 80px
  },

  // Border radius scale (Atlassian t-shirt sizes)
  borderRadius: {
    none: '0',
    xsmall: '0.125rem', // 2px
    small: '0.25rem', // 4px
    medium: '0.375rem', // 6px
    large: '0.5rem', // 8px
    xlarge: '0.75rem', // 12px
    full: '9999px',
  },

  // Elevation shadows (Atlassian four-plane model)
  shadows: {
    raised: '0px 1px 1px #1E1F2140, 0px 0px 1px #1E1F214F',
    overlay: '0px 8px 12px #1E1F2126, 0px 0px 1px #1E1F214F',
    overflow: '0px 0px 8px #1E1F2129, 0px 0px 1px #1E1F211F',
    none: 'none',
  },

  // Motion (Atlassian motion tokens)
  animations: {
    durations: {
      instant: '0ms',
      xxshort: '50ms',
      xshort: '100ms',
      short: '150ms',
      medium: '200ms',
      long: '250ms',
      xlong: '400ms',
      xxlong: '600ms',
    },
    easings: {
      inPractical: 'cubic-bezier(0.6, 0, 0.8, 0.6)',
      inOutBold: 'cubic-bezier(0.4, 0, 0, 1)',
      outPractical: 'cubic-bezier(0.4, 1, 0.6, 1)',
      outBold: 'cubic-bezier(0, 0.4, 0, 1)',
    },
  },

  // Z-index scale
  zIndex: {
    hide: -1,
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },
} as const;
