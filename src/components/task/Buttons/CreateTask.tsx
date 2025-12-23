import { useState, type FC } from 'react';
import dynamic from 'next/dynamic';

import { useUserContext } from '@/contexts/user.context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Editor = dynamic(() => import('../../shared/Editor'), { ssr: false });

type Props = {
  createTask: ({ progress, title }: { progress: string; title: string; project: string }) => void;
  isLoading: boolean;
  lastTaskTodo: string;
  setOpen: (open: boolean) => void;
  open: boolean;
};

export const CreateTask: FC<Props> = ({ createTask, isLoading, lastTaskTodo, open, setOpen }) => {
  const { user } = useUserContext();

  const [title, setTitle] = useState('');
  const [project, setProject] = useState(user?.currentProject || '');
  const [progress, setProgress] = useState(lastTaskTodo);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[60vw]" aria-describedby="Create task">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 overflow-hidden">
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
              Project
            </Label>
            <Input
              id="project"
              name="project"
              value={project}
              onChange={(e) => {
                setProject(e.target.value);
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
            className="self-end"
            onClick={async () => {
              createTask({ title, progress, project });
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
