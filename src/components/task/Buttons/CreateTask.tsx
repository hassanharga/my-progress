import { useState, type FC } from 'react';
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Editor = dynamic(() => import('../../shared/Editor'), { ssr: false });

type Props = { createTask: ({ progress, title }: { progress: string; title: string }) => void; isExecuting: boolean };

export const CreateTask: FC<Props> = ({ createTask, isExecuting }) => {
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [progress, setProgress] = useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            setOpen(true);
          }}
        >
          Start new task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" aria-describedby="Create task">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="currentCompany" className="text-start">
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="currentCompany" className="text-start">
              What should you do?
            </Label>
            <Editor
              onChange={(value) => {
                setProgress(value);
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            className="self-end mt-5"
            onClick={async () => {
              createTask({ title, progress });
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
