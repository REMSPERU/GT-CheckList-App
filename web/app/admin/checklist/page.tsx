'use client';

import { useState } from 'react';

import { AdminPagination } from '@/components/admin/admin-pagination';
import { ChecklistQuestionGroups } from '@/components/admin/checklist-question-groups';
import { ChecklistResponsesTable } from '@/components/admin/checklist-responses-table';
import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { SearchableSelectField } from '@/components/ui/searchable-select-field';
import { SelectField } from '@/components/ui/select-field';
import { useAdminChecklist } from '@/hooks/admin/use-admin-checklist';
import type {
  AdminChecklistScheduleFrequency,
  AdminChecklistScheduleRow,
} from '@/types/admin';

type ChecklistTab = 'responses' | 'questions' | 'schedule';

const REVIEW_STATUS_OPTIONS = [
  { value: 'all', label: 'Todas las respuestas' },
  { value: 'observed', label: 'Solo observadas' },
  { value: 'photos', label: 'Con fotos' },
];

const FREQUENCY_OPTIONS: {
  value: AdminChecklistScheduleFrequency;
  label: string;
}[] = [
  { value: 'DIARIA', label: 'Diaria' },
  { value: 'INTERDIARIA', label: 'Interdiaria' },
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'MENSUAL', label: 'Mensual' },
];

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha';

  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function formatScheduleRange(schedule: AdminChecklistScheduleRow) {
  const canUseRange = ['SEMANAL', 'MENSUAL'].includes(schedule.frequency);

  if (!canUseRange || !schedule.start_date || !schedule.end_date) {
    return 'Sin rango: cuenta solo el dia actual';
  }

  return `${formatDate(schedule.start_date)} a ${formatDate(schedule.end_date)}`;
}

function formatDateTime(value: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(value));
}

