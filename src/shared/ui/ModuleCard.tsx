import { ArrowUpRight } from 'lucide-react';
import { WorkspaceModule } from '../../types/domain';

interface ModuleCardProps {
  module: WorkspaceModule;
  onOpen?: (module: WorkspaceModule) => void;
}

export function ModuleCard({ module, onOpen }: ModuleCardProps) {
  return (
    <article className="bo-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{module.title}</h2>
        <span className="bo-pill">{module.status}</span>
      </div>
      <p className="mt-2 text-xs text-slate-300">{module.description}</p>
      {onOpen ? (
        <button className="bo-link mt-3 w-full" onClick={() => onOpen(module)}>
          Open module <ArrowUpRight className="ml-1 inline" size={12} />
        </button>
      ) : null}
    </article>
  );
}
