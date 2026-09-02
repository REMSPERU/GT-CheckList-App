import type { PublicProgressResponse } from '@/types/progress';
import { getProgressBreakdown } from '@/utils/progress';
const labels: Record<string, string> = {
  PLANIFICACION: 'Planificación',
  EN_CURSO: 'En curso',
  PAUSADO: 'Pausado',
  RETRASADO: 'Retrasado',
  COMPLETADO: 'Completado',
};
export function PublicProgressDashboard({
  data,
}: {
  data: PublicProgressResponse;
}) {
  const projectProgress = data.projects
    .map(project => ({
      project,
      progress: getProgressBreakdown(project.stages, project.current_progress),
    }))
    .sort(
      (a, b) =>
        b.progress.final - a.progress.final ||
        a.project.sequence_number - b.project.sequence_number,
    );
  const completed = data.projects.filter(
    project => project.current_status === 'COMPLETADO',
  ).length;
  const inProgress = data.projects.filter(
    project =>
      project.current_status === 'EN_CURSO' ||
      project.current_status === 'PAUSADO' ||
      project.current_status === 'RETRASADO',
  ).length;
  const pending = data.projects.length - completed - inProgress;
  const total = data.projects.length || 1;
  const completedDegrees = (completed / total) * 360;
  const inProgressDegrees = (inProgress / total) * 360;
  const averageFinal = data.projects.length
    ? Math.round(
        projectProgress.reduce((sum, item) => sum + item.progress.final, 0) /
          data.projects.length,
      )
    : 0;
  const averageTechnical = data.projects.length
    ? Math.round(
        projectProgress.reduce(
          (sum, item) => sum + item.progress.technical,
          0,
        ) / data.projects.length,
      )
    : 0;
  const averageAdministration = data.projects.length
    ? Math.round(
        projectProgress.reduce(
          (sum, item) => sum + item.progress.administration,
          0,
        ) / data.projects.length,
      )
    : 0;
  const statusLegend = [
    { label: 'Completados', count: completed, color: '#1c9b61' },
    { label: 'En proceso', count: inProgress, color: '#e9a514' },
    { label: 'Pendientes', count: pending, color: '#d34b4b' },
  ];
  return (
    <main className="min-h-screen bg-[#edf1f6] px-4 py-6 text-[#15233a] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold tracking-[0.2em] text-[#2878c5]">
              REMS · GT
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
              Avance de proyectos
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Seguimiento para {data.viewer.display_name}
            </p>
          </div>
        </header>
        <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            {
              label: 'Proyectos activos',
              value: data.projects.length,
              detail: 'asignados a este enlace',
              tone: 'text-[#15233a]',
            },
            {
              label: 'Avance final',
              value: `${averageFinal}%`,
              detail: 'promedio ponderado',
              tone: 'text-[#2878c5]',
            },
            {
              label: 'Gestión técnica',
              value: `${averageTechnical}%`,
              detail: 'promedio del grupo',
              tone: 'text-[#2878c5]',
            },
            {
              label: 'Administración',
              value: `${averageAdministration}%`,
              detail: 'promedio del grupo',
              tone: 'text-[#b77900]',
            },
            {
              label: 'Completados',
              value: completed,
              detail: `de ${data.projects.length} proyectos`,
              tone: 'text-[#1c9b61]',
            },
          ].map(kpi => (
            <div
              className="min-w-0 border border-slate-200 bg-white p-4 shadow-sm first:rounded-l-xl last:rounded-r-xl sm:p-5"
              key={kpi.label}>
              <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                {kpi.label}
              </p>
              <p className={`mt-2 text-2xl font-extrabold ${kpi.tone}`}>
                {kpi.value}
              </p>
              <p className="mt-1 truncate text-xs text-slate-500">
                {kpi.detail}
              </p>
            </div>
          ))}
        </section>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="border-l-4 border-[#2878c5] pl-3 text-sm font-extrabold uppercase tracking-wide">
              Avance por proyecto
            </h2>
            <div className="mt-4 max-h-[590px] space-y-1 overflow-y-auto pr-2">
              {data.projects.length === 0 ? (
                <div className="rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-500">
                  No hay proyectos asignados actualmente.
                </div>
              ) : (
                projectProgress.map(({ project, progress }) => (
                  <article
                    className="border-b border-slate-100 py-3 last:border-0"
                    key={`${project.sequence_number}-${project.name}`}>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {project.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {project.project_type}
                        </p>
                      </div>
                      <span className="w-10 text-right text-sm font-extrabold">
                        {progress.final}%
                      </span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="flex h-full"
                        style={{ width: `${progress.final}%` }}>
                        <div
                          className="h-full bg-[#2878c5]"
                          style={{
                            width: `${progress.final ? (progress.technical * 80) / progress.final : 0}%`,
                          }}
                        />
                        <div
                          className="h-full bg-[#e9a514]"
                          style={{
                            width: `${progress.final ? (progress.administration * 20) / progress.final : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-1 flex gap-3 text-[11px] font-semibold text-slate-500">
                      <span>
                        <i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#2878c5]" />
                        Técnica {progress.technical}%
                      </span>
                      <span>
                        <i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#e9a514]" />
                        Administración {progress.administration}%
                      </span>
                      <span className="ml-auto">
                        {labels[project.current_status]}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="border-l-4 border-[#2878c5] pl-3 text-sm font-extrabold uppercase tracking-wide">
              Estado de proyectos
            </h2>
            <div className="flex flex-col items-center py-10">
              <div
                className="grid h-48 w-48 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#1c9b61 0deg ${completedDegrees}deg, #e9a514 ${completedDegrees}deg ${completedDegrees + inProgressDegrees}deg, #d34b4b ${completedDegrees + inProgressDegrees}deg 360deg)`,
                }}>
                <div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center">
                  <div>
                    <strong className="block text-2xl">{averageFinal}%</strong>
                    <span className="text-xs text-slate-500">
                      Avance promedio
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-8 w-full space-y-3">
                {statusLegend.map(item => (
                  <div
                    className="flex items-center gap-2 text-sm"
                    key={item.label}>
                    <i
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.label}</span>
                    <strong className="ml-auto">
                      {item.count} ({Math.round((item.count / total) * 100)}%)
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
