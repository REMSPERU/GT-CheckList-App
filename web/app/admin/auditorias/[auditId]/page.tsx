'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Alert } from '@/components/ui/alert';
import { getSupabaseClient } from '@/lib/supabase-browser';
import {
  getAdminAuditSessionById,
  updateAdminAuditAnswers,
  updateAdminAuditFeedback,
} from '@/services/admin/audits.service';
import type {
  AdminAuditEquipmentFeedbackItem,
  AdminAuditPhotoRef,
  AdminAuditSessionRow,
} from '@/types/admin';
import { formatDate, formatDateTime } from '@/utils/date';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnswerFilter = 'observed' | 'photos' | 'all';

interface AnswerEditDraft {
  kind: 'answer';
  question_id: string;
  original_status: 'OK' | 'OBS';
  status: 'OK' | 'OBS';
  comment: string;
  existing_photos: AdminAuditPhotoRef[]; // Photos that haven't been deleted by user
  new_photos: File[];
  delete_all_existing_on_ok: boolean;
  confirming: boolean;
}

interface FeedbackEditDraft {
  kind: 'feedback';
  equipment_key: string;
  good_practices_comment: string;
  improvement_opportunity_comment: string;
  confirming: boolean;
}

type EditDraft = AnswerEditDraft | FeedbackEditDraft;

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconEdit() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateUniquePath(prefix: string, fileName: string): string {
  const extension = fileName.split('.').pop() || 'jpg';
  const randomStr = Math.random().toString(36).substring(2, 8);
  const timestamp = Date.now();
  return `${prefix}_${timestamp}_${randomStr}.${extension}`;
}

