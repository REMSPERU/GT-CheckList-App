'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { AdminPagination } from '@/components/admin/admin-pagination';
import { ChecklistQuestionGroups } from '@/components/admin/checklist-question-groups';
import { ChecklistResponsesTable } from '@/components/admin/checklist-responses-table';
import { ChecklistScheduleMatrix } from '@/components/admin/checklist-schedule-matrix';
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
  calendar: [],
};

const SECTION_ROUTES: Record<AdminChecklistTab, string> = {
  responses: '/admin/checklist/respuestas',
  questions: '/admin/checklist/preguntas',
  schedule: '/admin/checklist/programaciones',
  calendar: '/admin/checklist/calendario',
};

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Lun', description: 'Lunes' },
  { value: 2, label: 'Mar', description: 'Martes' },
  { value: 3, label: 'Mie', description: 'Miercoles' },
  { value: 4, label: 'Jue', description: 'Jueves' },
  { value: 5, label: 'Vie', description: 'Viernes' },
  { value: 6, label: 'Sab', description: 'Sabado' },
  { value: 7, label: 'Dom', description: 'Domingo' },
];

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
  const scheduleTriggerRef = useRef<HTMLButtonElement>(null);
  const scheduleDialogRef = useRef<HTMLDivElement>(null);
  const [scheduleListSearch, setScheduleListSearch] = useState('');
  const [scheduleListPropertyFilter, setScheduleListPropertyFilter] =
    useState('');
  const [scheduleListEquipmentFilter, setScheduleListEquipmentFilter] =
    useState('');
  const [scheduleListStatusFilter, setScheduleListStatusFilter] =
    useState('all');
  const [questionSearch, setQuestionSearch] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionOrder, setNewQuestionOrder] = useState('1');
  const [newQuestionWeight, setNewQuestionWeight] = useState('1');
  const [newQuestionIsActive, setNewQuestionIsActive] = useState(true);
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
  const visibleQuestionGroups = checklist.groupedQuestions.filter(group => {
    const term = questionSearch.trim().toLocaleLowerCase('es');
    if (!term) return true;

    return [
      group.systemName,
      group.equipmentName,
      ...group.questions.map(question => question.pregunta),
    ].some(value => value.toLocaleLowerCase('es').includes(term));
  });
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
  const closeScheduleEditor = () => {
    setIsScheduleEditorOpen(false);
    window.setTimeout(() => scheduleTriggerRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!isScheduleEditorOpen) return;

    scheduleDialogRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsScheduleEditorOpen(false);
        window.setTimeout(() => scheduleTriggerRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isScheduleEditorOpen]);

  return (
    <main className="grid gap-3.5 px-8 pb-6 pt-3.5 max-[640px]:px-[14px]">
      <Alert>{checklist.errorMessage}</Alert>
      <Alert variant="success">{checklist.successMessage}</Alert>

      <section className="grid grid-cols-4 gap-2 rounded-[22px] border border-slate-900/10 bg-white/75 p-2 shadow-[0_12px_36px_rgba(12,23,32,0.06)] max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
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
        <SectionLink
          active={activeTab === 'calendar'}
          href={SECTION_ROUTES.calendar}
          onNavigate={() => setActiveTab('calendar')}>
          Calendario global
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
          <div className="grid grid-cols-[minmax(240px,1fr)_minmax(240px,1fr)_auto] items-end gap-3 max-[900px]:grid-cols-1">
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
            <label className="grid gap-1.5 text-sm font-bold text-slate-600">
              Buscar configuración
              <SearchInput
                value={questionSearch}
                onChange={setQuestionSearch}
                placeholder="Pregunta, sistema o activo"
                ariaLabel="Buscar preguntas de checklist"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                className="min-h-11 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-700 hover:bg-slate-200"
                type="button"
                onClick={() => checklist.setAllQuestionGroupsExpanded(true)}>
                Expandir todo
              </button>
              <button
                className="min-h-11 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-700 hover:bg-slate-200"
                type="button"
                onClick={() => checklist.setAllQuestionGroupsExpanded(false)}>
                Contraer todo
              </button>
            </div>
          </div>
          <section className="grid gap-3 rounded-[22px] border border-emerald-900/15 bg-[linear-gradient(120deg,#f0fdf4,#ffffff)] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
            <div>
              <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
                Nueva pregunta
              </p>
              <p className="m-0 mt-1 text-sm font-semibold text-slate-600">
                Crea preguntas para el tipo de activo seleccionado. Estarán
                disponibles para todos sus equipos en cada inmueble.
              </p>
            </div>
            <div className="grid grid-cols-[minmax(260px,1fr)_90px_120px_auto_auto] items-end gap-3 max-[960px]:grid-cols-2 max-[640px]:grid-cols-1">
              <label className="grid gap-1.5 text-sm font-bold text-slate-700">
                Pregunta
                <input
                  className="min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  value={newQuestionText}
                  onChange={event => setNewQuestionText(event.target.value)}
                  placeholder="Ej. Verificar presión de trabajo"
                  disabled={!checklist.selectedQuestionEquipmentType}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-700">
                Orden
                <input
                  className="min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  type="number"
                  min="1"
                  value={newQuestionOrder}
                  onChange={event => setNewQuestionOrder(event.target.value)}
                  disabled={!checklist.selectedQuestionEquipmentType}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-700">
                Ponderado
                <input
                  className="min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newQuestionWeight}
                  onChange={event => setNewQuestionWeight(event.target.value)}
                  disabled={!checklist.selectedQuestionEquipmentType}
                />
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                <input
                  className="h-5 w-5 accent-emerald-700"
                  type="checkbox"
                  checked={newQuestionIsActive}
                  onChange={event =>
                    setNewQuestionIsActive(event.target.checked)
                  }
                  disabled={!checklist.selectedQuestionEquipmentType}
                />
                Visible
              </label>
              <button
                className="min-h-11 rounded-xl bg-emerald-800 px-4 text-sm font-black text-white shadow-[0_10px_20px_rgba(6,95,70,0.18)] hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300"
                type="button"
                disabled={
                  !checklist.selectedQuestionEquipmentType ||
                  checklist.creatingQuestion
                }
                onClick={() =>
                  void checklist
                    .handleCreateQuestion({
                      pregunta: newQuestionText,
                      orden: newQuestionOrder,
                      ponderado: newQuestionWeight,
                      activa: newQuestionIsActive,
                    })
                    .then(created => {
                      if (!created) return;
                      setNewQuestionText('');
                      setNewQuestionWeight('1');
                      setNewQuestionOrder('1');
                      setNewQuestionIsActive(true);
                    })
                }>
                {checklist.creatingQuestion ? 'Creando...' : 'Crear pregunta'}
              </button>
            </div>
            {!checklist.selectedQuestionEquipmentType ? (
              <small className="font-bold text-amber-800">
                Selecciona un tipo de activo para habilitar la creación.
              </small>
            ) : null}
          </section>
          <ChecklistQuestionGroups
            questions={checklist.questions}
            groups={visibleQuestionGroups}
            expandedGroups={checklist.expandedQuestionGroups}
            savingQuestionId={checklist.savingQuestionId}
            isLoading={checklist.isLoading}
            onToggleGroup={checklist.toggleQuestionGroup}
            onUpdateQuestion={checklist.updateQuestionDraft}
            onSaveQuestion={checklist.handleSaveQuestion}
          />
        </section>
      ) : activeTab === 'schedule' ? (
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
                ref={scheduleTriggerRef}
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

            <ChecklistScheduleMatrix
              schedules={visibleSchedules}
              selectedScheduleId={checklist.selectedSchedule?.id ?? null}
              onOpenSchedule={openExistingSchedule}
            />
          </section>

          {isScheduleEditorOpen ? (
            <div className="fixed inset-0 z-50 grid place-items-start overflow-auto bg-slate-950/45 px-5 py-6 backdrop-blur-sm max-[640px]:px-3">
              <div
                ref={scheduleDialogRef}
                className="mx-auto grid w-full max-w-[1180px] gap-4 rounded-[30px] border border-white/50 bg-[#eef5f1] p-4 shadow-[0_34px_90px_rgba(2,6,23,0.28)]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="schedule-editor-title"
                tabIndex={-1}>
                <div className="flex items-start justify-between gap-3 max-[640px]:grid">
                  <div>
                    <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-emerald-800">
                      Programacion de checklist
                    </p>
                    <h2
                      id="schedule-editor-title"
                      className="m-0 mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
                      {checklist.selectedSchedule
                        ? 'Editar regla existente'
                        : 'Agregar nueva regla'}
                    </h2>
                  </div>
                  <button
                    className="min-h-10 rounded-2xl bg-white px-4 text-sm font-black text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.10)] hover:bg-slate-100"
                    type="button"
                    onClick={closeScheduleEditor}>
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
                          Se guarda automáticamente según la frecuencia. Esta
                          regla exige hasta{' '}
                          {checklist.scheduleOccurrencesPerDay} registro(s) por
                          activo durante cada período.
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

                      <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                        <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                          Vigente desde
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
                          Vigente hasta (opcional)
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
      ) : (
        <GlobalCalendarPanel checklist={checklist} />
      )}
    </main>
  );
}

