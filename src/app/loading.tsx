import { type FC } from 'react';

import { DashboardSkeleton } from '@/components/ui-enhancements';

const Loading: FC = () => {
  return (
    <div className="flex justify-center items-center h-screen flex-1">
      {/* <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-white" /> */}
      <div className="mt-50">
        <DashboardSkeleton />
      </div>
    </div>
  );
};

export default Loading;
