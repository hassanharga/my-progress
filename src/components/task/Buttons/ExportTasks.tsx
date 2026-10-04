import Link from 'next/link';
import { FileText } from 'lucide-react';

export function ExportTasks() {
  return <Link href="/reports" className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-text-subtle hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused">
    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
    Reports
  </Link>;
}
