import { useState, type FC } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = { createTask: (title: string) => void; isExecuting: boolean };

export const CreateTask: FC<Props> = ({ createTask, isExecuting }) => {
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            setOpen(true);
          }}
        >
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="currentCompany" className="text-start w-[120px]">
              Title
            </Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            className="self-end"
            onClick={async () => {
              createTask(title);
            }}
            disabled={isExecuting}
          >
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
