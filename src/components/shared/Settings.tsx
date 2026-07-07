'use client';

import { useState, type FC } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { updateSettings } from '@/actions/user';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WeekStartDay } from '@/utils/time-stats';

import ProjectManager from './ProjectManager';

type Props = {
  weekStartDay: WeekStartDay;
  refetch: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const Settings: FC<Props> = ({ weekStartDay, refetch, open, setOpen }) => {
  const [selectedDay, setSelectedDay] = useState<WeekStartDay>(weekStartDay);

  const { execute: executeUpdate, isExecuting } = useAction(updateSettings, {
    onSuccess: () => {
      refetch();
      toast.success('Preference saved');
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to save preference'),
  });

  const handleDayChange = (value: string) => {
    const day = value as WeekStartDay;
    setSelectedDay(day);
    executeUpdate({ weekStartDay: day });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your projects and preferences. Changes apply immediately.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label>Projects</Label>
            <ProjectManager />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="weekStartDay">Week starts on</Label>
            <Select value={selectedDay} onValueChange={handleDayChange} disabled={isExecuting}>
              <SelectTrigger id="weekStartDay">
                <SelectValue placeholder="Select a day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUNDAY">Sunday</SelectItem>
                <SelectItem value="MONDAY">Monday</SelectItem>
                <SelectItem value="SATURDAY">Saturday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
