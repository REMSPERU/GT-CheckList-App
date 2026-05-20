'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Alert } from '@/components/ui/alert';
import { getSupabaseClient } from '@/lib/supabase-browser';
import { getAdminChecklistResponseById } from '@/services/admin/checklist.service';
import type {
  AdminChecklistAnswerItem,
  AdminChecklistPhotoRef,
  AdminChecklistResponseRow,
} from '@/types/admin';
import {
  formatWeight,
  getAnswerWeight,
  getChecklistWeightedScore,
} from '@/utils/checklist-score';
import { formatDateTime } from '@/utils/date';

type AnswerFilter = 'all' | 'observed' | 'photos';

export default function AdminChecklistResponseDetailPage() {
  const params = useParams<{ responseId: string }>();
  const [response, setResponse] = useState<AdminChecklistResponseRow | null>(
    null,
  );
  const [answerFilter, setAnswerFilter] = useState<AnswerFilter>('observed');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadResponse() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();
        const result = await getAdminChecklistResponseById(
          supabase,
          params.responseId,
        );

        if (isMounted) setResponse(result);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar el detalle del checklist',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadResponse();

    return () => {
      isMounted = false;
    };
  }, [params.responseId]);

  const filteredAnswers = useMemo(() => {
    const answers = response?.answers ?? [];

    if (answerFilter === 'observed') {
      return answers.filter(answer => answer.status_ok !== true);
    }

    if (answerFilter === 'photos') {
      return answers.filter(answer => answer.fotos.length > 0);
    }

    return answers;
  }, [answerFilter, response?.answers]);

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

  if (!response) {
    return (
      <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
        <DetailHeader />
        <Alert>{errorMessage}</Alert>
        <section className="rounded-[24px] border border-slate-900/10 bg-white/80 p-8 text-slate-500 shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
          No se encontro este checklist sincronizado.
        </section>
      </main>
    );
  }

  const weightedScore = getChecklistWeightedScore(response);

  return (
    <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
      <DetailHeader response={response} />
      <Alert>{errorMessage}</Alert>

      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        {/* Columna 1: Operatividad y Métricas rápidas */}
        <div className="flex flex-col gap-2 md:col-span-1 md:border-r md:border-slate-100 md:pr-4 last:border-0 max-[768px]:border-b max-[768px]:pb-4 max-[768px]:pr-0">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
            Operatividad
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-extrabold tracking-tight ${weightedScore.percent < 80 ? 'text-amber-600' : 'text-emerald-800'}`}>
              {formatWeight(weightedScore.percent)}%
            </span>
            <span className="text-xs font-semibold text-slate-500">
              ({formatWeight(weightedScore.earned)} de {formatWeight(weightedScore.total)} ítems)
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            <div className="rounded-lg bg-slate-50 py-1 px-0.5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Preg.</span>
              <strong className="text-xs text-slate-800">{response.total_questions ?? 0}</strong>
            </div>
            <div className="rounded-lg bg-emerald-50 py-1 px-0.5 text-emerald-950">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-700">Conf.</span>
              <strong className="text-xs text-emerald-800">{response.total_ok ?? 0}</strong>
            </div>
            <div className="rounded-lg bg-amber-50 py-1 px-0.5 text-amber-950">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-amber-700">Obs.</span>
              <strong className="text-xs text-amber-700">{response.total_observed ?? 0}</strong>
            </div>
            <div className="rounded-lg bg-slate-50 py-1 px-0.5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Fotos</span>
              <strong className="text-xs text-slate-800">{response.total_photos ?? 0}</strong>
            </div>
          </div>
        </div>

        {/* Columna 2 & 3: Detalles de Llenado */}
        <div className="grid gap-2 md:col-span-2">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
            Información del Registro
          </span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="flex flex-col">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Llenado por</span>
              <span className="font-semibold text-[#0c1720] truncate" title={response.user_created_name ?? '-'}>
                {response.user_created_name ?? '-'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Duración / Interacciones</span>
              <span className="font-semibold text-[#0c1720]">
                {formatDuration(response.duration_seconds)} ({response.interaction_count ?? 0} clics)
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Inicio</span>
              <span className="font-semibold text-slate-700">{formatDateTime(response.form_started_at)}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Término</span>
              <span className="font-semibold text-slate-700">{formatDateTime(response.submitted_at)}</span>
            </div>
            <div className="flex flex-col col-span-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Primera interacción</span>
              <span className="font-semibold text-slate-700">{formatDateTime(response.first_interaction_at)}</span>
            </div>
          </div>
        </div>
      </section>

      {response.generalPhotos.length > 0 ? (
        <section className="rounded-[24px] border border-emerald-900/10 bg-white/85 p-[18px] shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
          <div className="mb-4">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
              Evidencia general
            </span>
            <h2 className="m-0 mt-1 text-2xl tracking-[-0.03em] text-[#0c1720]">
              Fotos generales del checklist
            </h2>
            <p className="mb-0 mt-1 text-sm text-slate-500">
              Estas fotos no pertenecen a una pregunta especifica, pero forman
              parte de la evidencia enviada.
            </p>
          </div>
          <PhotoGrid photos={response.generalPhotos} />
        </section>
      ) : null}

      <section className="rounded-[24px] border border-slate-900/10 bg-white/85 shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-[18px] py-4 max-[760px]:grid">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
              Evidencia del checklist
            </span>
            <h2 className="m-0 mt-1 text-2xl tracking-[-0.03em] text-[#0c1720]">
              Respuestas y fotos
            </h2>
          </div>
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

        <div className="grid gap-3 p-[18px]">
          {filteredAnswers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No hay respuestas para este filtro.
            </div>
          ) : (
            filteredAnswers.map(answer => (
              <AnswerCard answer={answer} key={answer.pregunta_id} />
            ))
          )}
        </div>
      </section>
    </main>
  );
}

interface DetailHeaderProps {
  response?: AdminChecklistResponseRow;
}

function DetailHeader({ response }: DetailHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <Link
        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-sm font-bold text-[#0c1720] no-underline hover:bg-slate-200 transition-colors"
        href="/admin/checklist">
        ← Volver a checklist
      </Link>
      {response ? (
        <div className="text-right max-[640px]:text-left">
          <span className="block text-sm font-black text-[#0c1720]">
            {response.equipo_codigo}
          </span>
          <span className="block text-xs font-semibold text-slate-500">
            {response.building_name} · {response.equipamento_nombre} · {formatDateTime(response.submitted_at)}
          </span>
        </div>
      ) : (
        <span className="text-xs font-semibold text-slate-400">
          Cargando...
        </span>
      )}
    </header>
  );
}

function formatDuration(value: number | null): string {
  if (!value) return '-';

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

interface FilterButtonProps {
  active: boolean;
  children: string;
  onClick: () => void;
}

function FilterButton({ active, children, onClick }: FilterButtonProps) {
  return (
    <button
      className={`min-h-10 rounded-[12px] px-3 text-sm font-black ${
        active
          ? 'bg-emerald-800 text-white'
          : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
      }`}
      type="button"
      onClick={onClick}
      aria-pressed={active}>
      {children}
    </button>
  );
}

function AnswerCard({ answer }: { answer: AdminChecklistAnswerItem }) {
  const isObserved = answer.status_ok !== true;
  const weight = getAnswerWeight(answer);

  return (
    <article
      className={`grid gap-3 rounded-[20px] border p-4 ${
        isObserved
          ? 'border-amber-200 bg-amber-50/60'
          : 'border-slate-200 bg-white'
      }`}>
      <div className="flex items-start justify-between gap-3 max-[640px]:grid">
        <div>
          <span className="mb-1.5 inline-block text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
            Pregunta {answer.orden ?? '-'}
          </span>
          <h3 className="m-0 text-lg text-[#0c1720]">{answer.pregunta}</h3>
        </div>
        <span
          className={`inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${
            isObserved
              ? 'bg-orange-100 text-orange-900'
              : 'bg-green-100 text-green-900'
          }`}>
          {isObserved ? 'Observada' : 'Conforme'} · {formatWeight(weight)} pts
        </span>
      </div>

      {answer.observacion ? (
        <p className="m-0 rounded-2xl bg-white/80 p-3 text-slate-700">
          {answer.observacion}
        </p>
      ) : null}

      <PhotoGrid photos={answer.fotos} />
    </article>
  );
}

function PhotoGrid({ photos }: { photos: AdminChecklistPhotoRef[] }) {
  if (photos.length === 0) {
    return <small className="font-semibold text-slate-500">Sin fotos</small>;
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
      {photos.map((photo, index) => {
        const url = getPhotoUrl(photo);

        return url ? (
          <a
            className="group overflow-hidden rounded-2xl border border-white bg-slate-200 shadow-[0_12px_28px_rgba(12,23,32,0.12)]"
            href={url}
            target="_blank"
            rel="noreferrer"
            key={`${url}-${index}`}>
            <span
              className="block aspect-[4/3] bg-cover bg-center transition-transform group-hover:scale-[1.03]"
              style={{ backgroundImage: `url(${url})` }}
              aria-label={`Foto ${index + 1}`}
            />
            <span className="block bg-white px-3 py-2 text-sm font-bold text-emerald-900">
              Abrir foto {index + 1}
            </span>
          </a>
        ) : (
          <div
            className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500"
            key={index}>
            Foto sin URL publica
          </div>
        );
      })}
    </div>
  );
}

function getPhotoUrl(photo: AdminChecklistPhotoRef): string | null {
  return photo.public_url ?? photo.publicUrl ?? photo.url ?? null;
}
