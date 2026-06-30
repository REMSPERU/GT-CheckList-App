'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { AdminPagination } from '@/components/admin/admin-pagination';
import { ChecklistQuestionGroups } from '@/components/admin/checklist-question-groups';
import { ChecklistResponsesTable } from '@/components/admin/checklist-responses-table';
import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { SearchableSelectField } from '@/components/ui/searchable-select-field';
import { SelectField } from '@/components/ui/select-field';
import {
  type AdminChecklistTab,
  useAdminChecklist,
} from '@/hooks/admin/use-admin-checklist';
import type {
  AdminChecklistScheduleFrequency,
  AdminChecklistScheduleRow,
} from '@/types/admin';

const TAB_QUERY_PARAMS: Record<AdminChecklistTab, string[]> = {
  responses: ['eqType', 'page', 'search', 'building', 'status'],
  questions: ['questionEqType'],
  schedule: ['schedProp', 'schedEqType'],
};

const SECTION_ROUTES: Record<AdminChecklistTab, string> = {
  responses: '/admin/checklist/respuestas',
  questions: '/admin/checklist/preguntas',
  schedule: '/admin/checklist/programaciones',
};

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
  { value: 'QUINCENAL', label: 'Quincenal' },
  { value: 'MENSUAL', label: 'Mensual' },
];

function formatTime(value: string) {
  return value.slice(0, 5);
}

function formatDateTime(value: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(value));
}

function getFrequencyRangeLabel(frequency: AdminChecklistScheduleFrequency) {
  switch (frequency) {
    case 'DIARIA':
      return '1 dia operativo';
    case 'INTERDIARIA':
      return '2 dias operativos';
    case 'SEMANAL':
      return '7 dias operativos';
    case 'QUINCENAL':
      return '15 dias operativos';
    case 'MENSUAL':
      return '31 dias operativos';
  }
}

interface AdminChecklistContentProps {
  routeTab: AdminChecklistTab;
}

