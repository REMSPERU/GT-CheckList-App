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
    <main className="admin-content">
      <section className="section-heading">
        <div>
          <span className="eyebrow">Checklist</span>
          <h2>Preguntas y respuestas</h2>
          <p>
            Administra la visibilidad de preguntas por equipamento y revisa como
            se respondieron los checklist sincronizados.
          </p>
        </div>
      </section>

      <section className="table-toolbar">
        <select
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

      {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}

      <section className="table-card priority-card">
        <div className="table-meta">
          {isLoading
            ? 'Cargando respuestas...'
            : `${responses.length} de ${responseTotal} respuestas · pagina ${responsePage} de ${responseTotalPages}`}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Inmueble</th>
                <th>Equipo</th>
                <th>Frecuencia</th>
                <th>Resumen</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {responses.map(response => (
                <tr key={response.id}>
                  <td>{formatDateTime(response.submitted_at)}</td>
                  <td>{response.building_name ?? '-'}</td>
                  <td>
                    <strong>{response.equipo_codigo ?? '-'}</strong>
                    <small>{response.equipamento_nombre ?? '-'}</small>
                  </td>
                  <td>
                    <strong>{response.frequency ?? '-'}</strong>
                    <small>{response.period_start ?? ''}</small>
                  </td>
                  <td>
                    <strong>
                      OK {response.total_ok ?? 0} / {response.total_questions ?? 0}
                    </strong>
                    <small>
                      Observadas {response.total_observed ?? 0} · Fotos{' '}
                      {response.total_photos ?? 0}
                    </small>
                  </td>
                  <td>
                    <button
                      className="inline-button"
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
            <div className="response-detail" key={`detail-${response.id}`}>
              <h3>Detalle de respuestas</h3>
              {response.answers.length === 0 ? (
                <p>No hay detalle JSON de respuestas para este registro.</p>
              ) : (
                <div className="answer-list">
                  {response.answers.map(answer => (
                    <article
                      className="answer-card"
                      key={`${response.id}-${answer.pregunta_id}`}>
                      <div>
                        <span className="eyebrow">Pregunta {answer.orden ?? '-'}</span>
                        <h4>{answer.pregunta}</h4>
                      </div>
                      <span
                        className={
                          answer.status_ok ? 'status-pill' : 'status-pill warn'
                        }>
                        {answer.status_ok ? 'Conforme' : 'Observada'}
                      </span>
                      {answer.observacion ? <p>{answer.observacion}</p> : null}
                      <small>{answer.fotos.length} fotos</small>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : null,
        )}

        <div className="pagination-bar">
          <button
            type="button"
            disabled={responsePage <= 1 || isLoading}
            onClick={() => setResponsePage(current => Math.max(1, current - 1))}>
            Anterior
          </button>
          <span>
            Pagina {responsePage} de {responseTotalPages}
          </span>
          <button
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

      <section className="table-card">
        <div className="table-meta">
          {isLoading
            ? 'Cargando preguntas...'
            : `${questions.length} preguntas en ${groupedQuestions.length} grupos`}
        </div>

        <div className="question-groups">
          {groupedQuestions.map(group => (
            <section className="question-group" key={group.key}>
              <div className="question-group-header">
                <div>
                  <span className="eyebrow">{group.systemName}</span>
                  <h3>{group.equipmentName}</h3>
                </div>
                <strong>{group.questions.length} preguntas</strong>
              </div>

              <div className="question-list">
                {group.questions.map(question => (
                  <article className="question-card" key={question.id}>
                    <div className="question-order">{question.orden ?? '-'}</div>
                    <div className="question-body">
                      <p>{question.pregunta}</p>
                      <div className="question-controls">
                        <label>
                          Ponderado
                          <input
                            className="table-input"
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
                        <label>
                          Activa
                          <select
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
                          className="inline-button"
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
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