export default function AdminChecklistPage() {
  const checklist = useAdminChecklist();
  const [activeTab, setActiveTab] = useState<ChecklistTab>('responses');
  const equipmentOptions = [
    { value: '', label: 'Todos los equipos' },
    ...checklist.equipmentTypes.map(item => ({
      value: item.id,
      label: `${item.systemName} · ${item.nombre}${
        item.frecuencia ? ` · ${item.frecuencia}` : ''
      }`,
    })),
  ];
  const buildingOptions = [
    { value: '', label: 'Todos los inmuebles' },
    ...checklist.responseFilterOptions.buildings,
  ];
  const propertyOptions = [
    ...checklist.properties.map(item => ({
      value: item.id,
      label: item.name,
    })),
  ];
  const scheduleEquipmentOptions = [
    ...checklist.equipmentTypes
      .filter(item => checklist.scheduleEquipmentTypeIds.includes(item.id))
      .map(item => ({
        value: item.id,
        label: `${item.systemName} · ${item.nombre}`,
      })),
  ];
  const hasScheduleScope = Boolean(
    checklist.selectedScheduleProperty &&
    checklist.selectedScheduleEquipmentType,
  );
  const cannotScheduleEmptyScope =
    hasScheduleScope &&
    !checklist.loadingScheduleEquipments &&
    checklist.scheduleEquipments.length === 0;
  const hasNoScheduleEquipmentTypes =
    Boolean(checklist.selectedScheduleProperty) &&
    !checklist.loadingScheduleEquipmentTypes &&
    scheduleEquipmentOptions.length === 0;

  return (
    <main className="grid gap-3.5 px-8 pb-6 pt-3.5 max-[640px]:px-[14px]">
      <Alert>{checklist.errorMessage}</Alert>
      <Alert variant="success">{checklist.successMessage}</Alert>

      <section className="flex gap-2 rounded-[18px] border border-slate-900/10 bg-white/70 p-1.5 shadow-[0_12px_36px_rgba(12,23,32,0.06)] max-[640px]:grid">
        <TabButton
          active={activeTab === 'responses'}
          onClick={() => setActiveTab('responses')}>
          Respuestas recibidas
        </TabButton>
        <TabButton
          active={activeTab === 'questions'}
          onClick={() => setActiveTab('questions')}>
          Preguntas del checklist
        </TabButton>
        <TabButton
          active={activeTab === 'schedule'}
          onClick={() => setActiveTab('schedule')}>
          Programar checklist
        </TabButton>
      </section>

      {activeTab === 'responses' ? (
        <section className="grid gap-4">
          <div className="grid grid-cols-[minmax(220px,1.2fr)_minmax(220px,1fr)_minmax(220px,1fr)_minmax(180px,0.8fr)] gap-3 max-[1180px]:grid-cols-2 max-[640px]:grid-cols-1">
            <SearchInput
              placeholder="Buscar inmueble, equipo, codigo o frecuencia"
              value={checklist.responseSearch}
              onChange={checklist.handleResponseSearchChange}
            />
            <SelectField
              value={checklist.selectedEquipmentType}
              options={equipmentOptions}
              onChange={checklist.handleEquipmentTypeChange}
              ariaLabel="Filtrar respuestas por tipo de equipamento"
            />
            <SelectField
              value={checklist.selectedBuildingName}
              options={buildingOptions}
              onChange={checklist.handleBuildingNameChange}
              ariaLabel="Filtrar respuestas por inmueble"
            />
            <SelectField
              value={checklist.responseReviewStatus}
              options={REVIEW_STATUS_OPTIONS}
              onChange={checklist.handleResponseReviewStatusChange}
              ariaLabel="Filtrar respuestas por estado de revision"
            />
          </div>
          <ChecklistResponsesTable
            responses={checklist.responses}
            total={checklist.responseTotal}
            page={checklist.responsePage}
            totalPages={checklist.responseTotalPages}
            isLoading={checklist.isLoading}
            footer={
              <AdminPagination
                page={checklist.responsePage}
                totalPages={checklist.responseTotalPages}
                isLoading={checklist.isLoading}
                setPage={checklist.setResponsePage}
              />
            }
          />
        </section>
      ) : activeTab === 'questions' ? (
        <section className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-bold text-slate-600">
            Tipo de equipamento
            <SelectField
              value={checklist.selectedEquipmentType}
              options={equipmentOptions}
              onChange={checklist.handleEquipmentTypeChange}
              ariaLabel="Filtrar preguntas por tipo de equipamento"
            />
          </label>
          <ChecklistQuestionGroups
            questions={checklist.questions}
            groups={checklist.groupedQuestions}
            expandedGroups={checklist.expandedQuestionGroups}
            savingQuestionId={checklist.savingQuestionId}
            isLoading={checklist.isLoading}
            onToggleGroup={checklist.toggleQuestionGroup}
            onUpdateQuestion={checklist.updateQuestionDraft}
            onSaveQuestion={checklist.handleSaveQuestion}
          />
        </section>
      ) : (
        <section className="grid gap-4">
          <div className="grid grid-cols-[minmax(320px,0.92fr)_minmax(360px,1.08fr)] gap-4 max-[980px]:grid-cols-1">
            <section className="rounded-[26px] border border-emerald-900/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(236,253,245,0.78))] p-5 shadow-[0_22px_54px_rgba(15,23,42,0.08)]">
              <div className="mb-4">
                <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-emerald-800">
                  Configuracion
                </p>
                <h2 className="m-0 mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
                  Define cuando se puede llenar
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Define horario, limite por equipo y, si aplica, un rango
                  opcional para semanales o mensuales.
                </p>
              </div>

              <div className="grid gap-3">
                <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                  Inmueble
                  <SearchableSelectField
                    value={checklist.selectedScheduleProperty}
                    options={propertyOptions}
                    onChange={checklist.handleSchedulePropertyChange}
                    placeholder="Escribe para buscar inmueble"
                    ariaLabel="Seleccionar inmueble para programar checklist"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                  Tipo de equipo
                  <SearchableSelectField
                    value={checklist.selectedScheduleEquipmentType}
                    options={scheduleEquipmentOptions}
                    onChange={checklist.setSelectedScheduleEquipmentType}
                    placeholder={
                      checklist.selectedScheduleProperty
                        ? checklist.loadingScheduleEquipmentTypes
                          ? 'Cargando tipos del inmueble...'
                          : 'Escribe para buscar tipo de equipo'
                        : 'Primero selecciona un inmueble'
                    }
                    disabled={
                      !checklist.selectedScheduleProperty ||
                      checklist.loadingScheduleEquipmentTypes
                    }
                    ariaLabel="Seleccionar tipo de equipo para programar checklist"
                  />
                </label>

                {hasNoScheduleEquipmentTypes ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                    Este inmueble no tiene equipos registrados para programar.
                  </div>
                ) : null}

                <ScheduleEquipmentPreview
                  equipments={checklist.scheduleEquipments}
                  isLoading={checklist.loadingScheduleEquipments}
                  hasSelection={hasScheduleScope}
                />

                <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                  <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                    Frecuencia
                    <SelectField
                      value={checklist.scheduleFrequency}
                      options={FREQUENCY_OPTIONS}
                      onChange={value =>
                        checklist.setScheduleFrequency(
                          value as AdminChecklistScheduleFrequency,
                        )
                      }
                      ariaLabel="Seleccionar frecuencia de checklist"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                    Máximo por equipo
                    <input
                      className="min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-[0.95rem] text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      type="number"
                      min="1"
                      max="24"
                      value={checklist.scheduleOccurrencesPerDay}
                      onChange={event =>
                        checklist.setScheduleOccurrencesPerDay(
                          event.target.value,
                        )
                      }
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                  <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                    Hora inicio
                    <input
                      className="min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-[0.95rem] text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      type="time"
                      value={checklist.scheduleWindowStart}
                      onChange={event =>
                        checklist.setScheduleWindowStart(event.target.value)
                      }
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                    Hora fin
                    <input
                      className="min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-[0.95rem] text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      type="time"
                      value={checklist.scheduleWindowEnd}
                      onChange={event =>
                        checklist.setScheduleWindowEnd(event.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                  <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                    Inicio del rango opcional
                    <input
                      className="min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-[0.95rem] text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      type="date"
                      value={checklist.scheduleStartDate}
                      onChange={event =>
                        checklist.setScheduleStartDate(event.target.value)
                      }
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                    Fin del rango opcional
                    <input
                      className="min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-[0.95rem] text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      type="date"
                      value={checklist.scheduleEndDate}
                      onChange={event =>
                        checklist.setScheduleEndDate(event.target.value)
                      }
                    />
                  </label>
                </div>

                <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-black text-slate-700">
                  Programacion activa
                  <input
                    className="h-5 w-5 accent-emerald-700"
                    type="checkbox"
                    checked={checklist.scheduleIsActive}
                    onChange={event =>
                      checklist.setScheduleIsActive(event.target.checked)
                    }
                  />
                </label>

                <button
                  className="min-h-12 rounded-2xl bg-emerald-800 px-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(6,95,70,0.24)] transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  type="button"
                  disabled={
                    !hasScheduleScope ||
                    checklist.savingSchedule ||
                    checklist.loadingScheduleEquipments ||
                    cannotScheduleEmptyScope
                  }
                  onClick={checklist.handleSaveSchedule}>
                  {checklist.savingSchedule
                    ? 'Guardando...'
                    : checklist.selectedSchedule
                      ? 'Actualizar programacion'
                      : 'Crear programacion'}
                </button>
              </div>
            </section>

            <section className="rounded-[26px] border border-slate-900/10 bg-white/85 p-5 shadow-[0_22px_54px_rgba(15,23,42,0.08)]">
              <div className="mb-4 flex items-start justify-between gap-3 max-[640px]:grid">
                <div>
                  <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Estado actual
                  </p>
                  <h2 className="m-0 mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
                    Todo lo programado
                  </h2>
                </div>
                <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">
                  {checklist.schedules.length} reglas
                </span>
              </div>

              {checklist.schedules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
                  Todavia no hay programaciones guardadas.
                </div>
              ) : (
                <div className="grid max-h-[620px] gap-3 overflow-auto pr-1">
                  {checklist.schedules.map(schedule => (
                    <ScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      selected={checklist.selectedSchedule?.id === schedule.id}
                      onSelect={() => checklist.handleSelectSchedule(schedule)}
                    />
                  ))}
                </div>
              )}

              <ScheduleProgressPanel
                isLoading={checklist.loadingScheduleProgress}
                progress={checklist.scheduleProgress}
              />
            </section>
          </div>
        </section>
      )}
    </main>
  );
}