function AdminChecklistContent({ routeTab }: AdminChecklistContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = routeTab;
  const checklist = useAdminChecklist(activeTab);
  const [isScheduleEditorOpen, setIsScheduleEditorOpen] = useState(false);
  const [scheduleListSearch, setScheduleListSearch] = useState('');
  const [scheduleListPropertyFilter, setScheduleListPropertyFilter] =
    useState('');
  const [scheduleListEquipmentFilter, setScheduleListEquipmentFilter] =
    useState('');
  const [scheduleListStatusFilter, setScheduleListStatusFilter] =
    useState('all');
  const setActiveTab = (tab: AdminChecklistTab) => {
    const params = new URLSearchParams(searchParams.toString());
    const allowedParams = new Set(TAB_QUERY_PARAMS[tab]);

    Array.from(params.keys()).forEach(key => {
      if (!allowedParams.has(key)) params.delete(key);
    });

    const nextQuery = params.toString();
    router.push(`${SECTION_ROUTES[tab]}${nextQuery ? `?${nextQuery}` : ''}`, {
      scroll: false,
    });
  };
  const detailReturnTo = `${pathname}?${searchParams.toString()}`;
  const equipmentOptions = [
    { value: '', label: 'Todos los activos' },
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
  const scheduleListPropertyOptions = [
    { value: '', label: 'Todos los inmuebles' },
    ...propertyOptions,
  ];
  const scheduleListEquipmentOptions = [
    { value: '', label: 'Todos los tipos de activo' },
    ...checklist.equipmentTypes.map(item => ({
      value: item.id,
      label: `${item.systemName} · ${item.nombre}`,
    })),
  ];
  const scheduleStatusOptions = [
    { value: 'all', label: 'Todas las reglas' },
    { value: 'active', label: 'Solo activas' },
    { value: 'paused', label: 'Solo pausadas' },
  ];
  const relatedSchedules = checklist.schedules.filter(schedule => {
    if (
      scheduleListPropertyFilter &&
      schedule.property_id !== scheduleListPropertyFilter
    ) {
      return false;
    }

    if (
      scheduleListEquipmentFilter &&
      schedule.equipamento_id !== scheduleListEquipmentFilter
    ) {
      return false;
    }

    if (scheduleListStatusFilter === 'active') return schedule.is_active;
    if (scheduleListStatusFilter === 'paused') return !schedule.is_active;

    return true;
  });
  const hasScheduleListFilters = Boolean(
    scheduleListSearch ||
    scheduleListPropertyFilter ||
    scheduleListEquipmentFilter ||
    scheduleListStatusFilter !== 'all',
  );
  const scheduleSearchTerm = scheduleListSearch.trim().toLocaleLowerCase('es');
  const visibleSchedules = scheduleSearchTerm
    ? relatedSchedules.filter(schedule =>
        [
          schedule.propertyName,
          schedule.systemName,
          schedule.equipmentName,
          schedule.frequency,
        ].some(value =>
          value.toLocaleLowerCase('es').includes(scheduleSearchTerm),
        ),
      )
    : relatedSchedules;
  const openCreateSchedule = () => {
    checklist.handleCreateScheduleDraft();
    setIsScheduleEditorOpen(true);
  };
  const openExistingSchedule = (schedule: AdminChecklistScheduleRow) => {
    checklist.handleSelectSchedule(schedule);
    setIsScheduleEditorOpen(true);
  };
  const clearScheduleListFilters = () => {
    setScheduleListSearch('');
    setScheduleListPropertyFilter('');
    setScheduleListEquipmentFilter('');
    setScheduleListStatusFilter('all');
  };
  const clearScheduleSelection = () => {
    checklist.handleClearScheduleSelection();
    setIsScheduleEditorOpen(false);
  };

  return (
    <main className="grid gap-3.5 px-8 pb-6 pt-3.5 max-[640px]:px-[14px]">
      <Alert>{checklist.errorMessage}</Alert>
      <Alert variant="success">{checklist.successMessage}</Alert>

      <section className="grid grid-cols-3 gap-2 rounded-[22px] border border-slate-900/10 bg-white/75 p-2 shadow-[0_12px_36px_rgba(12,23,32,0.06)] max-[760px]:grid-cols-1">
        <SectionLink
          active={activeTab === 'responses'}
          href={SECTION_ROUTES.responses}
          onNavigate={() => setActiveTab('responses')}>
          Respuestas recibidas
        </SectionLink>
        <SectionLink
          active={activeTab === 'questions'}
          href={SECTION_ROUTES.questions}
          onNavigate={() => setActiveTab('questions')}>
          Preguntas del checklist
        </SectionLink>
        <SectionLink
          active={activeTab === 'schedule'}
          href={SECTION_ROUTES.schedule}
          onNavigate={() => setActiveTab('schedule')}>
          Programar checklist
        </SectionLink>
      </section>

      {activeTab === 'responses' ? (
        <section className="grid gap-4">
          <div className="grid grid-cols-[minmax(220px,1.2fr)_minmax(220px,1fr)_minmax(220px,1fr)_minmax(180px,0.8fr)] gap-3 max-[1180px]:grid-cols-2 max-[640px]:grid-cols-1">
            <SearchInput
              placeholder="Buscar inmueble, activo, codigo o frecuencia"
              value={checklist.responseSearch}
              onChange={checklist.handleResponseSearchChange}
            />
            <SelectField
              value={checklist.selectedEquipmentType}
              options={equipmentOptions}
              onChange={checklist.handleEquipmentTypeChange}
              ariaLabel="Filtrar respuestas por tipo de activo"
            />
            <SearchableSelectField
              value={checklist.selectedBuildingName}
              options={buildingOptions}
              onChange={checklist.handleBuildingNameChange}
              placeholder="Filtrar por inmueble"
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
            returnTo={detailReturnTo}
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
            Tipo de activo
            <SearchableSelectField
              value={checklist.selectedQuestionEquipmentType}
              options={equipmentOptions}
              onChange={checklist.handleQuestionEquipmentTypeChange}
              placeholder="Seleccionar tipo de activo"
              ariaLabel="Filtrar preguntas por tipo de activo"
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
          <section className="rounded-[26px] border border-slate-900/10 bg-white/85 p-5 shadow-[0_22px_54px_rgba(15,23,42,0.08)]">
            <div className="mb-4 flex items-start justify-between gap-3 max-[640px]:grid">
              <div>
                <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Reglas guardadas
                </p>
                <h2 className="m-0 mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
                  Programaciones guardadas
                </h2>
                <p className="m-0 mt-1.5 text-sm font-bold text-slate-500">
                  Primero revisa lo que ya existe. Si necesitas otra regla, crea
                  una nueva desde aqui.
                </p>
              </div>
              <button
                className="min-h-11 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)] transition hover:bg-emerald-900"
                type="button"
                onClick={openCreateSchedule}>
                Agregar programacion
              </button>
            </div>

            <div className="mb-4 grid grid-cols-[minmax(240px,1.2fr)_minmax(220px,1fr)_minmax(220px,1fr)_minmax(180px,0.8fr)_auto] items-center gap-3 max-[1180px]:grid-cols-2 max-[640px]:grid-cols-1">
              <SearchInput
                placeholder="Buscar por inmueble, especialidad, activo o frecuencia"
                value={scheduleListSearch}
                onChange={setScheduleListSearch}
              />
              <SearchableSelectField
                value={scheduleListPropertyFilter}
                options={scheduleListPropertyOptions}
                onChange={setScheduleListPropertyFilter}
                placeholder="Filtrar por inmueble"
                ariaLabel="Filtrar programaciones por inmueble"
              />
              <SearchableSelectField
                value={scheduleListEquipmentFilter}
                options={scheduleListEquipmentOptions}
                onChange={setScheduleListEquipmentFilter}
                placeholder="Filtrar por tipo de activo"
                ariaLabel="Filtrar programaciones por tipo de activo"
              />
              <SelectField
                value={scheduleListStatusFilter}
                options={scheduleStatusOptions}
                onChange={setScheduleListStatusFilter}
                ariaLabel="Filtrar programaciones por estado"
              />
              <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
                {visibleSchedules.length} de {relatedSchedules.length}
              </span>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {hasScheduleListFilters ? (
                <button
                  className="min-h-9 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                  type="button"
                  onClick={clearScheduleListFilters}>
                  Limpiar filtros
                </button>
              ) : null}
              {checklist.selectedSchedule ? (
                <button
                  className="min-h-9 rounded-xl bg-amber-100 px-3 text-xs font-black text-amber-900 transition hover:bg-amber-200"
                  type="button"
                  onClick={clearScheduleSelection}>
                  Quitar seleccion
                </button>
              ) : null}
            </div>

            {visibleSchedules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
                {relatedSchedules.length === 0
                  ? 'No hay programaciones guardadas para los filtros seleccionados.'
                  : 'No hay programaciones que coincidan con la busqueda.'}
              </div>
            ) : (
              <div className="grid max-h-[460px] gap-3 overflow-auto pr-1">
                {visibleSchedules.map(schedule => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    selected={checklist.selectedSchedule?.id === schedule.id}
                    onSelect={() => openExistingSchedule(schedule)}
                  />
                ))}
              </div>
            )}
          </section>

          {isScheduleEditorOpen ? (
            <div className="fixed inset-0 z-50 grid place-items-start overflow-auto bg-slate-950/45 px-5 py-6 backdrop-blur-sm max-[640px]:px-3">
              <div className="mx-auto grid w-full max-w-[1180px] gap-4 rounded-[30px] border border-white/50 bg-[#eef5f1] p-4 shadow-[0_34px_90px_rgba(2,6,23,0.28)]">
                <div className="flex items-start justify-between gap-3 max-[640px]:grid">
                  <div>
                    <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-emerald-800">
                      Programacion de checklist
                    </p>
                    <h2 className="m-0 mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
                      {checklist.selectedSchedule
                        ? 'Editar regla existente'
                        : 'Agregar nueva regla'}
                    </h2>
                  </div>
                  <button
                    className="min-h-10 rounded-2xl bg-white px-4 text-sm font-black text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.10)] hover:bg-slate-100"
                    type="button"
                    onClick={() => setIsScheduleEditorOpen(false)}>
                    Cerrar
                  </button>
                </div>

                <div className="grid grid-cols-[minmax(320px,0.92fr)_minmax(360px,1.08fr)] gap-4 max-[980px]:grid-cols-1">
                  <section className="rounded-[26px] border border-emerald-900/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(236,253,245,0.78))] p-5 shadow-[0_22px_54px_rgba(15,23,42,0.08)]">
                    <div className="mb-4">
                      <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-emerald-800">
                        {checklist.selectedSchedule
                          ? 'Editar regla'
                          : 'Nueva regla'}
                      </p>
                      <h2 className="m-0 mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
                        Define cuando se puede llenar
                      </h2>
                      <p className="mt-1.5 text-sm text-slate-500">
                        Define una regla recurrente que se mantiene activa hasta
                        que sea pausada o modificada. El rango operativo se
                        calcula por frecuencia para evitar configuraciones
                        inconsistentes.
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
                        Tipo de activo
                        <SearchableSelectField
                          value={checklist.selectedScheduleEquipmentType}
                          options={scheduleEquipmentOptions}
                          onChange={checklist.setSelectedScheduleEquipmentType}
                          placeholder={
                            checklist.selectedScheduleProperty
                              ? checklist.loadingScheduleEquipmentTypes
                                ? 'Cargando tipos del inmueble...'
                                : 'Escribe para buscar tipo de activo'
                              : 'Primero selecciona un inmueble'
                          }
                          disabled={
                            !checklist.selectedScheduleProperty ||
                            checklist.loadingScheduleEquipmentTypes
                          }
                          ariaLabel="Seleccionar tipo de activo para programar checklist"
                        />
                      </label>

                      {hasNoScheduleEquipmentTypes ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                          Este inmueble no tiene activos registrados para
                          programar.
                        </div>
                      ) : null}

                      <ScheduleEquipmentPreview
                        equipments={checklist.scheduleEquipments}
                        isLoading={checklist.loadingScheduleEquipments}
                        hasSelection={hasScheduleScope}
                      />

                      <ScheduleSelectionState
                        hasSelection={hasScheduleScope}
                        selectedSchedule={checklist.selectedSchedule}
                        equipmentCount={checklist.scheduleEquipments.length}
                        isLoadingEquipments={
                          checklist.loadingScheduleEquipments
                        }
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
                          Veces máximas por activo
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

                      <div className="rounded-2xl border border-emerald-900/10 bg-white/80 px-4 py-3">
                        <span className="block text-[0.68rem] font-black uppercase tracking-[0.14em] text-emerald-800">
                          Rango automatico
                        </span>
                        <strong className="mt-1 block text-lg font-black text-slate-950">
                          {getFrequencyRangeLabel(checklist.scheduleFrequency)}
                        </strong>
                        <p className="m-0 mt-1 text-xs font-semibold text-slate-500">
                          Se guarda automaticamente segun la frecuencia
                          seleccionada.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                        <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                          Hora inicio
                          <input
                            className="min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-[0.95rem] text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            type="time"
                            value={checklist.scheduleWindowStart}
                            onChange={event =>
                              checklist.setScheduleWindowStart(
                                event.target.value,
                              )
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
                          Operacion actual
                        </p>
                        <h2 className="m-0 mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
                          Avance de la regla
                        </h2>
                      </div>
                      <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">
                        {checklist.scheduleProgress?.pending.length ?? 0}{' '}
                        pendientes
                      </span>
                    </div>

                    <ScheduleProgressPanel
                      isLoading={checklist.loadingScheduleProgress}
                      progress={checklist.scheduleProgress}
                    />
                  </section>
                </div>
              </div>
            </div>
          ) : null}
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

interface ScheduleSelectionStateProps {
  hasSelection: boolean;
  selectedSchedule: ReturnType<typeof useAdminChecklist>['selectedSchedule'];
  equipmentCount: number;
  isLoadingEquipments: boolean;
}

function ScheduleSelectionState({
  hasSelection,
  selectedSchedule,
  equipmentCount,
  isLoadingEquipments,
}: ScheduleSelectionStateProps) {
  if (!hasSelection) return null;

  const hasExistingRule = Boolean(selectedSchedule);

  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        hasExistingRule
          ? 'border-emerald-200 bg-emerald-50/80'
          : 'border-amber-200 bg-amber-50/80'
      }`}>
      <span
        className={`block text-[0.68rem] font-black uppercase tracking-[0.14em] ${
          hasExistingRule ? 'text-emerald-800' : 'text-amber-800'
        }`}>
        {hasExistingRule ? 'Lista para editar' : 'Nueva programacion'}
      </span>
      <strong className="mt-1 block text-sm font-black text-slate-950">
        {hasExistingRule
          ? 'Ya existe una regla para esta combinacion.'
          : 'No existe una regla para este inmueble y tipo.'}
      </strong>
      <p className="m-0 mt-1 text-xs font-semibold text-slate-600">
        {isLoadingEquipments
          ? 'Validando activos afectados...'
          : `${equipmentCount} activo${equipmentCount === 1 ? '' : 's'} afectado${equipmentCount === 1 ? '' : 's'}.`}
      </p>
    </div>
  );
}

function ScheduleEquipmentPreview({
  equipments,
  isLoading,
  hasSelection,
}: ScheduleEquipmentPreviewProps) {
  if (!hasSelection) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
        Selecciona inmueble y tipo para ver qué activos se programarán.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
        Cargando activos del inmueble...
      </div>
    );
  }

  if (equipments.length === 0) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
        Este inmueble no tiene activos de ese tipo. No se puede programar esta
        regla.
      </div>
    );
  }

  return (
    <div className="grid gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
      <p className="m-0 text-sm font-black text-emerald-950">
        Se programarán {equipments.length} activo
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
        Selecciona una programación para ver activos pendientes.
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
            {progress.completed.length}/{progress.total} activos completados
          </h3>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900">
          {progress.pending.length} pendientes
        </span>
      </div>

      <ScheduleProgressList title="Pendientes" items={progress.pending} />

      <details className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
        <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.14em] text-slate-500">
          Completados ({progress.completed.length})
        </summary>
        <div className="mt-3">
          <ScheduleProgressList title="" items={progress.completed} compact />
        </div>
      </details>
    </div>
  );
}

interface ScheduleProgressListProps {
  title: string;
  items: NonNullable<
    ReturnType<typeof useAdminChecklist>['scheduleProgress']
  >['pending'];
  compact?: boolean;
}

function ScheduleProgressList({
  title,
  items,
  compact = false,
}: ScheduleProgressListProps) {
  return (
    <div className="grid gap-2">
      {title ? (
        <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          {title}
        </p>
      ) : null}
      {items.length === 0 ? (
        <div className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-500">
          Sin registros.
        </div>
      ) : (
        <div
          className={`grid gap-2 overflow-auto pr-1 ${compact ? 'max-h-40' : 'max-h-56'}`}>
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

      <div className="grid grid-cols-4 gap-2 max-[820px]:grid-cols-2 max-[640px]:grid-cols-1">
        <ScheduleFact label="Frecuencia" value={schedule.frequency} />
        <ScheduleFact
          label="Veces maximas"
          value={`${schedule.occurrences_per_day} vez${
            schedule.occurrences_per_day === 1 ? '' : 'es'
          }`}
        />
        <ScheduleFact
          label="Rango ejec."
          value={getFrequencyRangeLabel(schedule.frequency)}
        />
        <ScheduleFact
          label="Horario"
          value={`${formatTime(schedule.window_start)} - ${formatTime(
            schedule.window_end,
          )}`}
        />
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

interface SectionLinkProps {
  active: boolean;
  children: string;
  href: string;
  onNavigate: () => void;
}

function SectionLink({ active, children, href, onNavigate }: SectionLinkProps) {
  return (
    <Link
      className={`min-h-11 rounded-[16px] px-4 py-3 text-center text-sm font-black no-underline transition-colors ${
        active
          ? 'bg-emerald-800 text-white shadow-[0_10px_24px_rgba(6,95,70,0.22)]'
          : 'bg-transparent text-slate-500 hover:bg-emerald-50 hover:text-emerald-900'
      }`}
      href={href}
      onClick={event => {
        event.preventDefault();
        onNavigate();
      }}
      aria-pressed={active}>
      {children}
    </Link>
  );
}

export function AdminChecklistRoutePage({
  activeTab,
}: {
  activeTab: AdminChecklistTab;
}) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[400px] place-items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#bdd2d0] border-t-emerald-800" />
          <p className="text-sm text-slate-500 font-medium">
            Cargando checklist...
          </p>
        </div>
      }>
      <AdminChecklistContent routeTab={activeTab} />
    </Suspense>
  );
}

export default function AdminChecklistPage() {
  return <AdminChecklistRoutePage activeTab="responses" />;
}
