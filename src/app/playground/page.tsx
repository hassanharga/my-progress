'use client';

import ExampleDashboard from '@/components/examples/ExampleDashboard';
import { DashboardSkeleton, TaskCardSkeleton } from '@/components/ui-enhancements';

// Metadata for playground page
// export const metadata: Metadata = {
//   title: 'Playground',
//   description: 'Explore UI components and test dashboard features in our interactive playground.',
//   openGraph: {
//     title: 'Playground | My Progress',
//     description: 'Explore UI components and test dashboard features in our interactive playground.',
//   },
//   robots: {
//     index: false,
//     follow: false,
//   },
// };

export default function EditorPage() {
  return (
    <section className="flex flex-col flex-1 w-full min-h-screen p-4 gap-4">
      <ExampleDashboard />
      <DashboardSkeleton />
      <TaskCardSkeleton />
    </section>
  );
}
