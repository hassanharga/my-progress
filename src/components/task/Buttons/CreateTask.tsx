import { useState, type FC } from 'react';
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Editor = dynamic(() => import('../../shared/Editor'), { ssr: false });

type Props = {
  createTask: ({ progress, title }: { progress: string; title: string }) => void;
  isLoading: boolean;
  lastTaskTodo: string;
  setOpen: (open: boolean) => void;
  open: boolean;
};

export const CreateTask: FC<Props> = ({ createTask, isLoading, lastTaskTodo, open, setOpen }) => {
  const [title, setTitle] = useState('');
  const [progress, setProgress] = useState(lastTaskTodo);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[60vw]" aria-describedby="Create task">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 overflow-x-hidden">
          <div className="flex flex-col gap-2">
            <Label htmlFor="currentCompany" className="text-start">
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
            <Label htmlFor="currentCompany" className="text-start">
              What are you going to do in this task?
            </Label>
            <Editor
              defaultValue={lastTaskTodo}
              onChange={(value) => {
                setProgress(value);
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            className={`self-end ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={async () => {
              createTask({ title, progress });
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