function getPhotoUrl(photo: AdminAuditPhotoRef): string {
  return photo.publicUrl ?? photo.public_url ?? photo.url ?? '';
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminAuditoriaDetailPage() {
  const params = useParams<{ auditId: string }>();
  const [audit, setAudit] = useState<AdminAuditSessionRow | null>(null);
  const [answerFilter, setAnswerFilter] = useState<AnswerFilter>('observed');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Shared edit state – only one item editable at a time
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();
        const result = await getAdminAuditSessionById(supabase, params.auditId);
        if (mounted) setAudit(result);
      } catch (error) {
        if (mounted)
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar la auditoria',
          );
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [params.auditId]);

  // ── Filtered answers ──────────────────────────────────────────────────────

  const filteredAnswers = useMemo(() => {
    const answers = audit?.answers ?? [];
    if (answerFilter === 'observed')
      return answers.filter(a => a.status === 'OBS');
    if (answerFilter === 'photos')
      return answers.filter(a => a.photos.length > 0);
    return answers;
  }, [answerFilter, audit?.answers]);

  // ── Edit helpers ──────────────────────────────────────────────────────────

  const cancelEdit = useCallback(() => {
    setEditDraft(null);
    setSaveError(null);
  }, []);

  const startAnswerEdit = useCallback(
    (
      question_id: string,
      status: 'OK' | 'OBS',
      comment: string | null,
      photos: AdminAuditPhotoRef[],
    ) => {
      setEditDraft({
        kind: 'answer',
        question_id,
        original_status: status,
        status,
        comment: comment ?? '',
        existing_photos: [...photos],
        new_photos: [],
        delete_all_existing_on_ok: false,
        confirming: false,
      });
      setSaveError(null);
    },
    [],
  );

  const startFeedbackEdit = useCallback(
    (item: AdminAuditEquipmentFeedbackItem) => {
      setEditDraft({
        kind: 'feedback',
        equipment_key: item.equipment_key,
        good_practices_comment: item.good_practices_comment ?? '',
        improvement_opportunity_comment:
          item.improvement_opportunity_comment ?? '',
        confirming: false,
      });
      setSaveError(null);
    },
    [],
  );

  const handleStatusChange = useCallback((newStatus: 'OK' | 'OBS') => {
    setEditDraft(prev => {
      if (prev?.kind !== 'answer') return prev;

      // If changing to OK, clear the comment and new photos. Reset delete toggle.
      const newComment = newStatus === 'OK' ? '' : prev.comment;
      const newPhotos = newStatus === 'OK' ? [] : prev.new_photos;

      return {
        ...prev,
        status: newStatus,
        comment: newComment,
        new_photos: newPhotos,
        delete_all_existing_on_ok: false,
      };
    });
    setSaveError(null);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const filesArray = Array.from(e.target.files);
        setEditDraft(prev => {
          if (prev?.kind !== 'answer') return prev;
          return {
            ...prev,
            new_photos: [...prev.new_photos, ...filesArray],
          };
        });
      }
    },
    [],
  );

  const removeNewPhoto = useCallback((indexToRemove: number) => {
    setEditDraft(prev => {
      if (prev?.kind !== 'answer') return prev;
      return {
        ...prev,
        new_photos: prev.new_photos.filter((_, i) => i !== indexToRemove),
      };
    });
  }, []);

  const removeExistingPhoto = useCallback((urlToRemove: string) => {
    setEditDraft(prev => {
      if (prev?.kind !== 'answer') return prev;
      return {
        ...prev,
        existing_photos: prev.existing_photos.filter(
          p => getPhotoUrl(p) !== urlToRemove,
        ),
      };
    });
  }, []);

  const requestSave = useCallback(() => {
    if (!editDraft) return;

    if (editDraft.kind === 'answer') {
      // Validations
      if (editDraft.status === 'OBS' && !editDraft.comment.trim()) {
        setSaveError('Debe ingresar una observación cuando el estado es OBS.');
        return;
      }

      // Move to confirm state
      setEditDraft({ ...editDraft, confirming: true });
      setSaveError(null);
    } else {
      // Feedback has no strict validations for empty, just go to confirm
      setEditDraft({ ...editDraft, confirming: true });
      setSaveError(null);
    }
  }, [editDraft]);

  const cancelConfirm = useCallback(() => {
    if (!editDraft) return;
    setEditDraft({ ...editDraft, confirming: false });
    setSaveError(null);
  }, [editDraft]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const confirmSave = useCallback(async () => {
    if (!editDraft || !audit || !editDraft.confirming) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const supabase = getSupabaseClient();

      if (editDraft.kind === 'answer') {
        let uploadedPhotos: {
          bucket: string;
          path: string;
          public_url: string;
        }[] = [];

        // Upload new photos if any
        if (editDraft.new_photos.length > 0) {
          const uploadPromises = editDraft.new_photos.map(async file => {
            const bucket = 'maintenance';
            const folderName = audit.property_id || 'unknown';
            const path = `${folderName}/${generateUniquePath('admin_audit', file.name)}`;

            const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(path, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from(bucket).getPublicUrl(path);

            return {
              bucket,
              path,
              public_url: data.publicUrl,
            };
          });

          uploadedPhotos = await Promise.all(uploadPromises);
        }

        const keptPhotoUrls =
          editDraft.status === 'OK' && editDraft.delete_all_existing_on_ok
            ? [] // wipe all existing photos
            : editDraft.existing_photos
                .map(p => getPhotoUrl(p))
                .filter(Boolean);

        const patch = {
          question_id: editDraft.question_id,
          status: editDraft.status,
          comment: editDraft.comment.trim() || null,
          new_photos: uploadedPhotos,
          kept_existing_photo_urls: keptPhotoUrls,
        };

        await updateAdminAuditAnswers(supabase, params.auditId, [patch]);

        // Update local state
        setAudit(prev => {
          if (!prev) return prev;
          const updatedAnswers = prev.answers.map(a => {
            if (a.question_id !== patch.question_id) return a;

            // Filter a.photos down to only the ones kept
            const filteredOldPhotos = a.photos.filter(p =>
              keptPhotoUrls.includes(getPhotoUrl(p)),
            );
            const combinedPhotos = [
              ...filteredOldPhotos,
              ...uploadedPhotos.map(p => ({
                bucket: p.bucket,
                path: p.path,
                publicUrl: p.public_url,
              })),
            ];

            return {
              ...a,
              status: patch.status,
              comment: patch.comment,
              photos: combinedPhotos,
            };
          });
          return {
            ...prev,
            answers: updatedAnswers,
            total_ok: updatedAnswers.filter(a => a.status === 'OK').length,
            total_obs: updatedAnswers.filter(a => a.status === 'OBS').length,
            total_photos: updatedAnswers.reduce(
              (acc, curr) => acc + curr.photos.length,
              0,
            ),
          };
        });
      } else {
        const patch = {
          equipment_key: editDraft.equipment_key,
          good_practices_comment:
            editDraft.good_practices_comment.trim() || null,
          improvement_opportunity_comment:
            editDraft.improvement_opportunity_comment.trim() || null,
        };
        await updateAdminAuditFeedback(supabase, params.auditId, patch);
        setAudit(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            equipmentFeedback: prev.equipmentFeedback.map(fb =>
              fb.equipment_key === patch.equipment_key
                ? {
                    ...fb,
                    good_practices_comment: patch.good_practices_comment,
                    improvement_opportunity_comment:
                      patch.improvement_opportunity_comment,
                  }
                : fb,
            ),
          };
        });
      }

      setEditDraft(null);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'No se pudo guardar el cambio',
      );
    } finally {
      setIsSaving(false);
    }
  }, [editDraft, audit, params.auditId]);

  // ── Render: loading / empty ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
        <DetailHeader />
        <section className="grid min-h-[320px] place-items-center rounded-[24px] border border-slate-900/10 bg-white/80 text-slate-500 shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
          Cargando detalle de auditoria...
        </section>
      </main>
    );
  }

  if (!audit) {
    return (
      <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
        <DetailHeader />
        <Alert>{errorMessage}</Alert>
        <section className="rounded-[24px] border border-slate-900/10 bg-white/80 p-8 text-slate-500 shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
          No se encontró esta auditoria sincronizada.
        </section>
      </main>
    );
  }

  // ── Render: detail ────────────────────────────────────────────────────────

  return (
    <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
      <DetailHeader audit={audit} />
      <Alert>{errorMessage}</Alert>

      {/* ── Métricas ── */}
      <section className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <Metric label="OK" value={audit.total_ok} tone="emerald" />
        <Metric label="Observadas" value={audit.total_obs} tone="amber" />
        <Metric label="Fotos" value={audit.total_photos} tone="slate" />
        <Metric
          label="No aplica"
          value={audit.total_not_applicable}
          tone="slate"
        />
      </section>

      {/* ── Layout de 2 columnas en desktop ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
        {/* ── Respuestas ── */}
        <section className="rounded-[24px] border border-slate-900/10 bg-white/85 shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-[18px] py-4 max-[760px]:grid">
            <SectionTitle eyebrow="Evidencia de auditoria" title="Respuestas" />
            <div className="flex gap-2 max-[640px]:grid">
              <FilterButton
                active={answerFilter === 'observed'}
                onClick={() => setAnswerFilter('observed')}>
                Observadas
              </FilterButton>
              <FilterButton
                active={answerFilter === 'photos'}
                onClick={() => setAnswerFilter('photos')}>
                Con fotos
              </FilterButton>
              <FilterButton
                active={answerFilter === 'all'}
                onClick={() => setAnswerFilter('all')}>
                Todas
              </FilterButton>
            </div>
          </div>

          {filteredAnswers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No hay respuestas para este filtro.
            </div>
          ) : (
            <div className="grid gap-3 p-[18px]">
              {filteredAnswers.map(answer => {
                const isEditing =
                  editDraft?.kind === 'answer' &&
                  editDraft.question_id === answer.question_id;
                const draft = isEditing ? (editDraft as AnswerEditDraft) : null;
                const hasDeletedPhotos =
                  draft && draft.existing_photos.length < answer.photos.length;

                return (
                  <article
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                    key={answer.question_id}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-emerald-800">
                          {[answer.sectionName, answer.equipmentName]
                            .filter(Boolean)
                            .join(' · ') || 'Auditoria'}
                        </span>
                        <h3 className="m-0 mt-1 text-[0.92rem] font-black leading-snug text-slate-950">
                          {answer.questionText}
                        </h3>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${
                            answer.status === 'OK'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                          {answer.status}
                        </span>
                        {!isEditing && (
                          <EditButton
                            label={`Editar: ${answer.questionText}`}
                            onClick={() =>
                              startAnswerEdit(
                                answer.question_id,
                                answer.status,
                                answer.comment,
                                answer.photos,
                              )
                            }
                          />
                        )}
                      </div>
                    </div>

                    {/* Comment (read) */}
                    {!isEditing && answer.comment ? (
                      <p className="mb-0 mt-2.5 text-sm leading-6 text-slate-600">
                        {answer.comment}
                      </p>
                    ) : null}

                    {/* Edit panel */}
                    {isEditing && draft ? (
                      draft.confirming ? (
                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                          <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-blue-800">
                            Confirmar Cambios
                          </p>
                          <div className="mb-4 text-sm text-slate-700">
                            <p className="mb-2">
                              ¿Estás seguro que deseas aplicar los siguientes
                              cambios?
                            </p>
                            <ul className="list-disc pl-5">
                              {draft.original_status !== draft.status && (
                                <li>
                                  Cambio de estado:{' '}
                                  <strong>{draft.original_status}</strong> →{' '}
                                  <strong>{draft.status}</strong>
                                </li>
                              )}
                              <li>
                                Comentario:{' '}
                                <em>{draft.comment || '(Vacío)'}</em>
                              </li>
                              {draft.new_photos.length > 0 && (
                                <li>
                                  <strong>{draft.new_photos.length}</strong>{' '}
                                  foto(s) nueva(s) adjuntada(s)
                                </li>
                              )}
                              {hasDeletedPhotos && draft.status === 'OBS' && (
                                <li className="text-red-600">
                                  <strong>
                                    {answer.photos.length -
                                      draft.existing_photos.length}
                                  </strong>{' '}
                                  foto(s) existente(s) eliminada(s)
                                </li>
                              )}
                              {draft.status === 'OK' &&
                                draft.delete_all_existing_on_ok &&
                                answer.photos.length > 0 && (
                                  <li className="text-red-600">
                                    <strong>
                                      Todas las fotos existentes (
                                      {answer.photos.length}) serán eliminadas
                                    </strong>
                                  </li>
                                )}
                            </ul>
                          </div>

                          {saveError ? (
                            <p className="mb-3 text-xs font-semibold text-red-600">
                              {saveError}
                            </p>
                          ) : null}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={confirmSave}
                              className="inline-flex h-[36px] items-center rounded-lg bg-blue-700 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:opacity-60">
                              {isSaving
                                ? 'Guardando...'
                                : 'Confirmar y Guardar'}
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={cancelConfirm}
                              className="inline-flex h-[36px] items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60">
                              Volver a editar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                          <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-800">
                            Editando respuesta
                          </p>

                          {/* Status buttons */}
                          <div className="mb-3">
                            <label className="mb-1.5 block text-xs font-bold text-slate-700">
                              Estado
                            </label>
                            <div className="flex gap-2">
                              {(['OK', 'OBS'] as const).map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => handleStatusChange(s)}
                                  className={`rounded-lg border px-4 py-2 text-sm font-bold transition-colors ${
                                    draft.status === s
                                      ? s === 'OK'
                                        ? 'border-emerald-600 bg-emerald-600 text-white'
                                        : 'border-amber-500 bg-amber-500 text-white'
                                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                  }`}>
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Warning messages and specific OK controls */}
                          {draft.original_status === 'OBS' &&
                            draft.status === 'OK' && (
                              <div className="mb-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 border border-blue-100 flex flex-col gap-2">
                                <p className="m-0">
                                  <strong>Aviso:</strong> El estado cambiará a
                                  OK y el comentario será borrado.
                                </p>
                                {answer.photos.length > 0 && (
                                  <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      checked={draft.delete_all_existing_on_ok}
                                      onChange={e =>
                                        setEditDraft(d =>
                                          d?.kind === 'answer'
                                            ? {
                                                ...d,
                                                delete_all_existing_on_ok:
                                                  e.target.checked,
                                              }
                                            : d,
                                        )
                                      }
                                    />
                                    <span>
                                      Eliminar las{' '}
                                      <strong>{answer.photos.length}</strong>{' '}
                                      fotos existentes de la observación
                                      original.
                                    </span>
                                  </label>
                                )}
                              </div>
                            )}

                          {draft.original_status === 'OK' &&
                            draft.status === 'OBS' && (
                              <div className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 border border-amber-100">
                                <strong>Aviso:</strong> Debe ingresar un
                                comentario obligatorio para el estado OBS. Puede
                                adjuntar fotos de evidencia a continuación.
                              </div>
                            )}

                          {/* Comment */}
                          <div className="mb-4">
                            <label
                              htmlFor={`comment-${answer.question_id}`}
                              className="mb-1.5 block text-xs font-bold text-slate-700">
                              Observación / Comentario{' '}
                              {draft.status === 'OBS' && (
                                <span className="text-red-500">*</span>
                              )}
                            </label>
                            <textarea
                              id={`comment-${answer.question_id}`}
                              rows={3}
                              placeholder="Escribe una observación..."
                              value={draft.comment}
                              disabled={draft.status === 'OK'}
                              onChange={e =>
                                setEditDraft(d =>
                                  d?.kind === 'answer'
                                    ? { ...d, comment: e.target.value }
                                    : d,
                                )
                              }
                              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                            />
                          </div>

                          {/* Photos Upload & Management (Only shown when OBS) */}
                          {draft.status === 'OBS' && (
                            <div className="mb-4">
                              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                Evidencia fotográfica
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {/* Existing Photos */}
                                {draft.existing_photos.map((photo, i) => {
                                  const url = getPhotoUrl(photo);
                                  const isMissing =
                                    !url ||
                                    url === 'file_not_found' ||
                                    url.includes('file_not_found');
                                  return (
                                    <div
                                      key={`exist-${i}`}
                                      className="relative group rounded-xl border-2 border-slate-200 overflow-hidden h-20 w-20 bg-slate-100"
                                      title={
                                        isMissing
                                          ? 'Archivo no encontrado'
                                          : 'Foto existente'
                                      }>
                                      {isMissing ? (
                                        <div className="flex flex-col items-center justify-center h-full w-full bg-slate-100 text-slate-400 p-1 text-center">
                                          <span className="text-sm">📷🚫</span>
                                          <span className="text-[9px] leading-tight font-semibold">
                                            No disponible
                                          </span>
                                        </div>
                                      ) : (
                                        <img
                                          src={url}
                                          alt="Foto existente"
                                          className="h-full w-full object-cover"
                                        />
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => removeExistingPhoto(url)}
                                        className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white text-xs font-bold mb-1">
                                          Borrar
                                        </span>
                                        <span className="text-white text-xs">
                                          🗑️
                                        </span>
                                      </button>
                                    </div>
                                  );
                                })}

                                {/* New Photos */}
                                {draft.new_photos.map((file, i) => (
                                  <div
                                    key={`new-${i}`}
                                    className="relative group rounded-xl border-2 border-emerald-400 overflow-hidden h-20 w-20 bg-slate-100"
                                    title="Foto nueva (no guardada)">
                                    <img
                                      src={URL.createObjectURL(file)}
                                      alt="Nueva foto"
                                      className="h-full w-full object-cover"
                                    />
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl">
                                      NUEVA
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeNewPhoto(i)}
                                      className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <span className="text-white text-xs font-bold mb-1">
                                        Quitar
                                      </span>
                                      <span className="text-white text-xs">
                                        ❌
                                      </span>
                                    </button>
                                  </div>
                                ))}

                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="h-20 w-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-emerald-400 hover:text-emerald-700 transition-colors">
                                  <IconCamera />
                                  <span className="text-[10px] font-bold mt-1">
                                    Subir más
                                  </span>
                                </button>

                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  ref={fileInputRef}
                                  onChange={handleFileChange}
                                  className="hidden"
                                />
                              </div>
                            </div>
                          )}

                          {saveError ? (
                            <p className="mb-3 text-xs font-semibold text-red-600">
                              {saveError}
                            </p>
                          ) : null}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={requestSave}
                              className="inline-flex h-[36px] items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60">
                              Guardar cambios...
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={cancelEdit}
                              className="inline-flex h-[36px] items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )
                    ) : null}

                    {/* Show read-only photos only if not editing OR if editing but they are hidden (e.g. changed to OK and not deleted) */}
                    {(!isEditing ||
                      (isEditing &&
                        draft?.status === 'OK' &&
                        !draft.delete_all_existing_on_ok)) && (
                      <PhotoGrid photos={answer.photos} />
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Feedback por equipo (columna derecha) ── */}
        {audit.equipmentFeedback.length > 0 ? (
          <aside className="flex flex-col gap-4">
            <div className="sticky top-4 flex flex-col gap-4">
              <SectionTitle
                eyebrow="Comentarios por equipo"
                title="Buenas prácticas y oportunidades"
              />

              {audit.equipmentFeedback.map(item => {
                const isEditing =
                  editDraft?.kind === 'feedback' &&
                  editDraft.equipment_key === item.equipment_key;
                const draft = isEditing
                  ? (editDraft as FeedbackEditDraft)
                  : null;
                const itemKey = item.equipment_key || item.equipment_label;

                return (
                  <article
                    className="rounded-[20px] border border-slate-200 bg-white shadow-sm"
                    key={itemKey}>
                    {/* Equipment name + edit button */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                      <h3 className="m-0 text-sm font-black text-slate-950">
                        {item.equipment_label}
                      </h3>
                      {!isEditing && (
                        <EditButton
                          label={`Editar feedback: ${item.equipment_label}`}
                          onClick={() => startFeedbackEdit(item)}
                        />
                      )}
                    </div>

                    {isEditing && draft ? (
                      draft.confirming ? (
                        <div className="p-4 rounded-b-[20px] bg-blue-50/60 border-t border-blue-200">
                          <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-blue-800">
                            Confirmar Cambios
                          </p>
                          <div className="mb-4 text-sm text-slate-700">
                            <p className="mb-2">
                              ¿Estás seguro que deseas aplicar los siguientes
                              cambios al feedback?
                            </p>
                            <ul className="list-disc pl-5">
                              <li>
                                Buenas Prácticas:{' '}
                                <em>
                                  {draft.good_practices_comment || '(Vacío)'}
                                </em>
                              </li>
                              <li>
                                Oportunidades de Mejora:{' '}
                                <em>
                                  {draft.improvement_opportunity_comment ||
                                    '(Vacío)'}
                                </em>
                              </li>
                            </ul>
                          </div>

                          {saveError ? (
                            <p className="mb-3 text-xs font-semibold text-red-600">
                              {saveError}
                            </p>
                          ) : null}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={confirmSave}
                              className="inline-flex h-[34px] items-center rounded-lg bg-blue-700 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:opacity-60">
                              {isSaving ? 'Guardando...' : 'Confirmar'}
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={cancelConfirm}
                              className="inline-flex h-[34px] items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60">
                              Volver
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                            <p className="mb-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-emerald-700">
                              Editando
                            </p>
                            {/* Buenas prácticas */}
                            <div className="mb-3">
                              <label
                                htmlFor={`gp-${itemKey}`}
                                className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                                Buenas prácticas
                              </label>
                              <textarea
                                id={`gp-${itemKey}`}
                                rows={3}
                                placeholder="Describe las buenas prácticas observadas..."
                                value={draft.good_practices_comment}
                                onChange={e =>
                                  setEditDraft(d =>
                                    d?.kind === 'feedback'
                                      ? {
                                          ...d,
                                          good_practices_comment:
                                            e.target.value,
                                        }
                                      : d,
                                  )
                                }
                                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                              />
                            </div>

                            {/* Oportunidades */}
                            <div>
                              <label
                                htmlFor={`opp-${itemKey}`}
                                className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-700">
                                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                                Oportunidades de mejora
                              </label>
                              <textarea
                                id={`opp-${itemKey}`}
                                rows={3}
                                placeholder="Describe las oportunidades de mejora..."
                                value={draft.improvement_opportunity_comment}
                                onChange={e =>
                                  setEditDraft(d =>
                                    d?.kind === 'feedback'
                                      ? {
                                          ...d,
                                          improvement_opportunity_comment:
                                            e.target.value,
                                        }
                                      : d,
                                  )
                                }
                                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                              />
                            </div>

                            {saveError ? (
                              <p className="mt-3 text-xs font-semibold text-red-600">
                                {saveError}
                              </p>
                            ) : null}
                            <div className="mt-4 flex gap-2">
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={requestSave}
                                className="inline-flex h-[34px] items-center rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60">
                                Guardar cambios...
                              </button>
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={cancelEdit}
                                className="inline-flex h-[34px] items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="grid divide-y divide-slate-100">
                        <FeedbackBlock
                          tone="emerald"
                          title="Buenas prácticas"
                          comment={item.good_practices_comment}
                          photos={item.good_practices_photos}
                        />
                        <FeedbackBlock
                          tone="amber"
                          title="Oportunidades de mejora"
                          comment={item.improvement_opportunity_comment}
                          photos={item.improvement_opportunity_photos}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </aside>
        ) : null}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DetailHeader({ audit }: { audit?: AdminAuditSessionRow }) {
  return (
    <section className="rounded-[24px] border border-emerald-900/10 bg-[linear-gradient(135deg,#ffffff_0%,#ecfdf5_100%)] p-5 shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
      <Link
        className="text-sm font-bold text-emerald-800 no-underline hover:text-emerald-950"
        href="/admin/auditorias">
        ← Volver a auditorias
      </Link>
      <h2 className="m-0 mt-2 text-3xl font-black tracking-[-0.04em] text-[#0c1720]">
        {audit?.propertyName ?? 'Detalle de auditoria'}
      </h2>
      {audit ? (
        <p className="mb-0 mt-2 text-sm text-slate-600">
          Auditor: <strong>{audit.auditorName}</strong> · Programada:{' '}
          {formatDate(audit.scheduled_for)} · Enviada:{' '}
          {formatDateTime(audit.submitted_at)}
        </p>
      ) : null}
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'amber' | 'slate';
}) {
  const color =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'amber'
        ? 'text-amber-700'
        : 'text-slate-700';

  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <strong className={`mt-1 block text-3xl font-black ${color}`}>
        {value}
      </strong>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
        {eyebrow}
      </span>
      <h2 className="m-0 mt-1 text-xl font-black tracking-[-0.03em] text-[#0c1720]">
        {title}
      </h2>
    </div>
  );
}

function EditButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex h-[28px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
      onClick={onClick}>
      <IconEdit />
      Editar
    </button>
  );
}

function FeedbackBlock({
  tone,
  title,
  comment,
  photos,
}: {
  tone: 'emerald' | 'amber';
  title: string;
  comment: string | null;
  photos: AdminAuditPhotoRef[];
}) {
  const hasContent = comment || photos.length > 0;

  const dotColor = tone === 'emerald' ? 'bg-emerald-500' : 'bg-amber-400';
  const labelColor = tone === 'emerald' ? 'text-emerald-800' : 'text-amber-700';
  const emptyColor = tone === 'emerald' ? 'text-emerald-400' : 'text-amber-400';

  return (
    <div className="px-4 py-3">
      <div
        className={`mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] ${labelColor}`}>
        <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
        {title}
      </div>
      {hasContent ? (
        <>
          {comment ? (
            <p className="m-0 text-sm leading-6 text-slate-600">{comment}</p>
          ) : null}
          <PhotoGrid photos={photos} />
        </>
      ) : (
        <p className={`m-0 text-xs italic ${emptyColor}`}>Sin comentarios</p>
      )}
    </div>
  );
}

function PhotoGrid({ photos }: { photos: AdminAuditPhotoRef[] }) {
  if (photos.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-3 gap-2 max-[640px]:grid-cols-2">
      {photos.map((photo, index) => {
        const url = photo.publicUrl ?? photo.public_url ?? photo.url;
        const isMissing =
          !url || url === 'file_not_found' || url.includes('file_not_found');

        return !isMissing ? (
          <a
            className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition hover:opacity-90"
            href={url}
            key={`${url}-${index}`}
            rel="noreferrer"
            target="_blank">
            <img
              alt={`Evidencia ${index + 1}`}
              className="h-28 w-full object-cover"
              src={url}
            />
          </a>
        ) : (
          <div
            key={`missing-${index}`}
            className="flex flex-col items-center justify-center h-28 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 p-2 text-center">
            <span className="text-lg">📷🚫</span>
            <span className="text-xs font-semibold">No disponible</span>
            <span className="text-[9px] leading-tight mt-0.5">
              Archivo no sincronizado
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
        active
          ? 'border-emerald-900 bg-emerald-900 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
      type="button"
      onClick={onClick}>
      {children}
    </button>
  );
}
