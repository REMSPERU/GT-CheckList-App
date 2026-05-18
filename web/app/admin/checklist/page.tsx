'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  listAdminChecklistQuestions,
  listAdminChecklistResponses,
  listAdminEquipmentTypes,
  updateAdminChecklistQuestion,
  type AdminChecklistQuestionRow,
  type AdminChecklistResponseRow,
  type AdminEquipmentTypeRow,
} from '@/lib/admin-queries';
import { getSupabaseClient } from '@/lib/supabase-browser';

const RESPONSE_PAGE_SIZE = 20;

interface QuestionGroup {
  key: string;
  systemName: string;
  equipmentName: string;
  questions: AdminChecklistQuestionRow[];
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-PE');
}

export default function AdminChecklistPage() {
  const [equipmentTypes, setEquipmentTypes] = useState<AdminEquipmentTypeRow[]>(
    [],
  );
  const [selectedEquipmentType, setSelectedEquipmentType] = useState('');
  const [questions, setQuestions] = useState<AdminChecklistQuestionRow[]>([]);
  const [responses, setResponses] = useState<AdminChecklistResponseRow[]>([]);
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(
    null,
  );
  const [expandedQuestionGroups, setExpandedQuestionGroups] = useState<
    Record<string, boolean>
  >({});
  const [responsePage, setResponsePage] = useState(1);
  const [responseTotal, setResponseTotal] = useState(0);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEquipmentTypes() {
      try {
        const supabase = getSupabaseClient();
        const result = await listAdminEquipmentTypes(supabase);
        if (isMounted) setEquipmentTypes(result);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los tipos de equipo',
          );
        }
      }
    }

    loadEquipmentTypes();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadChecklistData() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();
        const [questionResult, responseResult] = await Promise.all([
          listAdminChecklistQuestions(supabase, selectedEquipmentType || undefined),
          listAdminChecklistResponses(supabase, {
            page: responsePage,
            pageSize: RESPONSE_PAGE_SIZE,
            equipamentoId: selectedEquipmentType || undefined,
          }),
        ]);

        if (isMounted) {
          setQuestions(questionResult);
          setResponses(responseResult.items);
          setResponseTotal(responseResult.total);
          setExpandedResponseId(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar la informacion de checklist',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadChecklistData();

    return () => {
      isMounted = false;
    };
  }, [responsePage, selectedEquipmentType]);

  const responseTotalPages = useMemo(
    () => Math.max(1, Math.ceil(responseTotal / RESPONSE_PAGE_SIZE)),
    [responseTotal],
  );

  const groupedQuestions = useMemo<QuestionGroup[]>(() => {
    const groups = new Map<string, QuestionGroup>();

    questions.forEach(question => {
      const key = `${question.systemName}::${question.equipmentName}`;
      const current = groups.get(key) ?? {
        key,
        systemName: question.systemName,
        equipmentName: question.equipmentName,
        questions: [],
      };

      current.questions.push(question);
      groups.set(key, current);
    });

    return Array.from(groups.values()).sort((a, b) => {
      const systemCompare = a.systemName.localeCompare(b.systemName, 'es');
      if (systemCompare !== 0) return systemCompare;
      return a.equipmentName.localeCompare(b.equipmentName, 'es');
    });
  }, [questions]);

  function handleEquipmentTypeChange(value: string) {
    setSelectedEquipmentType(value);
    setResponsePage(1);
    setExpandedQuestionGroups({});
  }

  function toggleQuestionGroup(groupKey: string) {
    setExpandedQuestionGroups(current => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  }

  function updateQuestionDraft(
    questionId: string,
    patch: Partial<Pick<AdminChecklistQuestionRow, 'activa' | 'ponderado'>>,
  ) {
    setQuestions(current =>
      current.map(question =>
        question.id === questionId ? { ...question, ...patch } : question,
      ),
    );
  }

  async function handleSaveQuestion(question: AdminChecklistQuestionRow) {
    try {
      setSavingQuestionId(question.id);
      setErrorMessage(null);
      const supabase = getSupabaseClient();
      await updateAdminChecklistQuestion(supabase, {
        id: question.id,
        activa: question.activa === true,
        ponderado: question.ponderado,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la pregunta de checklist',
      );
    } finally {
      setSavingQuestionId(null);
    }
  }

  return (
    <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
      <section className="rounded-3xl border border-slate-900/10 bg-white/80 p-[26px] shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
        <div>
          <span className="mb-1.5 inline-block text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
            Checklist
          </span>
          <h2 className="m-0 text-[clamp(2rem,4vw,4.2rem)] font-bold tracking-[-0.04em] text-[#0c1720]">
            Preguntas y respuestas
          </h2>
          <p className="max-w-[680px] text-base text-slate-500">
            Administra la visibilidad de preguntas por equipamento y revisa como
            se respondieron los checklist sincronizados.
          </p>
        </div>
      </section>

      <section className="flex items-center gap-3 max-[640px]:flex-col max-[640px]:items-stretch">
        <select
          className="min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-[0.95rem] text-slate-900"
          value={selectedEquipmentType}
          onChange={event => handleEquipmentTypeChange(event.target.value)}>
          <option value="">Todos los equipamentos</option>
          {equipmentTypes.map(item => (
            <option value={item.id} key={item.id}>
              {item.systemName} · {item.nombre}{' '}
              {item.frecuencia ? `· ${item.frecuencia}` : ''}
            </option>
          ))}
        </select>
      </section>

      {errorMessage ? (
        <div className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[0.95rem] text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[22px] border border-emerald-800/25 bg-white/80 shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
        <div className="border-b border-slate-300 px-[18px] py-4 font-bold text-slate-500">
          {isLoading
            ? 'Cargando respuestas...'
            : `${responses.length} de ${responseTotal} respuestas · pagina ${responsePage} de ${responseTotalPages}`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                {['Fecha', 'Inmueble', 'Equipo', 'Frecuencia', 'Resumen', 'Detalle'].map(
                  header => (
                    <th
                      className="border-b border-slate-100 bg-slate-50 px-[18px] py-3.5 text-left align-top text-xs uppercase tracking-[0.08em] text-slate-500"
                      key={header}>
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {responses.map(response => (
                <tr key={response.id}>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    {formatDateTime(response.submitted_at)}
                  </td>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    {response.building_name ?? '-'}
                  </td>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    <strong className="block">{response.equipo_codigo ?? '-'}</strong>
                    <small className="mt-1 block text-slate-500">
                      {response.equipamento_nombre ?? '-'}
                    </small>
                  </td>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    <strong className="block">{response.frequency ?? '-'}</strong>
                    <small className="mt-1 block text-slate-500">
                      {response.period_start ?? ''}
                    </small>
                  </td>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    <strong className="block">
                      OK {response.total_ok ?? 0} / {response.total_questions ?? 0}
                    </strong>
                    <small className="mt-1 block text-slate-500">
                      Observadas {response.total_observed ?? 0} · Fotos{' '}
                      {response.total_photos ?? 0}
                    </small>
                  </td>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    <button
                      className="m-0 h-[34px] w-auto rounded-[10px] bg-teal-100 px-3 text-[0.84rem] font-bold text-teal-950 hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      onClick={() =>
                        setExpandedResponseId(current =>
                          current === response.id ? null : response.id,
                        )
                      }>
                      {expandedResponseId === response.id ? 'Ocultar' : 'Ver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {responses.map(response =>
          expandedResponseId === response.id ? (
            <div
              className="border-t border-slate-300 bg-[#fbfdfb] p-[18px]"
              key={`detail-${response.id}`}>
              <h3 className="mb-3 mt-0 text-lg font-bold">Detalle de respuestas</h3>
              {response.answers.length === 0 ? (
                <p>No hay detalle JSON de respuestas para este registro.</p>
              ) : (
                <div className="grid gap-2.5">
                  {response.answers.map(answer => (
                    <article
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3.5 gap-y-2.5 rounded-2xl border border-[#dfe8e5] bg-white p-3.5 max-[640px]:grid-cols-1"
                      key={`${response.id}-${answer.pregunta_id}`}>
                      <div>
                        <span className="mb-1.5 inline-block text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
                          Pregunta {answer.orden ?? '-'}
                        </span>
                        <h4 className="m-0 text-[#0c1720]">{answer.pregunta}</h4>
                      </div>
                      <span
                        className={
                          answer.status_ok
                            ? 'inline-flex min-h-7 items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-extrabold text-green-900'
                            : 'inline-flex min-h-7 items-center rounded-full bg-orange-100 px-2.5 py-1 text-xs font-extrabold text-orange-900'
                        }>
                        {answer.status_ok ? 'Conforme' : 'Observada'}
                      </span>
                      {answer.observacion ? (
                        <p className="col-span-full m-0 text-slate-500">
                          {answer.observacion}
                        </p>
                      ) : null}
                      <small className="col-span-full m-0 text-slate-500">
                        {answer.fotos.length} fotos
                      </small>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : null,
        )}

        <div className="flex items-center justify-end gap-3 border-t border-slate-300 px-[18px] py-3.5 font-bold text-slate-500 max-[640px]:flex-col max-[640px]:items-stretch">
          <button
            className="m-0 h-[38px] w-auto rounded-[10px] border-0 bg-emerald-800 px-3.5 font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={responsePage <= 1 || isLoading}
            onClick={() => setResponsePage(current => Math.max(1, current - 1))}>
            Anterior
          </button>
          <span>
            Pagina {responsePage} de {responseTotalPages}
          </span>
          <button
            className="m-0 h-[38px] w-auto rounded-[10px] border-0 bg-emerald-800 px-3.5 font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={responsePage >= responseTotalPages || isLoading}
            onClick={() =>
              setResponsePage(current =>
                Math.min(responseTotalPages, current + 1),
              )
            }>
            Siguiente
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-900/10 bg-white/80 shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
        <div className="border-b border-slate-300 px-[18px] py-4 font-bold text-slate-500">
          {isLoading
            ? 'Cargando preguntas...'
            : `${questions.length} preguntas en ${groupedQuestions.length} grupos`}
        </div>

        <div className="grid gap-4 p-[18px]">
          {groupedQuestions.map(group => (
            <section
              className="overflow-hidden rounded-[18px] border border-[#dfe8e5] bg-white"
              key={group.key}>
              <button
                className="m-0 flex h-auto w-full cursor-pointer items-center justify-between gap-3.5 rounded-none border-b border-[#e9efed] bg-gradient-to-br from-[#f7fbf7] to-[#effaf5] px-[18px] py-4 text-left text-inherit hover:from-[#effaf5] hover:to-[#e7f8ee] max-[640px]:flex-col max-[640px]:items-stretch"
                type="button"
                onClick={() => toggleQuestionGroup(group.key)}
                aria-expanded={expandedQuestionGroups[group.key] === true}>
                <div>
                  <span className="mb-1.5 inline-block text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
                    {group.systemName}
                  </span>
                  <h3 className="m-0 text-[#0c1720]">{group.equipmentName}</h3>
                </div>
                <strong className="whitespace-nowrap text-emerald-800">
                  {group.questions.length} preguntas ·{' '}
                  {expandedQuestionGroups[group.key] ? 'Ocultar' : 'Ver'}
                </strong>
              </button>

              {expandedQuestionGroups[group.key] ? (
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
                                updateQuestionDraft(question.id, {
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
                                updateQuestionDraft(question.id, {
                                  activa: event.target.value === 'true',
                                })
                              }>
                              <option value="true">Si</option>
                              <option value="false">No</option>
                            </select>
                          </label>
                          <button
                            className="m-0 h-[34px] w-auto rounded-[10px] bg-teal-100 px-3 text-[0.84rem] font-bold text-teal-950 hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
                            type="button"
                            disabled={savingQuestionId === question.id}
                            onClick={() => handleSaveQuestion(question)}>
                            {savingQuestionId === question.id
                              ? 'Guardando'
                              : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