interface ScheduleEquipmentPreviewProps {
  equipments: ReturnType<typeof useAdminChecklist>['scheduleEquipments'];
  isLoading: boolean;
  hasSelection: boolean;
}

function ScheduleEquipmentPreview({
  equipments,
  isLoading,
  hasSelection,
}: ScheduleEquipmentPreviewProps) {
  if (!hasSelection) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
        Selecciona inmueble y tipo para ver que equipos se programaran.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
        Cargando equipos del inmueble...
      </div>
    );
  }

  if (equipments.length === 0) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
        Este inmueble no tiene equipos de ese tipo. No se puede programar esta
        regla.
      </div>
    );
  }

  return (
    <div className="grid gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
      <p className="m-0 text-sm font-black text-emerald-950">
        Se programaran {equipments.length} equipo
        {equipments.length === 1 ? '' : 's'}:
      </p>
      <div className="grid max-h-36 gap-1.5 overflow-auto pr-1">
        {equipments.map(equipment => (
          <div
            className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600"
            key={equipment.id}>
            <strong className="block text-sm text-slate-950">
              {equipment.codigo || 'Sin codigo'}
            </strong>
            {[equipment.ubicacion, equipment.detalle_ubicacion]
              .filter(Boolean)
              .join(' - ') || 'Sin ubicacion'}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ScheduleProgressPanelProps {
  isLoading: boolean;
  progress: ReturnType<typeof useAdminChecklist>['scheduleProgress'];
}

function ScheduleProgressPanel({
  isLoading,
  progress,
}: ScheduleProgressPanelProps) {
  if (isLoading) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-500">
        Cargando avance del rango...
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-500">
        Selecciona una programacion para ver equipos pendientes.
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3 max-[640px]:grid">
        <div>
          <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Avance del rango actual
          </p>
          <h3 className="m-0 mt-1 text-lg font-black text-slate-950">
            {progress.completed.length}/{progress.total} equipos completados
          </h3>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900">
          {progress.pending.length} pendientes
        </span>
      </div>

      <ScheduleProgressList title="Pendientes" items={progress.pending} />
      <ScheduleProgressList title="Completados" items={progress.completed} />
    </div>
  );
}

interface ScheduleProgressListProps {
  title: string;
  items: NonNullable<
    ReturnType<typeof useAdminChecklist>['scheduleProgress']
  >['pending'];
}

function ScheduleProgressList({ title, items }: ScheduleProgressListProps) {
  return (
    <div className="grid gap-2">
      <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {title}
      </p>
      {items.length === 0 ? (
        <div className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-500">
          Sin registros.
        </div>
      ) : (
        <div className="grid max-h-56 gap-2 overflow-auto pr-1">
          {items.map(item => (
            <div
              key={item.equipoId}
              className="rounded-xl bg-white px-3 py-2 text-sm shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
              <strong className="block text-slate-900">
                {item.codigo || 'Sin codigo'}
              </strong>
              <span className="block text-xs font-bold text-slate-500">
                {[item.ubicacion, item.detalle_ubicacion]
                  .filter(Boolean)
                  .join(' - ') || 'Sin ubicacion'}
              </span>
              {item.submitted_at ? (
                <span className="mt-1 block text-xs font-black text-emerald-700">
                  Enviado: {formatDateTime(item.submitted_at)}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ScheduleCardProps {
  schedule: AdminChecklistScheduleRow;
  selected: boolean;
  onSelect: () => void;
}

function ScheduleCard({ schedule, selected, onSelect }: ScheduleCardProps) {
  return (
    <button
      className={`grid gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.10)] ${
        selected
          ? 'border-emerald-700 bg-emerald-50/90'
          : 'border-slate-200 bg-white'
      }`}
      type="button"
      onClick={onSelect}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-base font-black text-slate-950">
            {schedule.propertyName}
          </h3>
          <p className="m-0 mt-0.5 text-sm font-bold text-slate-500">
            {schedule.systemName} · {schedule.equipmentName}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] ${
            schedule.is_active
              ? 'bg-emerald-100 text-emerald-900'
              : 'bg-slate-200 text-slate-600'
          }`}>
          {schedule.is_active ? 'Activa' : 'Pausada'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 max-[640px]:grid-cols-1">
        <ScheduleFact label="Frecuencia" value={schedule.frequency} />
        <ScheduleFact
          label="Limite por equipo"
          value={`${schedule.occurrences_per_day} vez${
            schedule.occurrences_per_day === 1 ? '' : 'es'
          }`}
        />
        <ScheduleFact
          label="Horario"
          value={`${formatTime(schedule.window_start)} - ${formatTime(
            schedule.window_end,
          )}`}
        />
      </div>

      <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
        Rango de ejecucion: {formatScheduleRange(schedule)} · Lima
      </div>
    </button>
  );
}

interface ScheduleFactProps {
  label: string;
  value: string;
}

function ScheduleFact({ label, value }: ScheduleFactProps) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <span className="block text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      <strong className="mt-0.5 block text-sm font-black text-slate-800">
        {value}
      </strong>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  children: string;
  onClick: () => void;
}

function TabButton({ active, children, onClick }: TabButtonProps) {
  return (
    <button
      className={`min-h-11 flex-1 rounded-[14px] px-4 text-sm font-black transition-colors ${
        active
          ? 'bg-emerald-800 text-white shadow-[0_10px_24px_rgba(6,95,70,0.22)]'
          : 'bg-transparent text-slate-500 hover:bg-emerald-50 hover:text-emerald-900'
      }`}
      type="button"
      onClick={onClick}
      aria-pressed={active}>
      {children}
    </button>
  );
}
