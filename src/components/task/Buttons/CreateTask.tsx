import { useEffect, useState, type FC } from 'react';
import dynamic from 'next/dynamic';

import { useUserContext } from '@/components/contexts/user.context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Editor = dynamic(() => import('../../shared/Editor'), { ssr: false });

type Props = {
  createTask: ({ progress, title }: { progress: string; title: string; project: string }) => void;
  isExecuting: boolean;
  lastTaskTodo: string;
};

export const CreateTask: FC<Props> = ({ createTask, isExecuting, lastTaskTodo }) => {
  const [open, setOpen] = useState(false);
  const { user } = useUserContext();

  const [title, setTitle] = useState('');
  const [project, setProject] = useState('');
  const [progress, setProgress] = useState(lastTaskTodo);

  useEffect(() => {
    // console.log('user ====>', user);
    if (!user) return;
    setProject(user?.currentProject || '');
  }, [user]);

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
              Project*
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
            className="self-end mt-5"
            onClick={async () => {
              createTask({ title, progress, project });
            }}
            disabled={isExecuting || !title || !project}
          >
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
