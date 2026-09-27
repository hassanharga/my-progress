import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export function DescriptionEditor({
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
    <section aria-labelledby="task-description-heading" className="task-workspace-section">
      <div className="task-workspace-section__heading">
        <h3 id="task-description-heading">Task description</h3>
        <p className="whitespace-pre-line">{current || 'No description added yet.'}</p>
      </div>
      {!archived ? (
        <form className="task-workspace-form" onSubmit={submit}>
          <Label htmlFor="task-description">Edit description</Label>
          <textarea
            aria-describedby={error ? 'task-description-error' : undefined}
            aria-invalid={Boolean(error)}
            disabled={pending}
            id="task-description"
            maxLength={20_000}
            onChange={(event) => onChange(event.currentTarget.value)}
            placeholder="What does this task involve?"
            rows={3}
            value={draft}
          />
          {error ? <p className="task-workspace-field-error" id="task-description-error" role="alert">{error}</p> : null}
          <Button disabled={pending} size="sm" type="submit" variant="default">
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Save description
          </Button>
        </form>
      ) : null}
    </section>
  );
}
