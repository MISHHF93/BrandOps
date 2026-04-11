import { WorkspaceModule } from '../../types/domain';

interface ModuleCardProps {
  module: WorkspaceModule;
}

export function ModuleCard({ module }: ModuleCardProps) {
  return (
    <article className="bo-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{module.title}</h2>
        <span className="bo-pill">{module.status}</span>
      </div>
      <p className="mt-2 text-xs" style={{ color: 'hsl(var(--bo-text-muted))' }}>
        {module.description}
      </p>
    </article>
  );
}
