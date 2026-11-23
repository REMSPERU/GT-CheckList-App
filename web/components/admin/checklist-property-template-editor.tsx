import { useEffect, useState } from 'react';

import { SearchableSelectField } from '@/components/ui/searchable-select-field';
import { useAdminSession } from '@/hooks/auth/use-admin-session';
import { getSupabaseClient } from '@/lib/supabase-browser';
import {
  listAdminChecklistPropertyEquipmentTypeIds,
  listAdminChecklistQuestions,
} from '@/services/admin/checklist.service';

interface Option {
  value: string;
  label: string;
}

interface QuestionDraft {
  id: string;
  text: string;
  percent: string;
}

interface PublishedTemplate {
  version: number;
  questions: { id: string; text: string; weight: number }[];
}

interface TemplateDraft {
  version: number;
  canSave: boolean;
  questions: QuestionDraft[];
}

function makeQuestionDraft(text = '', percent = ''): QuestionDraft {
  return { id: crypto.randomUUID(), text, percent };
}

function percentageUnits(percent: string): number {
  const value = percent.trim();
  if (!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(value)) return 0;

  const units = Math.round(Number(value.replace(',', '.')) * 100);
  return units <= 10_000 ? units : 0;
}

export function ChecklistPropertyTemplateEditor({
  properties,
  equipmentTypes,
}: {
  properties: Option[];
  equipmentTypes: Option[];
}) {
  const { user } = useAdminSession();
  const [property, setProperty] = useState('');
  const propertyLabel = properties.find(item => item.value === property)?.label;

  if (user?.role !== 'SUPERADMIN') return null;

  return (
    <section className="grid gap-3 rounded-2xl border border-emerald-900/15 bg-emerald-50/50 p-4">
      <h2 className="m-0 text-base font-bold text-slate-900">
        Checklist por inmueble
      </h2>
      <SearchableSelectField
        value={property}
        options={properties}
        onChange={setProperty}
        placeholder="Seleccionar inmueble"
        ariaLabel="Inmueble de la versión del checklist"
      />
      {propertyLabel ? (
        <PropertyTypes
          key={property}
          propertyId={property}
          propertyLabel={propertyLabel}
          equipmentTypes={equipmentTypes}
        />
      ) : null}
    </section>
  );
}