interface ScheduleEquipmentPreviewProps {
  equipments: ReturnType<typeof useAdminChecklist>['scheduleEquipments'];
  isLoading: boolean;
  hasSelection: boolean;
}

interface GlobalCalendarPanelProps {
  checklist: ReturnType<typeof useAdminChecklist>;
}

function GlobalCalendarPanel({ checklist }: GlobalCalendarPanelProps) {
  return (
    <section className="grid grid-cols-[1.1fr_1.9fr] gap-6 max-[1120px]:grid-cols-1">
      {/* PANEL 1: CONFIGURACION SEMANAL */}
      <section className="flex flex-col justify-between rounded-[32px] border border-slate-100 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <svg
                className="h-4.5 w-4.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800">
              Regla Semanal
            </span>
          </div>

          <h2 className="m-0 mt-3 text-2xl font-black tracking-[-0.04em] text-slate-900">
            Días laborables
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
            Define la regla base de qué días de la semana se permite llenar
            checklists. Aplica a todas las sedes de forma macro.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            {WEEKDAY_OPTIONS.map(day => {
              const active = checklist.calendarWorkDays.includes(day.value);

              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => checklist.toggleCalendarWorkDay(day.value)}
                  aria-pressed={active}
                  className={`flex items-center justify-between rounded-2xl border px-4.5 py-3.5 text-left transition-all duration-200 ${
                    active
                      ? 'border-emerald-600 bg-emerald-50/40 text-slate-900 shadow-[0_4px_12px_rgba(16,185,129,0.06)]'
                      : 'border-slate-100 bg-slate-50/50 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                  }`}>
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-[0.8rem] font-bold ${
                        active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                      {day.label}
                    </span>
                    <div>
                      <strong className="block text-[0.95rem] font-bold text-slate-800">
                        {day.description}
                      </strong>
                    </div>
                  </div>

                  <div
                    className={`flex h-6.5 w-6.5 items-center justify-center rounded-full transition-all ${
                      active
                        ? 'bg-emerald-600 text-white scale-100'
                        : 'bg-slate-100 text-slate-300 scale-95'
                    }`}>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="3">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          disabled={checklist.savingCalendar}
          onClick={checklist.handleSaveCalendarWorkDays}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.15)] transition-all hover:bg-emerald-950 hover:shadow-[0_12px_28px_rgba(16,185,129,0.2)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">
          {checklist.savingCalendar ? (
            <>
              <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              <span>Guardar regla semanal</span>
            </>
          )}
        </button>
      </section>

      {/* PANEL 2: EXCEPCIONES Y OVERRIDES */}
      <section className="flex flex-col gap-6 rounded-[32px] border border-slate-100 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
        <div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <svg
                  className="h-4.5 w-4.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Feriados y Excepciones
              </span>
            </div>
            <span className="rounded-full bg-slate-50 px-3.5 py-1 text-xs font-bold text-slate-500 border border-slate-100">
              {checklist.calendarExceptions.length} fechas
            </span>
          </div>

          <h2 className="m-0 mt-3 text-2xl font-black tracking-[-0.04em] text-slate-900">
            Feriados y overrides
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
            Define fechas específicas que anulan la regla semanal (ej. bloquear
            feriados nacionales o habilitar un domingo especial).
          </p>
        </div>

        {/* FORMULARIO AGREGAR EXCEPCION */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4.5">
          <div className="grid grid-cols-[1fr_1.5fr_1fr_auto] items-end gap-4.5 max-[1020px]:grid-cols-2 max-[640px]:grid-cols-1">
            <label className="grid gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Fecha
              <input
                type="date"
                value={checklist.calendarExceptionDate}
                onChange={event =>
                  checklist.setCalendarExceptionDate(event.target.value)
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[0.95rem] text-slate-900 outline-none transition-all focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10"
              />
            </label>

            <label className="grid gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Descripción
              <input
                type="text"
                placeholder="Ej. Feriado Nacional (Fiestas Patrias)"
                value={checklist.calendarExceptionDescription}
                onChange={event =>
                  checklist.setCalendarExceptionDescription(event.target.value)
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[0.95rem] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10"
              />
            </label>

            <div className="flex h-11 flex-col justify-between gap-1 max-[640px]:flex-row max-[640px]:items-center">
              <span className="text-[0.68rem] font-black uppercase tracking-wider text-slate-500">
                ¿Es laborable?
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    checklist.setCalendarExceptionIsWorkingDay(
                      !checklist.calendarExceptionIsWorkingDay,
                    )
                  }
                  role="switch"
                  aria-label="Definir si la excepción es laborable"
                  aria-checked={checklist.calendarExceptionIsWorkingDay}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    checklist.calendarExceptionIsWorkingDay
                      ? 'bg-emerald-600'
                      : 'bg-slate-300'
                  }`}>
                  <span
                    className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform duration-200 ${
                      checklist.calendarExceptionIsWorkingDay
                        ? 'translate-x-5.5'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
                <span
                  className={`text-[0.8rem] font-bold ${checklist.calendarExceptionIsWorkingDay ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {checklist.calendarExceptionIsWorkingDay ? 'Sí' : 'No'}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={
                checklist.savingCalendar || !checklist.calendarExceptionDate
              }
              onClick={checklist.handleSaveCalendarException}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-800 px-5 text-sm font-black text-white shadow-[0_8px_18px_rgba(16,185,129,0.15)] transition-all hover:bg-emerald-900 hover:shadow-[0_8px_20px_rgba(16,185,129,0.25)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">
              <svg
                className="h-4.5 w-4.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="3">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Agregar</span>
            </button>
          </div>
        </div>

        {/* LISTADO DE EXCEPCIONES */}
        <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
          {checklist.calendarExceptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3.5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div>
                <strong className="block text-slate-700 text-[0.95rem] font-bold">
                  Aún no hay excepciones globales
                </strong>
                <span className="block mt-1 text-slate-400 text-xs font-medium">
                  Las excepciones guardadas se listarán en esta sección.
                </span>
              </div>
            </div>
          ) : (
            checklist.calendarExceptions.map(exception => (
              <div
                key={exception.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-200 hover:border-slate-200 hover:bg-slate-50 max-[760px]:flex-col max-[760px]:items-start">
                <div className="flex flex-1 items-center gap-4.5 max-[500px]:flex-col max-[500px]:items-start">
                  <div className="flex flex-col">
                    <strong className="text-[1.05rem] font-bold text-slate-900">
                      {formatDateToDisplay(exception.exception_date)}
                    </strong>
                    <span className="mt-0.5 text-xs font-semibold text-slate-400">
                      Fecha registrada
                    </span>
                  </div>

                  <div className="h-6 w-px bg-slate-200 max-[500px]:hidden" />

                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-600">
                      {exception.description || 'Sin descripción'}
                    </span>
                    <span className="mt-0.5 text-xs font-semibold text-slate-400">
                      Motivo / Descripción
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 max-[760px]:w-full max-[760px]:justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black border ${
                      exception.is_working_day
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${exception.is_working_day ? 'bg-emerald-600' : 'bg-rose-600'}`}
                    />
                    {exception.is_working_day ? 'Laborable' : 'No laborable'}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      checklist.handleDeleteCalendarException(exception.id)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 shadow-[0_2px_6px_rgba(0,0,0,0.02)] transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 active:scale-[0.96]"
                    title="Eliminar excepción"
                    aria-label={`Eliminar excepción del ${formatDateToDisplay(exception.exception_date)}`}>
                    <svg
                      className="h-4.5 w-4.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </section>
  );
}

function formatDateToDisplay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split('-');

  return `${day}/${month}/${year}`;
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
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(equipments.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const visibleEquipments = equipments.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [equipments]);

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
      <div className="grid gap-1.5">
        {visibleEquipments.map(equipment => (
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
      {equipments.length > pageSize ? (
        <div className="flex items-center justify-between gap-2 border-t border-emerald-100 pt-2 text-xs font-bold text-emerald-900">
          <span>
            Mostrando {pageStart + 1}-
            {Math.min(pageStart + pageSize, equipments.length)} de{' '}
            {equipments.length} activos
          </span>
          <div className="flex gap-1.5">
            <button
              className="min-h-8 rounded-lg border border-emerald-200 bg-white px-2.5 disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}>
              Anterior
            </button>
            <button
              className="min-h-8 rounded-lg border border-emerald-200 bg-white px-2.5 disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}>
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
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
            {progress.completedOccurrences}/{progress.requiredOccurrences}{' '}
            registros cumplidos
          </h3>
          <p className="m-0 mt-1 text-xs font-semibold text-slate-500">
            Período evaluado: {formatDateToDisplay(progress.periodStart)} al{' '}
            {formatDateToDisplay(progress.periodEnd)}
          </p>
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
              <span className="mt-1 block text-xs font-black text-emerald-800">
                {item.completedOccurrences}/{item.requiredOccurrences} registros
              </span>
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
