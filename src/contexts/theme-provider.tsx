'use client';

import type { ComponentProps, JSX } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

const ThemeProvider = ({ children, ...props }: ComponentProps<typeof NextThemesProvider>): JSX.Element => {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
};

export default ThemeProvider;
