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
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {icon && <div className="mb-4 text-muted-foreground opacity-40">{icon}</div>}
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
    {action && (
      <Button size="sm" variant="default" className="cursor-pointer" onClick={action.onClick}>
        <Plus className="w-4 h-4 mx-1" />
        {action.label}
      </Button>
    )}
  </div>
);
