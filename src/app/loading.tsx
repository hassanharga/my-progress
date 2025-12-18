import { type FC } from 'react';

const Loading: FC = () => {
  return (
    <div className="flex justify-center items-center h-screen flex-1">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-white" />
    </div>
  );
};

export default Loading;
