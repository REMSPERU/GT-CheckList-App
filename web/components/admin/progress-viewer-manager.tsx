'use client';
import { useState } from 'react';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import type { ProgressViewer } from '@/types/progress';
export function ProgressViewerManager({
  viewers,
  onCreate,
  onUpdate,
  onDelete,
}: {
  viewers: ProgressViewer[];
  onCreate: (name: string) => Promise<ProgressViewer>;
  onUpdate: (
    id: string,
    input: { is_active?: boolean; regenerate?: boolean },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ProgressViewer | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  async function removeViewer() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(pendingDelete.id);
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">Enlaces por gerente</h2>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async e => {
            e.preventDefault();
            if (name.trim()) {
              await onCreate(name.trim());
              setName('');
            }
          }}>
          <input
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Nombre del gerente"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">
            Crear
          </button>
        </form>
        <div className="mt-4 space-y-2">
          {viewers.map(viewer => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-sm"
              key={viewer.id}>
              <span
                className={
                  viewer.is_active
                    ? 'font-semibold'
                    : 'text-slate-400 line-through'
                }>
                {viewer.display_name}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-emerald-700"
                  onClick={() =>
                    void navigator.clipboard.writeText(
                      `${window.location.origin}/avance/${viewer.public_token}`,
                    )
                  }>
                  <Copy size={13} />
                  Copiar enlace
                </button>
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1 text-xs text-slate-500"
                  onClick={() =>
                    void onUpdate(viewer.id, { regenerate: true })
                  }>
                  <RefreshCw size={13} />
                  Regenerar
                </button>
                <button
                  type="button"
                  className="cursor-pointer text-xs text-slate-500"
                  onClick={() =>
                    void onUpdate(viewer.id, { is_active: !viewer.is_active })
                  }>
                  {viewer.is_active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-red-700"
                  onClick={() => setPendingDelete(viewer)}>
                  <Trash2 size={13} />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <ConfirmationDialog
        open={pendingDelete !== null}
        title="¿Eliminar gerente?"
        description={
          <>
            Se eliminará definitivamente{' '}
            <strong>{pendingDelete?.display_name}</strong>. Sus proyectos
            permanecerán, pero quedarán sin gerente asignado.
          </>
        }
        confirmLabel="Sí, eliminar gerente"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={() => void removeViewer()}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
