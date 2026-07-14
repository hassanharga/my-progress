import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-brand-bold selection:text-text-inverse file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text placeholder:text-text-subtle disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-surface/30',
        'focus-visible:border-border-focused focus-visible:ring-[3px] focus-visible:ring-border-focused/50',
        'aria-invalid:border-border-danger aria-invalid:ring-border-danger/20 dark:aria-invalid:ring-border-danger/40',
        className
      )}
      {...props}
    />
  );
}

export { Input };
