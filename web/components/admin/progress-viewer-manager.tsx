'use client';
import { useState } from 'react';
import type { ProgressViewer } from '@/types/progress';
export function ProgressViewerManager({
  viewers,
  onCreate,
  onUpdate,
}: {
  viewers: ProgressViewer[];
  onCreate: (name: string) => Promise<ProgressViewer>;
  onUpdate: (
    id: string,
    input: { is_active?: boolean; regenerate?: boolean },
  ) => Promise<void>;
}) {
  const [name, setName] = useState('');
  return (
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
                className="text-xs font-semibold text-emerald-700"
                onClick={() =>
                  void navigator.clipboard.writeText(
                    `${window.location.origin}/avance/${viewer.public_token}`,
                  )
                }>
                Copiar enlace
              </button>
              <button
                className="text-xs text-slate-500"
                onClick={() => void onUpdate(viewer.id, { regenerate: true })}>
                Regenerar
              </button>
              <button
                className="text-xs text-slate-500"
                onClick={() =>
                  void onUpdate(viewer.id, { is_active: !viewer.is_active })
                }>
                {viewer.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
