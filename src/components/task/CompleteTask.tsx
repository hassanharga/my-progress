import { useState, type FC } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = { completeTask: ({ progress, todo }: { progress: string; todo: string }) => void; isExecuting: boolean };

export const CompleteTask: FC<Props> = ({ completeTask, isExecuting }) => {
  const [open, setOpen] = useState(false);

  const [progress, setProgress] = useState('');
  const [todo, setTodo] = useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            setOpen(true);
          }}
        >
          Complete Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" aria-describedby="Complete task">
        <DialogHeader>
          <DialogTitle>Complete Task</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="currentCompany" className="text-start w-[120px]">
              Your Progress
            </Label>
            <Textarea
              id="progress"
              name="progress"
              value={progress}
              onChange={(e) => {
                setProgress(e.target.value);
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="currentCompany" className="text-start w-[120px]">
              What todo next?
            </Label>
            <Textarea
              id="todo"
              name="todo"
              value={todo}
              onChange={(e) => {
                setTodo(e.target.value);
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
            disabled={isExecuting}
          >
            Complete Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
