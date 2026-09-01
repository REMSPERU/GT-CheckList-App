import type { PublicProgressResponse } from '@/types/progress';
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
  return (
    <main className="min-h-screen bg-[#f6f7f5] px-4 py-8 text-[#1b2a4a] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] text-[#3e7cb8]">
          REMS · GT
        </p>
        <h1 className="mt-2 text-2xl font-bold">Avance de proyectos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Seguimiento para {data.viewer.display_name}
        </p>
        <div className="mt-6 space-y-4">
          {data.projects.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No hay proyectos asignados actualmente.
            </div>
          ) : (
            data.projects.map(project => (
              <article
                className="rounded-lg border border-slate-200 bg-white p-5"
                key={`${project.sequence_number}-${project.name}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-slate-500">
                      PROYECTO {project.sequence_number}
                    </p>
                    <h2 className="mt-1 text-lg font-bold">{project.name}</h2>
                    <p className="text-sm text-slate-500">
                      {project.project_type}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                    {labels[project.current_status]}
                  </span>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-[#3e7cb8]"
                      style={{ width: `${project.current_progress}%` }}
                    />
                  </div>
                  <strong>{project.current_progress}%</strong>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {[...project.stages]
                    .sort((a, b) => a.position - b.position)
                    .map(stage => (
                      <div
                        className={`rounded border px-3 py-2 text-sm ${stage.is_completed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-100 text-slate-400'}`}
                        key={stage.stage_key}>
                        {stage.is_completed ? '✓' : '○'} {stage.stage_label}
                      </div>
                    ))}
                </div>
                {project.observations && (
                  <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
                    {project.observations}
                  </p>
                )}
                <p className="mt-3 text-xs text-slate-400">
                  Actualizado:{' '}
                  {new Date(project.updated_at).toLocaleString('es-PE')}
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
