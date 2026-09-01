'use client';
import { useMemo, useState } from 'react';
import { AdminTableShell } from '@/components/admin/admin-table-shell';
import { ProgressProjectDetail } from '@/components/admin/progress-project-detail';
import { ProgressProjectTable } from '@/components/admin/progress-project-table';
import { ProgressViewerManager } from '@/components/admin/progress-viewer-manager';
import { useAdminProgress } from '@/hooks/admin/use-admin-progress';
import type { ProgressProject } from '@/types/progress';
export default function ProgressAdminPage() {
  const data = useAdminProgress();
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
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
    [data.projects, search, activeOnly],
  );
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
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            REMS · GT
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Avance de proyectos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Seguimiento operativo y enlaces públicos por gerente.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
          <div className="space-y-5">
            <AdminTableShell summary={`${filtered.length} proyectos`}>
              <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
                <input
                  className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Buscar número, proyecto, tipo o gerente"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <label className="flex items-center gap-2 px-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={activeOnly}
                    onChange={e => setActiveOnly(e.target.checked)}
                  />
                  Solo activos
                </label>
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
            <form
              onSubmit={e => void create(e)}
              className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-slate-900">Nuevo proyecto</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-[100px_1fr_1fr_auto]">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  type="number"
                  placeholder="#"
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
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Proyecto"
                  value={newProject.name}
                  onChange={e =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                />
                <input
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Tipo de proyecto"
                  value={newProject.project_type}
                  onChange={e =>
                    setNewProject({
                      ...newProject,
                      project_type: e.target.value,
                    })
                  }
                />
                <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white">
                  Crear
                </button>
              </div>
            </form>
          </div>
          <ProgressViewerManager
            viewers={data.viewers}
            onCreate={data.createViewer}
            onUpdate={data.updateViewer}
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
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
