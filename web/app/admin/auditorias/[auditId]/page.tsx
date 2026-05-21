'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Alert } from '@/components/ui/alert';
import { getSupabaseClient } from '@/lib/supabase-browser';
import { getAdminAuditSessionById } from '@/services/admin/audits.service';
import type { AdminAuditPhotoRef, AdminAuditSessionRow } from '@/types/admin';
import { formatDate, formatDateTime } from '@/utils/date';

type AnswerFilter = 'observed' | 'photos' | 'all';

export default function AdminAuditoriaDetailPage() {
  const params = useParams<{ auditId: string }>();
  const [audit, setAudit] = useState<AdminAuditSessionRow | null>(null);
  const [answerFilter, setAnswerFilter] = useState<AnswerFilter>('observed');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAudit() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const supabase = getSupabaseClient();
        const result = await getAdminAuditSessionById(supabase, params.auditId);
        if (isMounted) setAudit(result);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar la auditoria',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadAudit();

    return () => {
      isMounted = false;
    };
  }, [params.auditId]);

  const filteredAnswers = useMemo(() => {
    const answers = audit?.answers ?? [];

    if (answerFilter === 'observed') {
      return answers.filter(answer => answer.status === 'OBS');
    }

    if (answerFilter === 'photos') {
      return answers.filter(answer => answer.photos.length > 0);
    }

    return answers;
  }, [answerFilter, audit?.answers]);

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
          No se encontro esta auditoria sincronizada.
        </section>
      </main>
    );
  }

  return (
    <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
      <DetailHeader audit={audit} />
      <Alert>{errorMessage}</Alert>

      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <Metric label="OK" value={audit.total_ok} tone="emerald" />
        <Metric label="Observadas" value={audit.total_obs} tone="amber" />
        <Metric label="Fotos" value={audit.total_photos} tone="slate" />
        <Metric
          label="No aplica"
          value={audit.total_not_applicable}
          tone="slate"
        />
      </section>

      {audit.equipmentFeedback.length > 0 ? (
        <section className="rounded-[24px] border border-emerald-900/10 bg-white/85 p-[18px] shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
          <SectionTitle
            eyebrow="Comentarios por equipo"
            title="Buenas practicas y oportunidades"
          />
          <div className="grid gap-3">
            {audit.equipmentFeedback.map(item => (
              <article
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                key={item.equipment_key || item.equipment_label}>
                <h3 className="m-0 text-base font-black text-slate-950">
                  {item.equipment_label}
                </h3>
                <FeedbackBlock
                  title="Buenas practicas"
                  comment={item.good_practices_comment}
                  photos={item.good_practices_photos}
                />
                <FeedbackBlock
                  title="Oportunidades de mejora"
                  comment={item.improvement_opportunity_comment}
                  photos={item.improvement_opportunity_photos}
                />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[24px] border border-slate-900/10 bg-white/85 shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-[18px] py-4 max-[760px]:grid">
          <SectionTitle
            eyebrow="Evidencia de auditoria"
            title="Respuestas y fotos"
          />
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
            {filteredAnswers.map(answer => (
              <article
                className="rounded-2xl border border-slate-200 bg-white p-4"
                key={answer.question_id}>
                <div className="flex items-start justify-between gap-3 max-[760px]:grid">
                  <div>
                    <span className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-emerald-800">
                      {[answer.sectionName, answer.equipmentName]
                        .filter(Boolean)
                        .join(' · ') || 'Auditoria'}
                    </span>
                    <h3 className="m-0 mt-1 text-base font-black text-slate-950">
                      {answer.questionText}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${
                      answer.status === 'OK'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                    {answer.status}
                  </span>
                </div>
                {answer.comment ? (
                  <p className="mb-0 mt-3 text-sm leading-6 text-slate-600">
                    {answer.comment}
                  </p>
                ) : null}
                <PhotoGrid photos={answer.photos} />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function DetailHeader({ audit }: { audit?: AdminAuditSessionRow }) {
  return (
    <section className="rounded-[24px] border border-emerald-900/10 bg-[linear-gradient(135deg,#ffffff_0%,#ecfdf5_100%)] p-5 shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
      <Link
        className="text-sm font-bold text-emerald-800 no-underline hover:text-emerald-950"
        href="/admin/auditorias">
        Volver a auditorias
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
      ? 'text-emerald-800'
      : tone === 'amber'
        ? 'text-amber-700'
        : 'text-slate-800';

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
      <h2 className="m-0 mt-1 text-2xl tracking-[-0.03em] text-[#0c1720]">
        {title}
      </h2>
    </div>
  );
}

function FeedbackBlock({
  title,
  comment,
  photos,
}: {
  title: string;
  comment: string | null;
  photos: AdminAuditPhotoRef[];
}) {
  if (!comment && photos.length === 0) return null;

  return (
    <div className="mt-3">
      <strong className="text-sm text-slate-800">{title}</strong>
      {comment ? (
        <p className="my-2 text-sm text-slate-600">{comment}</p>
      ) : null}
      <PhotoGrid photos={photos} />
    </div>
  );
}

function PhotoGrid({ photos }: { photos: AdminAuditPhotoRef[] }) {
  const photoUrls = photos
    .map(photo => photo.publicUrl ?? photo.public_url ?? photo.url)
    .filter((value): value is string => Boolean(value));

  if (photoUrls.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-4 gap-2 max-[980px]:grid-cols-3 max-[640px]:grid-cols-2">
      {photoUrls.map((url, index) => (
        <a
          className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
          href={url}
          key={`${url}-${index}`}
          rel="noreferrer"
          target="_blank">
          <img
            alt={`Evidencia ${index + 1}`}
            className="h-36 w-full object-cover"
            src={url}
          />
        </a>
      ))}
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
