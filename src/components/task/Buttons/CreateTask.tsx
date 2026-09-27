import { useState, type FC } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  createTask: ({ description, title }: { description: string; title: string }) => void;
  isLoading: boolean;
  setOpen: (open: boolean) => void;
  open: boolean;
};

export const CreateTask: FC<Props> = ({ createTask, isLoading, open, setOpen }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[60vw]">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Name the task and capture the work you intend to start.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 overflow-x-hidden">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title" className="text-start">
              Title*
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-description" className="text-start">
              Description (optional)
            </Label>
            <textarea
              className="min-h-24 w-full rounded-md border border-border-input bg-surface px-150 py-100 text-body text-text outline-none focus-visible:border-border-focused focus-visible:ring-[3px] focus-visible:ring-border-focused/50"
              id="task-description"
              maxLength={20_000}
              onChange={(event) => setDescription(event.currentTarget.value)}
              placeholder="What does this task involve?"
              rows={3}
              value={description}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            className={`self-end ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={async () => {
              createTask({ title, description });
            }}
            disabled={isLoading || !title}
          >
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
