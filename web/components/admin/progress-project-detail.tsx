'use client';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import type { ProgressProject } from '@/types/progress';
export function ProgressProjectDetail({
  project,
  viewers,
  onSave,
  onStages,
  onDelete,
  onClose,
}: {
  project: ProgressProject;
  viewers: { id: string; display_name: string }[];
  onSave: (input: Partial<ProgressProject>) => Promise<void>;
  onStages: (stages: ProgressProject['stages']) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(project);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const stages = [...(draft.stages ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  async function save() {
    setSaving(true);
    try {
      await onSave({
        assigned_viewer_id: draft.assigned_viewer_id,
        manager_name: draft.manager_name,
        observations: draft.observations,
        current_status: draft.current_status,
        is_active: draft.is_active,
      });
      await onStages(stages);
      onClose();
    } finally {
      setSaving(false);
    }
  }
  async function remove() {
    setSaving(true);
    try {
      await onDelete();
      setShowDeleteConfirmation(false);
      onClose();
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Proyecto {draft.sequence_number}
            </p>
            <h2 className="text-xl font-bold text-slate-900">{draft.name}</h2>
          </div>
          <button
            className="text-2xl text-slate-400"
            onClick={onClose}
            aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-500">
            Gerente
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              value={draft.assigned_viewer_id ?? ''}
              onChange={e =>
                setDraft({
                  ...draft,
                  assigned_viewer_id: e.target.value || null,
                })
              }>
              <option value="">Sin asignar</option>
              {viewers.map(viewer => (
                <option key={viewer.id} value={viewer.id}>
                  {viewer.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">
            Estado
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              value={draft.current_status}
              onChange={e =>
                setDraft({
                  ...draft,
                  current_status: e.target
                    .value as ProgressProject['current_status'],
                })
              }>
              <option value="PLANIFICACION">Planificación</option>
              <option value="EN_CURSO">En curso</option>
              <option value="PAUSADO">Pausado</option>
              <option value="RETRASADO">Retrasado</option>
              <option value="COMPLETADO">Completado</option>
            </select>
          </label>
        </div>
        <label className="mt-4 block text-xs font-bold text-slate-500">
          Observaciones
          <textarea
            className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            value={draft.observations ?? ''}
            onChange={e => setDraft({ ...draft, observations: e.target.value })}
          />
        </label>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {stages.map(stage => (
            <label
              key={stage.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm">
              <input
                type="checkbox"
                checked={stage.is_completed}
                onChange={e =>
                  setDraft({
                    ...draft,
                    stages: stages.map(item =>
                      item.id === stage.id
                        ? { ...item, is_completed: e.target.checked }
                        : item,
                    ),
                  })
                }
              />
              {stage.position}. {stage.stage_label}
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            className="mr-auto inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setShowDeleteConfirmation(true)}>
            <Trash2 size={15} />
            Eliminar proyecto
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            onClick={() => void save()}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </section>
      <ConfirmationDialog
        open={showDeleteConfirmation}
        title="¿Eliminar proyecto?"
        description={
          <>
            Se eliminará definitivamente <strong>{draft.name}</strong>, junto
            con sus etapas e historial. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Sí, eliminar proyecto"
        variant="danger"
        isLoading={saving}
        onConfirm={() => void remove()}
        onCancel={() => setShowDeleteConfirmation(false)}
      />
    </div>
  );
}
