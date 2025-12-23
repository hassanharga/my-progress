import { useState, type FC } from 'react';
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const Editor = dynamic(() => import('../../shared/Editor'), { ssr: false });

type Props = {
  completeTask: ({ progress, todo }: { progress: string; todo: string }) => void;
  isLoading: boolean;
  taskProgress: string | null;
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const CompleteTask: FC<Props> = ({ completeTask, isLoading, taskProgress, open, setOpen }) => {
  const [progress, setProgress] = useState(taskProgress || '');
  const [todo, setTodo] = useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen} modal>
      <DialogContent className="sm:max-w-[60vw]" aria-describedby="Complete task">
        <DialogHeader>
          <DialogTitle>Complete Task</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* progress */}
          <div className="flex flex-col gap-2 ">
            <Label htmlFor="currentCompany" className="text-start w-30">
              Your Progress
            </Label>
            <Editor
              defaultValue={taskProgress || ''}
              onChange={(value) => {
                setProgress(value);
              }}
            />
          </div>
          {/* todo */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="currentCompany" className="text-start w-30">
              What todo next?
            </Label>
            <Editor
              onChange={(value) => {
                setTodo(value);
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            className="self-end"
            onClick={async () => {
              completeTask({ progress, todo });
            }}
            disabled={isLoading}
          >
            Complete Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
