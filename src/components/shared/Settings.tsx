import { useEffect, type FC } from 'react';
import { Controller } from 'react-hook-form';
import { settingsSchema } from '@/schema/user';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';

import { updateSettings } from '@/actions/user';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WeekStartDay } from '@/utils/time-stats';

import DisplayServerActionResponse from './DisplayServerActionResponse';
import ProjectManager from './ProjectManager';

type Props = {
  weekStartDay: WeekStartDay;
  refetch: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const Settings: FC<Props> = ({ weekStartDay, refetch, open, setOpen }) => {
  const {
    form,
    action: { isExecuting, result },
    handleSubmitWithAction,
  } = useHookFormAction(updateSettings, zodResolver(settingsSchema), {
    errorMapProps: {},
    formProps: {
      mode: 'onChange',
      defaultValues: {
        weekStartDay,
      },
    },
    actionProps: {
      onSuccess: () => {
        refetch();
        setOpen(false);
      },
    },
  });

  useEffect(() => {
    form.setValue('weekStartDay', weekStartDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartDay]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your projects and preferences. Click save when you are done.</DialogDescription>
        </DialogHeader>
        {!isExecuting ? <DisplayServerActionResponse result={result} /> : null}

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label>Projects</Label>
            <ProjectManager />
          </div>

          <form onSubmit={handleSubmitWithAction}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="weekStartDay">Week starts on</Label>
                <Controller
                  control={form.control}
                  name="weekStartDay"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="weekStartDay">
                        <SelectValue placeholder="Select a day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUNDAY">Sunday</SelectItem>
                        <SelectItem value="MONDAY">Monday</SelectItem>
                        <SelectItem value="SATURDAY">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <Button type="submit" className="self-end" disabled={isExecuting}>
                Save changes
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
