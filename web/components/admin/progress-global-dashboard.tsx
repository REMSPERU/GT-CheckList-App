import type { ProgressProject, ProgressStatus } from '@/types/progress';
import { getProgressBreakdown } from '@/utils/progress';

const statusLabels: Record<ProgressStatus, string> = {
  PLANIFICACION: 'Planificación',
  EN_CURSO: 'En curso',
  PAUSADO: 'Pausado',
  RETRASADO: 'Retrasado',
  COMPLETADO: 'Completado',
};

const statusColors: Record<ProgressStatus, string> = {
  PLANIFICACION: '#94a3b8',
  EN_CURSO: '#2878c5',
  PAUSADO: '#e9a514',
  RETRASADO: '#d34b4b',
  COMPLETADO: '#1c9b61',
};

export function ProgressGlobalDashboard({
  projects,
}: {
  projects: ProgressProject[];
}) {
  const rankedProjects = projects
    .map(project => ({
      project,
      progress: getProgressBreakdown(project.stages, project.current_progress),
    }))
    .sort(
      (a, b) =>
        b.progress.final - a.progress.final ||
        a.project.sequence_number - b.project.sequence_number,
    );
  const average = (group: 'final' | 'technical' | 'administration') =>
    projects.length
      ? Math.round(
          rankedProjects.reduce((sum, item) => sum + item.progress[group], 0) /
            projects.length,
        )
      : 0;
  const statusCounts = (Object.keys(statusLabels) as ProgressStatus[]).map(
    status => ({
      status,
      count: projects.filter(project => project.current_status === status)
        .length,
    }),
  );
  const total = projects.length || 1;

  return (
    <section className="mb-5 space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            Resumen global
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Vista ejecutiva de todos los proyectos registrados.
          </p>
        </div>
        <span className="hidden rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 sm:block">
          {projects.length} proyectos
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Proyectos', projects.length, 'total registrado', 'text-slate-900'],
          [
            'Avance final',
            `${average('final')}%`,
            'promedio ponderado',
            'text-[#2878c5]',
          ],
          [
            'Gestión técnica',
            `${average('technical')}%`,
            'promedio del grupo',
            'text-[#2878c5]',
          ],
          [
            'Administración',
            `${average('administration')}%`,
            'promedio del grupo',
            'text-[#b77900]',
          ],
        ].map(([label, value, detail, tone]) => (
          <div
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            key={label}>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              {label}
            </p>
            <p className={`mt-2 text-2xl font-extrabold ${tone}`}>{value}</p>
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
              Avance de todos los proyectos
            </h3>
            <span className="text-xs text-slate-400">Mayor a menor</span>
          </div>
          <div className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-2">
            {rankedProjects.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No hay proyectos registrados.
              </p>
            ) : (
              rankedProjects.map(({ project, progress }) => (
                <div className="py-2" key={project.id}>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-7 font-mono text-xs text-slate-400">
                      #{project.sequence_number}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">
                      {project.name}
                    </span>
                    <strong className="w-10 text-right text-slate-900">
                      {progress.final}%
                    </strong>
                  </div>
                  <div className="mt-1 ml-10 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#2878c5]"
                      style={{ width: `${progress.final}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
            Estado de proyectos
          </h3>
          <div className="mt-4 space-y-3">
            {statusCounts.map(({ status, count }) => (
              <div key={status}>
                <div className="flex items-center gap-2 text-sm">
                  <i
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: statusColors[status] }}
                  />
                  <span className="flex-1">{statusLabels[status]}</span>
                  <strong>{count}</strong>
                  <span className="w-10 text-right text-xs text-slate-400">
                    {Math.round((count / total) * 100)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: statusColors[status],
                      width: `${(count / total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
