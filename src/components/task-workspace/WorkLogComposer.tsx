import type { FormEvent } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { hasRichTextContent } from '@/lib/rich-text-content';
import Editor from '@/components/shared/Editor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export function WorkLogComposer({
  content,
  expanded,
  error,
  nextStep,
  onChange,
  onExpandedChange,
  onNextStepChange,
  onSubmit,
  pending,
}: {
  content: string;
  expanded: boolean;
  error?: string | null;
  nextStep: string;
  onChange: (value: string) => void;
  onExpandedChange: (value: boolean) => void;
  onNextStepChange: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <section aria-labelledby="task-progress-heading" className="task-workspace-section">
      <div className="task-workspace-section__heading task-workspace-section__heading--action">
        <div>
          <h3 id="task-progress-heading">Log progress</h3>
          <p>Add a durable update without changing the timer.</p>
        </div>
        <Button
          aria-expanded={expanded}
          onClick={() => onExpandedChange(!expanded)}
          size="sm"
          type="button"
          variant="subtle"
        >
          {expanded ? <ChevronUp data-icon="inline-start" /> : <ChevronDown data-icon="inline-start" />}
          {expanded ? 'Collapse composer' : 'Write an update'}
        </Button>
      </div>
      {expanded ? (
        <form className="task-workspace-form" onSubmit={submit}>
          <p id="task-progress-label">Progress update</p>
          <div
            aria-describedby={error ? 'task-progress-error' : undefined}
            aria-labelledby="task-progress-label"
            role="group"
          >
            <Editor defaultValue={content || undefined} disabled={pending} onChange={onChange} />
          </div>
          {error ? (
            <p className="task-workspace-field-error" id="task-progress-error" role="alert">
              {error}
            </p>
          ) : null}
          <Label htmlFor="task-progress-next-step">New next step (optional)</Label>
          <textarea
            id="task-progress-next-step"
            disabled={pending}
            maxLength={20_000}
            onChange={(event) => onNextStepChange(event.currentTarget.value)}
            placeholder="Keep this blank to leave the next step unchanged."
            rows={2}
            value={nextStep}
          />
          <Button disabled={pending || !hasRichTextContent(content)} size="sm" type="submit">
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Save progress
          </Button>
        </form>
      ) : null}
    </section>
  );
}
