'use client';
import { useMemo, useState } from 'react';
import { Filter, Plus, RotateCcw, Search, X } from 'lucide-react';
import { AdminTableShell } from '@/components/admin/admin-table-shell';
import { ProgressProjectDetail } from '@/components/admin/progress-project-detail';
import { ProgressProjectTable } from '@/components/admin/progress-project-table';
import { ProgressViewerManager } from '@/components/admin/progress-viewer-manager';
import { useAdminProgress } from '@/hooks/admin/use-admin-progress';
import type { ProgressProject, ProgressStatus } from '@/types/progress';

const STATUS_OPTIONS: { value: ProgressStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'PLANIFICACION', label: 'Planificación' },
  { value: 'EN_CURSO', label: 'En curso' },
  { value: 'PAUSADO', label: 'Pausado' },
  { value: 'RETRASADO', label: 'Retrasado' },
  { value: 'COMPLETADO', label: 'Completado' },
];

export default function ProgressAdminPage() {
  const data = useAdminProgress();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProgressStatus | ''>('');
  const [viewerId, setViewerId] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<ProgressProject | null>(null);
  const [newProject, setNewProject] = useState({
    sequence_number: '',
    name: '',
    project_type: '',
  });
  const filtered = useMemo(
    () =>
      data.projects.filter(
        item =>
          (!activeOnly || item.is_active) &&
          (!status || item.current_status === status) &&
          (!viewerId || item.assigned_viewer_id === viewerId) &&
          [
            item.name,
            item.project_type,
            item.manager_name ?? '',
            String(item.sequence_number),
          ]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [data.projects, search, activeOnly, status, viewerId],
  );
  const activeFilterCount = [status, viewerId, !activeOnly].filter(
    Boolean,
  ).length;

  function clearFilters() {
    setSearch('');
    setStatus('');
    setViewerId('');
    setActiveOnly(true);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!newProject.name || !newProject.project_type) return;
    await data.saveProject({
      sequence_number:
        Number(newProject.sequence_number) || data.projects.length + 1,
      name: newProject.name,
      project_type: newProject.project_type,
    });
    setNewProject({ sequence_number: '', name: '', project_type: '' });
  }
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Avance de proyectos
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Controla etapas, responsables y enlaces de seguimiento.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(open => !open)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#072e27] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#05221d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
            {showCreate ? <X size={17} /> : <Plus size={17} />}
            {showCreate ? 'Cerrar formulario' : 'Nuevo proyecto'}
          </button>
        </div>
        {showCreate && (
          <form
            onSubmit={e => {
              void create(e).then(() => setShowCreate(false));
            }}
            className="mb-5 rounded-xl border border-emerald-900/15 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">Nuevo proyecto</h2>
                <p className="mt-1 text-sm text-slate-500">
                  La fila se creará con sus diez etapas pendientes.
                </p>
              </div>
              <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                Avance inicial: 0%
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[100px_1fr_1fr_auto]">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                type="number"
                min="1"
                placeholder="#"
                aria-label="Número de proyecto"
                value={newProject.sequence_number}
                onChange={e =>
                  setNewProject({
                    ...newProject,
                    sequence_number: e.target.value,
                  })
                }
              />
              <input
                required
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                placeholder="Nombre del proyecto o inmueble"
                value={newProject.name}
                onChange={e =>
                  setNewProject({ ...newProject, name: e.target.value })
                }
              />
              <input
                required
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                placeholder="Tipo de proyecto"
                value={newProject.project_type}
                onChange={e =>
                  setNewProject({
                    ...newProject,
                    project_type: e.target.value,
                  })
                }
              />
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                <Plus size={16} />
                Crear proyecto
              </button>
            </div>
          </form>
        )}
        <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
          <div className="space-y-5">
            <AdminTableShell summary={`${filtered.length} proyectos`}>
              <div className="border-b border-slate-200 p-4">
                <div className="flex flex-wrap gap-2">
                  <label className="relative min-w-[220px] flex-1">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                      placeholder="Buscar por número, proyecto, tipo o gerente"
                      aria-label="Buscar proyectos"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFilters(open => !open)}
                    className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${showFilters || activeFilterCount > 0 ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                    <Filter size={16} />
                    Filtros
                    {activeFilterCount > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-emerald-700 px-1 text-[11px] text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                  {(search || activeFilterCount > 0) && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
                      <RotateCcw size={15} />
                      Limpiar
                    </button>
                  )}
                </div>
                {showFilters && (
                  <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3">
                    <label className="grid gap-1.5 text-xs font-bold text-slate-500">
                      Estado
                      <select
                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                        value={status}
                        onChange={e =>
                          setStatus(e.target.value as ProgressStatus | '')
                        }>
                        {STATUS_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold text-slate-500">
                      Gerente
                      <select
                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                        value={viewerId}
                        onChange={e => setViewerId(e.target.value)}>
                        <option value="">Todos los gerentes</option>
                        {data.viewers.map(viewer => (
                          <option key={viewer.id} value={viewer.id}>
                            {viewer.display_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex h-10 items-center gap-2 self-end rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={activeOnly}
                        onChange={e => setActiveOnly(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                      />
                      Solo proyectos activos
                    </label>
                  </div>
                )}
              </div>
              {data.isLoading ? (
                <p className="p-8 text-center text-sm text-slate-500">
                  Cargando proyectos...
                </p>
              ) : data.error ? (
                <p className="p-8 text-center text-sm text-red-700">
                  {data.error}
                </p>
              ) : filtered.length ? (
                <ProgressProjectTable
                  projects={filtered}
                  onSelect={setSelected}
                />
              ) : (
                <p className="p-8 text-center text-sm text-slate-500">
                  No hay proyectos que coincidan.
                </p>
              )}
            </AdminTableShell>
          </div>
          <ProgressViewerManager
            viewers={data.viewers}
            onCreate={data.createViewer}
            onUpdate={data.updateViewer}
            onDelete={data.deleteViewer}
          />
        </div>
      </div>
      {selected && (
        <ProgressProjectDetail
          project={selected}
          viewers={data.viewers}
          onSave={input =>
            data.updateProject(selected.id, input).then(() => undefined)
          }
          onStages={stages => data.updateStages(selected, stages)}
          onDelete={() => data.deleteProject(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