function PropertyTypes({
  propertyId,
  propertyLabel,
  equipmentTypes,
}: {
  propertyId: string;
  propertyLabel: string;
  equipmentTypes: Option[];
}) {
  const [equipment, setEquipment] = useState('');
  const [typeIds, setTypeIds] = useState<string[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const ids = await listAdminChecklistPropertyEquipmentTypeIds(
          getSupabaseClient(),
          propertyId,
        );
        if (active) setTypeIds(ids);
      } catch {
        if (active) setError(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [propertyId]);

  if (error)
    return <p role="alert">No se pudieron cargar los tipos de activo.</p>;
  if (typeIds === null) return <p>Cargando tipos de activo…</p>;
  if (typeIds.length === 0)
    return <p>El inmueble no tiene activos registrados.</p>;

  return (
    <>
      <SearchableSelectField
        value={equipment}
        options={equipmentTypes.filter(item => typeIds.includes(item.value))}
        onChange={setEquipment}
        placeholder="Seleccionar tipo de activo"
        ariaLabel="Tipo de activo de la versión del checklist"
      />
      {equipment ? (
        <TemplateForm
          key={equipment}
          propertyId={propertyId}
          propertyLabel={propertyLabel}
          equipamentoId={equipment}
        />
      ) : null}
    </>
  );
}

function TemplateForm({
  propertyId,
  propertyLabel,
  equipamentoId,
}: {
  propertyId: string;
  propertyLabel: string;
  equipamentoId: string;
}) {
  const [draft, setDraft] = useState<TemplateDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();

    void (async () => {
      try {
        const { data, error } = await supabase
          .from('current_checklist_property_templates')
          .select('version, questions')
          .eq('property_id', propertyId)
          .eq('equipamento_id', equipamentoId)
          .maybeSingle<PublishedTemplate>();
        const schemaUnavailable =
          error?.code === 'PGRST205' || error?.code === '42P01';
        if (error && !schemaUnavailable) throw error;
        if (!active) return;

        if (data) {
          setDraft({
            version: data.version,
            canSave: true,
            questions: data.questions.map(question => ({
              id: question.id,
              text: question.text,
              percent: String(Number((question.weight * 100).toFixed(2))),
            })),
          });
          return;
        }

        const inherited = await listAdminChecklistQuestions(
          supabase,
          equipamentoId,
        );
        if (active) {
          const questions = inherited
            .filter(question => question.activa)
            .map(question =>
              makeQuestionDraft(
                question.pregunta,
                String(question.ponderado ?? ''),
              ),
            );
          setDraft({
            version: 0,
            canSave: !schemaUnavailable,
            questions: questions.length > 0 ? questions : [makeQuestionDraft()],
          });
        }
      } catch {
        if (active) setError('No se pudo cargar la versión del checklist.');
      }
    })();

    return () => {
      active = false;
    };
  }, [propertyId, equipamentoId]);

  if (!draft) {
    return error ? <p role="alert">{error}</p> : <p>Cargando preguntas…</p>;
  }

  const weights = draft.questions.map(question =>
    percentageUnits(question.percent),
  );
  const totalUnits = weights.reduce((sum, value) => sum + value, 0);
  const canPublish =
    totalUnits === 10_000 &&
    weights.every(weight => weight > 0) &&
    draft.questions.every(question => {
      const length = question.text.trim().length;
      return length > 0 && length <= 1000;
    });

  function updateQuestion(
    id: string,
    field: 'text' | 'percent',
    value: string,
  ) {
    setDraft(
      current =>
        current && {
          ...current,
          questions: current.questions.map(question =>
            question.id === id ? { ...question, [field]: value } : question,
          ),
        },
    );
    setSuccess('');
  }

  function removeQuestion(id: string) {
    setDraft(
      current =>
        current && {
          ...current,
          questions: current.questions.filter(question => question.id !== id),
        },
    );
    setSuccess('');
  }

  async function publish() {
    if (!draft?.canSave || !canPublish || saving) return;

    setSaving(true);
    setError('');
    setSuccess('');
    const version = draft.version + 1;
    try {
      const { error } = await getSupabaseClient()
        .from('checklist_property_templates')
        .insert({
          property_id: propertyId,
          equipamento_id: equipamentoId,
          version,
          questions: draft.questions.map((question, index) => ({
            id: question.id,
            text: question.text.trim(),
            weight: weights[index] / 10_000,
          })),
        });
      if (error?.code === '23505') {
        setError(
          'Ya se publicó esa versión. Vuelve a seleccionar el tipo de activo para cargar la última versión.',
        );
        return;
      }
      if (error) throw error;

      setDraft({ ...draft, version });
      setSuccess(`Versión ${version} publicada para ${propertyLabel}.`);
    } catch {
      setError('No se pudo publicar la versión del checklist.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-1.5';

  return (
    <form
      className="grid gap-3"
      onSubmit={event => {
        event.preventDefault();
        void publish();
      }}>
      <p className="m-0 text-sm text-slate-700">
        {draft.version > 0
          ? `Versión publicada ${draft.version}`
          : 'El inmueble usa las preguntas generales hasta que publiques su primera versión.'}
      </p>
      <ol className="m-0 grid list-none gap-2 p-0">
        {draft.questions.map((question, index) => (
          <li key={question.id} className="flex flex-wrap items-end gap-2">
            <label className="grid min-w-48 flex-1 text-sm">
              Pregunta {index + 1}
              <input
                className={inputClass}
                value={question.text}
                maxLength={1000}
                disabled={saving}
                onChange={event =>
                  updateQuestion(question.id, 'text', event.target.value)
                }
              />
            </label>
            <label className="grid w-28 text-sm">
              Peso (%)
              <input
                className={inputClass}
                inputMode="decimal"
                aria-label={`Peso (%) de la pregunta ${index + 1}`}
                value={question.percent}
                disabled={saving}
                onChange={event =>
                  updateQuestion(question.id, 'percent', event.target.value)
                }
              />
            </label>
            <button
              type="button"
              className="min-h-10 rounded-lg px-2 text-sm font-semibold text-red-800 hover:bg-red-50"
              aria-label={`Quitar pregunta ${index + 1}`}
              disabled={saving || draft.questions.length === 1}
              onClick={() => removeQuestion(question.id)}>
              Quitar
            </button>
          </li>
        ))}
      </ol>
      <p className="m-0 text-sm font-semibold">
        Total {new Intl.NumberFormat('es-PE').format(totalUnits / 100)}% de 100%
      </p>
      {!draft.canSave ? (
        <p role="status" className="m-0 text-sm text-slate-700">
          Puedes probar el editor. Para publicar se requiere instalar la
          migración de checklists por inmueble en esta base de datos.
        </p>
      ) : null}
      {!canPublish ? (
        <p className="m-0 text-sm text-slate-700">
          Completa cada pregunta y asigna pesos positivos que sumen 100%.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="m-0 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-10 rounded-lg bg-white px-3 text-sm font-semibold text-emerald-800"
          disabled={saving || draft.questions.length >= 200}
          onClick={() => {
            const question = makeQuestionDraft();
            setDraft({ ...draft, questions: [...draft.questions, question] });
            setSuccess('');
          }}>
          Agregar pregunta
        </button>
        <button
          type="submit"
          className="min-h-10 rounded-lg bg-emerald-800 px-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={saving || !canPublish || !draft.canSave}>
          {saving ? 'Publicando…' : `Publicar en ${propertyLabel}`}
        </button>
      </div>
    </form>
  );
}
