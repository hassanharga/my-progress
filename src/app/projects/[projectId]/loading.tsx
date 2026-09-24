export default function ProjectWorkspaceLoading() {
  return (
    <main
      className="project-workspace project-workspace-loading"
      aria-busy="true"
      aria-label="Loading project workspace"
    >
      <div className="project-workspace-loading__header" />
      <div className="project-workspace-loading__summary" />
      <div className="project-workspace-loading__filters" />
      <div className="project-workspace-loading__ledger" />
      <span className="sr-only">Loading project workspace</span>
    </main>
  );
}
