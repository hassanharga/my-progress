import type { FC, ReactNode } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

type Props = {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export const EmptyState: FC<Props> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-400 px-4 text-center">
    {icon && (
      <div className="mb-150 text-icon-subtle" aria-hidden>
        {icon}
      </div>
    )}
    <h3 className="text-heading-medium font-weight-bold text-text mb-050">{title}</h3>
    <p className="text-body text-text-subtle mb-200 max-w-sm">{description}</p>
    {action && (
      <Button variant="primary" size="sm" className="cursor-pointer" onClick={action.onClick}>
        <Plus className="w-3.5 h-3.5" />
        {action.label}
      </Button>
    )}
  </div>
);
