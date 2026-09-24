import type { FormEvent } from 'react';

import { readableRichText } from '@/lib/rich-text-content';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export function NextStepEditor({
  archived,
  current,
  draft,
  error,
  onChange,
  onSubmit,
  pending,
}: {
  archived: boolean;
  current: string | null;
  draft: string;
  error?: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <section aria-labelledby="task-next-step-heading" className="task-workspace-section">
      <div className="task-workspace-section__heading">
        <h3 id="task-next-step-heading">Current next step</h3>
        <p>{readableRichText(current) || 'No next step recorded.'}</p>
      </div>
      {!archived ? (
        <form className="task-workspace-form" onSubmit={submit}>
          <Label htmlFor="task-next-step">Replace or clear the next step</Label>
          <textarea
            aria-describedby={error ? 'task-next-step-error' : undefined}
            aria-invalid={Boolean(error)}
            disabled={pending}
            id="task-next-step"
            maxLength={20_000}
            onChange={(event) => onChange(event.currentTarget.value)}
            placeholder="What is the next concrete action?"
            rows={2}
            value={draft}
          />
          {error ? (
            <p className="task-workspace-field-error" id="task-next-step-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button disabled={pending} size="sm" type="submit" variant="default">
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Save next step
          </Button>
        </form>
      ) : null}
    </section>
  );
}
