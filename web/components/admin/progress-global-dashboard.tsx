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
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {[
            [
              'Proyectos',
              projects.length,
              'total registrado',
              'text-slate-900',
            ],
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
            <div className="min-w-0 p-5" key={label}>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                {label}
              </p>
              <p className={`mt-2 text-3xl font-extrabold ${tone}`}>{value}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">
              Avance por proyecto
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Ordenado de mayor a menor avance
            </p>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {rankedProjects.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                No hay proyectos registrados.
              </p>
            ) : (
              rankedProjects.map(({ project, progress }) => (
                <article className="py-3" key={project.id}>
                  <div className="flex items-center gap-3">
                    <span className="w-7 shrink-0 font-mono text-xs text-slate-400">
                      #{project.sequence_number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {project.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {project.project_type}
                      </p>
                    </div>
                    <strong className="w-11 shrink-0 text-right text-sm text-slate-900">
                      {progress.final}%
                    </strong>
                  </div>
                  <div className="mt-2 ml-10 flex h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-[#2878c5]"
                      style={{ width: `${progress.technical * 0.8}%` }}
                    />
                    <div
                      className="h-full bg-[#e9a514]"
                      style={{ width: `${progress.administration * 0.2}%` }}
                    />
                  </div>
                  <div className="mt-1 ml-10 flex gap-3 text-[11px] font-semibold text-slate-500">
                    <span>Técnica {progress.technical}%</span>
                    <span>Administración {progress.administration}%</span>
                  </div>
                  {project.observations?.trim() && (
                    <p className="mt-2 ml-10 rounded-md bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                      <span className="font-bold text-slate-700">
                        Comentario:
                      </span>{' '}
                      {project.observations.trim()}
                    </p>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-extrabold tracking-tight text-slate-900">
            Estado de proyectos
          </h2>
          <div className="mt-5 space-y-4">
            {statusCounts.map(({ status, count }) => (
              <div key={status}>
                <div className="flex items-center gap-2 text-sm">
                  <i
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: statusColors[status] }}
                  />
                  <span className="flex-1 text-slate-700">
                    {statusLabels[status]}
                  </span>
                  <strong className="text-slate-900">{count}</strong>
                  <span className="w-10 text-right text-xs text-slate-400">
                    {Math.round((count / total) * 100)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
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
        </section>
      </div>
    </div>
  );
}
