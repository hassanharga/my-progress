import type { FC } from 'react';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export type DisplayServerActionResponseProps = {
  result: {
    data?: unknown;
    serverError?: string;
    fetchError?: string;
    // validationErrors?: Record<string, string[] | undefined> | undefined;
  };
};

const AlertDestructive: FC<{ message?: string }> = ({ message }) => {
  return (
    <Alert variant="destructive">
      <ExclamationTriangleIcon className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{message || 'Something went wrong'}</AlertDescription>
    </Alert>
  );
};

const DisplayServerActionResponse: FC<DisplayServerActionResponseProps> = ({ result }) => {
  return (
    <>
      {/* Success Message */}
      {/* {data?.message ? <Alert severity="success">{data.message as string}</Alert> : null} */}

      {result?.serverError ? <AlertDestructive message={result?.serverError} /> : null}

      {result?.fetchError ? <AlertDestructive message={result?.fetchError} /> : null}

      {/* {validationErrors ? (
        <div className="my-2 text-red-500">
          {Object.keys(validationErrors).map((key) => (
            <p key={key}>{`${key}: ${validationErrors?.[key]}`}</p>
          ))}
        </div>
      ) : null} */}
    </>
  );
};

export default DisplayServerActionResponse;
