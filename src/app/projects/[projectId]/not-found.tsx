import Link from 'next/link';
import { FolderSearch } from 'lucide-react';

export default function ProjectWorkspaceNotFound() {
  return (
    <main className="project-workspace-not-found">
      <FolderSearch aria-hidden="true" />
      <p className="project-workspace-eyebrow">Project unavailable</p>
      <h1>This workspace could not be found</h1>
      <p>It may no longer exist, or it may not belong to this account.</p>
      <Link href="/projects">Choose another project</Link>
    </main>
  );
}
