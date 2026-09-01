import type { ProgressProject } from '@/types/progress';
const labels: Record<string, string> = {
  PLANIFICACION: 'Planificación',
  EN_CURSO: 'En curso',
  PAUSADO: 'Pausado',
  RETRASADO: 'Retrasado',
  COMPLETADO: 'Completado',
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
            <th className="px-4 py-3">Avance</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {projects.map(project => (
            <tr
              key={project.id}
              className="cursor-pointer hover:bg-emerald-50/50"
              onClick={() => onSelect(project)}>
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
                      className="h-2 rounded-full bg-emerald-600"
                      style={{ width: `${project.current_progress}%` }}
                    />
                  </div>
                  <span className="font-semibold">
                    {project.current_progress}%
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                  {labels[project.current_status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
