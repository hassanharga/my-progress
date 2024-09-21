import { useEffect, useState, type FC } from 'react';
import { settingsSchema } from '@/schema/user';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';

import { updateSettings } from '@/actions/user';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import DisplayServerActionResponse from './DisplayServerActionResponse';

type Props = { currentProject: string; currentCompany: string; refetch: () => void };

export const Settings: FC<Props> = ({ currentProject, currentCompany, refetch }) => {
  const [open, setOpen] = useState(false);

  const {
    form,
    action: { isExecuting, result },
    handleSubmitWithAction,
  } = useHookFormAction(updateSettings, zodResolver(settingsSchema), {
    errorMapProps: {},
    formProps: {
      mode: 'onChange',
      defaultValues: {
        currentProject,
        currentCompany,
      },
    },
    actionProps: {
      onSuccess: () => {
        // console.log('data[onSuccess] ====>', data);
        // refetch user data
        refetch();
        // close dialog
        setOpen(false);
      },
    },
  });

  useEffect(() => {
    if (currentCompany || currentProject) {
      form.setValue('currentProject', currentProject);
      form.setValue('currentCompany', currentCompany);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject, currentCompany]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          onClick={() => {
            setOpen(true);
          }}
        >
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Make changes to your settings here. Click save when you are done.</DialogDescription>
        </DialogHeader>
        {!isExecuting ? <DisplayServerActionResponse result={result} /> : null}
        <form onSubmit={handleSubmitWithAction}>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="currentProject" className="text-start w-[120px]">
                Current Project
              </Label>
              <Input id="currentProject" {...form.register('currentProject')} />
              {form.formState.errors.currentProject ? (
                <p className="text-rose-700 text-sm">{form.formState.errors.currentProject.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currentCompany" className="text-start w-[120px]">
                Current Company
              </Label>
              <Input id="currentCompany" {...form.register('currentCompany')} />
              {form.formState.errors.currentCompany ? (
                <p className="text-rose-700 text-sm">{form.formState.errors.currentCompany.message}</p>
              ) : null}
            </div>
            <Button type="submit" className="self-end" disabled={isExecuting}>
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
