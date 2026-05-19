import type { AdminChecklistQuestionRow } from '@/types/admin';
import type { QuestionGroup } from '@/hooks/admin/use-admin-checklist';

import { AdminTableShell } from './admin-table-shell';

interface ChecklistQuestionGroupsProps {
  questions: AdminChecklistQuestionRow[];
  groups: QuestionGroup[];
  expandedGroups: Record<string, boolean>;
  savingQuestionId: string | null;
  isLoading: boolean;
  onToggleGroup: (groupKey: string) => void;
  onUpdateQuestion: (
    questionId: string,
    patch: Partial<Pick<AdminChecklistQuestionRow, 'activa' | 'ponderado'>>,
  ) => void;
  onSaveQuestion: (question: AdminChecklistQuestionRow) => void;
}

export function ChecklistQuestionGroups({
  questions,
  groups,
  expandedGroups,
  savingQuestionId,
  isLoading,
  onToggleGroup,
  onUpdateQuestion,
  onSaveQuestion,
}: ChecklistQuestionGroupsProps) {
  return (
    <AdminTableShell
      summary={
        isLoading
          ? 'Cargando preguntas...'
          : `${questions.length} preguntas en ${groups.length} grupos`
      }>
      {groups.length === 0 && !isLoading ? (
        <div className="grid min-h-[180px] place-items-center px-5 py-10 text-center text-slate-500">
          <div>
            <strong className="block text-lg text-[#0c1720]">
              Sin preguntas
            </strong>
            <p className="mb-0 mt-2">
              No hay preguntas para el equipo seleccionado.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 p-[18px]">
        {groups.map(group => (
          <section
            className="overflow-hidden rounded-[18px] border border-[#dfe8e5] bg-white"
            key={group.key}>
            <button
              className="m-0 flex h-auto w-full cursor-pointer items-center justify-between gap-3.5 rounded-none border-b border-[#e9efed] bg-gradient-to-br from-[#f7fbf7] to-[#effaf5] px-[18px] py-4 text-left text-inherit hover:from-[#effaf5] hover:to-[#e7f8ee] max-[640px]:flex-col max-[640px]:items-stretch"
              type="button"
              onClick={() => onToggleGroup(group.key)}
              aria-expanded={expandedGroups[group.key] === true}>
              <div>
                <span className="mb-1.5 inline-block text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
                  {group.systemName}
                </span>
                <h3 className="m-0 text-[#0c1720]">{group.equipmentName}</h3>
              </div>
              <strong className="whitespace-nowrap text-emerald-800">
                {group.questions.length} preguntas ·{' '}
                {expandedGroups[group.key] ? 'Ocultar' : 'Ver'}
              </strong>
            </button>

            {expandedGroups[group.key] ? (
              <div className="grid">
                {group.questions.map(question => (
                  <article
                    className="grid grid-cols-[54px_minmax(0,1fr)] gap-3 border-b border-slate-100 px-[18px] py-3.5 last:border-b-0 max-[640px]:grid-cols-1"
                    key={question.id}>
                    <div className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-lime-200 font-black text-emerald-900 max-[640px]:w-full">
                      {question.orden ?? '-'}
                    </div>
                    <div>
                      <p className="m-0 font-semibold text-[#0c1720]">
                        {question.pregunta}
                      </p>
                      <div className="mt-3 flex flex-wrap items-end gap-2.5">
                        <label className="grid gap-1.5 text-sm font-semibold">
                          Ponderado
                          <input
                            className="m-0 h-9 w-[120px] rounded-[10px] border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300"
                            type="number"
                            step="0.01"
                            value={String(question.ponderado ?? '')}
                            onChange={event =>
                              onUpdateQuestion(question.id, {
                                ponderado: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="grid gap-1.5 text-sm font-semibold">
                          Activa
                          <select
                            className="min-h-9 rounded-[10px] border border-slate-300 bg-white px-3 py-1.5 text-[0.95rem] text-slate-900"
                            value={question.activa ? 'true' : 'false'}
                            onChange={event =>
                              onUpdateQuestion(question.id, {
                                activa: event.target.value === 'true',
                              })
                            }>
                            <option value="true">Sí</option>
                            <option value="false">No</option>
                          </select>
                        </label>
                        <span
                          className={`inline-flex h-9 items-center rounded-full px-2.5 text-xs font-extrabold ${
                            question.activa
                              ? 'bg-green-100 text-green-900'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                          {question.activa ? 'Visible en app' : 'Oculta en app'}
                        </span>
                        <button
                          className="m-0 h-[34px] w-auto rounded-[10px] bg-teal-100 px-3 text-[0.84rem] font-bold text-teal-950 hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          disabled={savingQuestionId === question.id}
                          onClick={() => onSaveQuestion(question)}>
                          {savingQuestionId === question.id
                            ? 'Guardando'
                            : 'Guardar'}
                        </button>
                        {savingQuestionId === question.id ? (
                          <small className="font-semibold text-slate-500">
                            Aplicando cambio...
                          </small>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </AdminTableShell>
  );
}
