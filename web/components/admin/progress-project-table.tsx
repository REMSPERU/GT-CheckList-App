import type { ProgressProject } from '@/types/progress';
import { getProgressBreakdown } from '@/utils/progress';
const labels: Record<string, string> = {
  PLANIFICACION: 'Planificación',
  EN_CURSO: 'En curso',
  PAUSADO: 'Pausado',
  RETRASADO: 'Retrasado',
  COMPLETADO: 'Completado',
};
const statusStyles: Record<string, string> = {
  PLANIFICACION: 'bg-slate-100 text-slate-700',
  EN_CURSO: 'bg-blue-50 text-blue-800',
  PAUSADO: 'bg-amber-50 text-amber-800',
  RETRASADO: 'bg-red-50 text-red-800',
  COMPLETADO: 'bg-emerald-50 text-emerald-800',
};
export function ProgressProjectTable({
  projects,
  onSelect,
}: {
  projects: ProgressProject[];
  onSelect: (project: ProgressProject) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Proyecto</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Gerente</th>
            <th className="px-4 py-3">Gestión técnica</th>
            <th className="px-4 py-3">Administración</th>
            <th className="px-4 py-3">Avance final</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {projects.map(project =>
            (() => {
              const progress = getProgressBreakdown(
                project.stages,
                project.current_progress,
              );
              return (
                <tr
                  key={project.id}
                  className="cursor-pointer transition-colors hover:bg-emerald-50/50 focus-within:bg-emerald-50/50"
                  onClick={() => onSelect(project)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(project);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir proyecto ${project.name}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {project.sequence_number}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {project.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {project.project_type}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {project.assigned_viewer?.display_name ?? 'Sin asignar'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{ width: `${progress.technical}%` }}
                        />
                      </div>
                      <span className="font-semibold">
                        {progress.technical}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-amber-500"
                          style={{ width: `${progress.administration}%` }}
                        />
                      </div>
                      <span className="font-semibold">
                        {progress.administration}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {progress.final}%
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${statusStyles[project.current_status] ?? statusStyles.PLANIFICACION}`}>
                      {labels[project.current_status]}
                    </span>
                  </td>
                </tr>
              );
            })(),
          )}
        </tbody>
      </table>
    </div>
  );
}
