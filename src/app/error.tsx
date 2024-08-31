"use client";

import type { FC } from "react";

type Props = {
  error: Error;
  reset: () => void;
};

const ErrorPage: FC<Props> = ({ error, reset }) => {
  return (
    <div>
      error: {error.message}
      <button onClick={reset}>reset</button>
    </div>
  );
};

export default ErrorPage;
