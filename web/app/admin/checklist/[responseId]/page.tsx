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

  return (
    <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
      <DetailHeader response={response} />
      <Alert>{errorMessage}</Alert>

      <section className="grid grid-cols-4 gap-3 max-[980px]:grid-cols-2 max-[640px]:grid-cols-1">
        <MetricCard label="Preguntas" value={response.total_questions ?? 0} />
        <MetricCard label="Conformes" value={response.total_ok ?? 0} />
        <MetricCard
          label="Observadas"
          value={response.total_observed ?? 0}
          tone="warning"
        />
        <MetricCard label="Fotos" value={response.total_photos ?? 0} />
      </section>

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
    <section className="rounded-3xl border border-slate-900/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(236,253,245,0.72)),radial-gradient(circle_at_78%_18%,rgba(245,158,11,0.18),transparent_28%)] p-[26px] shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
      <Link
        className="mb-5 inline-flex rounded-full bg-white/80 px-3 py-2 text-sm font-bold text-emerald-900 no-underline hover:bg-emerald-50"
        href="/admin/checklist">
        Volver a checklist
      </Link>
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
        Auditoria formal
      </span>
      <h1 className="m-0 text-[clamp(2rem,4vw,4.2rem)] font-bold tracking-[-0.04em] text-[#0c1720]">
        {response?.equipo_codigo ?? 'Detalle de checklist'}
      </h1>
      <p className="max-w-[820px] text-base text-slate-600">
        {response
          ? `${response.building_name ?? 'Sin inmueble'} · ${response.equipamento_nombre ?? 'Sin equipo'} · ${formatDateTime(response.submitted_at)}`
          : 'Vista dedicada para revisar respuestas, observaciones y evidencia fotografica.'}
      </p>
    </section>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  tone?: 'default' | 'warning';
}

function MetricCard({ label, value, tone = 'default' }: MetricCardProps) {
  return (
    <article
      className={`rounded-2xl border px-4 py-3.5 shadow-[0_12px_34px_rgba(12,23,32,0.06)] ${
        tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-950'
          : 'border-emerald-900/10 bg-white/85 text-[#0c1720]'
      }`}>
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <strong className="mt-1 block text-3xl tracking-[-0.04em]">
        {value}
      </strong>
    </article>
  );
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
          {isObserved ? 'Observada' : 'Conforme'}
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
