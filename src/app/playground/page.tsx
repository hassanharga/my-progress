'use client';

import ExampleDashboard from '@/components/examples/ExampleDashboard';
import { DashboardSkeleton, TaskCardSkeleton } from '@/components/ui-enhancements';

export default function EditorPage() {
  return (
    <section className="flex flex-col flex-1 w-full min-h-screen p-4 gap-4">
      <ExampleDashboard />
      <DashboardSkeleton />
      <TaskCardSkeleton />
    </section>
  );
}
