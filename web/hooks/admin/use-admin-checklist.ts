import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase-browser';
import {
  getAdminChecklistScheduleProgress,
  listAdminChecklistPropertyEquipmentTypeIds,
  listAdminChecklistScheduleEquipments,
  listAdminChecklistResponseFilterOptions,
  listAdminChecklistQuestions,
  listAdminChecklistResponses,
  listAdminChecklistSchedules,
  updateAdminChecklistQuestion,
  upsertAdminChecklistSchedule,
} from '@/services/admin/checklist.service';
import { listAdminEquipmentTypes } from '@/services/admin/equipment-types.service';
import { listAdminProperties } from '@/services/admin/properties.service';
import type {
  AdminChecklistQuestionRow,
  AdminChecklistResponseFilterOptions,
  AdminChecklistResponseRow,
  AdminChecklistScheduleEquipmentItem,
  AdminChecklistScheduleFrequency,
  AdminChecklistScheduleProgress,
  AdminChecklistScheduleRow,
  AdminEquipmentTypeRow,
  AdminPropertyRow,
} from '@/types/admin';

const RESPONSE_PAGE_SIZE = 20;
const DEFAULT_SCHEDULE_FREQUENCY: AdminChecklistScheduleFrequency = 'DIARIA';

function getTodayInLima() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find(part => part.type === 'year')?.value ?? '1970';
  const month = parts.find(part => part.type === 'month')?.value ?? '01';
  const day = parts.find(part => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
}

function getExecutionRangeLimit(frequency: AdminChecklistScheduleFrequency) {
  switch (frequency) {
    case 'DIARIA':
      return 1;
    case 'INTERDIARIA':
      return 2;
    case 'SEMANAL':
      return 7;
    case 'QUINCENAL':
      return 15;
    case 'MENSUAL':
      return 31;
  }
}

export type ChecklistReviewStatus = 'all' | 'observed' | 'photos';

export interface QuestionGroup {
  key: string;
  systemName: string;
  equipmentName: string;
  questions: AdminChecklistQuestionRow[];
}

export function useAdminChecklist() {
  const [properties, setProperties] = useState<AdminPropertyRow[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<AdminEquipmentTypeRow[]>(
    [],
  );
  const [selectedEquipmentType, setSelectedEquipmentType] = useState('');
  const [questions, setQuestions] = useState<AdminChecklistQuestionRow[]>([]);
  const [responses, setResponses] = useState<AdminChecklistResponseRow[]>([]);
  const [schedules, setSchedules] = useState<AdminChecklistScheduleRow[]>([]);
  const [selectedScheduleProperty, setSelectedScheduleProperty] = useState('');
  const [selectedScheduleEquipmentType, setSelectedScheduleEquipmentType] =
    useState('');
  const [scheduleFrequency, setScheduleFrequency] =
    useState<AdminChecklistScheduleFrequency>(DEFAULT_SCHEDULE_FREQUENCY);
  const [scheduleOccurrencesPerDay, setScheduleOccurrencesPerDay] =
    useState('1');
  const [scheduleExecutionRangeDays, setScheduleExecutionRangeDays] =
    useState('1');
  const [scheduleWindowStart, setScheduleWindowStart] = useState('08:00');
  const [scheduleWindowEnd, setScheduleWindowEnd] = useState('18:00');
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [scheduleEndDate, setScheduleEndDate] = useState('');
  const [scheduleIsActive, setScheduleIsActive] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleProgress, setScheduleProgress] =
    useState<AdminChecklistScheduleProgress | null>(null);
  const [scheduleEquipments, setScheduleEquipments] = useState<
    AdminChecklistScheduleEquipmentItem[]
  >([]);
  const [scheduleEquipmentTypeIds, setScheduleEquipmentTypeIds] = useState<
    string[]
  >([]);
  const [loadingScheduleEquipmentTypes, setLoadingScheduleEquipmentTypes] =
    useState(false);
  const [loadingScheduleEquipments, setLoadingScheduleEquipments] =
    useState(false);
  const [loadingScheduleProgress, setLoadingScheduleProgress] = useState(false);
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(
    null,
  );
  const [expandedQuestionGroups, setExpandedQuestionGroups] = useState<
    Record<string, boolean>
  >({});
  const [responsePage, setResponsePage] = useState(1);
  const [responseSearch, setResponseSearch] = useState('');
  const [selectedBuildingName, setSelectedBuildingName] = useState('');
  const [responseReviewStatus, setResponseReviewStatus] =
    useState<ChecklistReviewStatus>('all');
  const [responseFilterOptions, setResponseFilterOptions] =
    useState<AdminChecklistResponseFilterOptions>({
      buildings: [],
    });
  const [responseTotal, setResponseTotal] = useState(0);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const deferredResponseSearch = useDeferredValue(responseSearch);

  useEffect(() => {
    let isMounted = true;

    async function loadCatalogs() {
      try {
        const supabase = getSupabaseClient();
        const [propertyResult, equipmentResult, scheduleResult] =
          await Promise.all([
            listAdminProperties(supabase),
            listAdminEquipmentTypes(supabase),
            listAdminChecklistSchedules(supabase),
          ]);

        if (isMounted) {
          setProperties(propertyResult);
          setEquipmentTypes(equipmentResult);
          setSchedules(scheduleResult);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los catalogos de checklist',
          );
        }
      }
    }

    void loadCatalogs();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedScheduleProperty || !selectedScheduleEquipmentType) {
      return;
    }

    const currentSchedule = schedules.find(
      item =>
        item.property_id === selectedScheduleProperty &&
        item.equipamento_id === selectedScheduleEquipmentType,
    );

    setScheduleFrequency(
      currentSchedule?.frequency ?? DEFAULT_SCHEDULE_FREQUENCY,
    );
    setScheduleOccurrencesPerDay(
      currentSchedule ? String(currentSchedule.occurrences_per_day) : '1',
    );
    setScheduleExecutionRangeDays(
      currentSchedule ? String(currentSchedule.execution_range_days ?? 1) : '1',
    );
    setScheduleWindowStart(
      (currentSchedule?.window_start ?? '08:00').slice(0, 5),
    );
    setScheduleWindowEnd((currentSchedule?.window_end ?? '18:00').slice(0, 5));
    setScheduleStartDate(currentSchedule?.start_date ?? '');
    setScheduleEndDate(currentSchedule?.end_date ?? '');
    setScheduleIsActive(currentSchedule?.is_active ?? true);
  }, [schedules, selectedScheduleEquipmentType, selectedScheduleProperty]);

  useEffect(() => {
    let isMounted = true;

    async function loadResponseFilterOptions() {
      try {
        const supabase = getSupabaseClient();
        const result = await listAdminChecklistResponseFilterOptions(supabase, {
          equipamentoId: selectedEquipmentType || undefined,
        });

        if (isMounted) setResponseFilterOptions(result);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los filtros de checklist',
          );
        }
      }
    }

    void loadResponseFilterOptions();

    return () => {
      isMounted = false;
    };
  }, [selectedEquipmentType]);

  useEffect(() => {
    let isMounted = true;

    async function loadChecklistData() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);
        const supabase = getSupabaseClient();
        const [questionResult, responseResult] = await Promise.all([
          listAdminChecklistQuestions(
            supabase,
            selectedEquipmentType || undefined,
          ),
          listAdminChecklistResponses(supabase, {
            page: responsePage,
            pageSize: RESPONSE_PAGE_SIZE,
            equipamentoId: selectedEquipmentType || undefined,
            buildingName: selectedBuildingName || undefined,
            search: deferredResponseSearch || undefined,
            reviewStatus:
              responseReviewStatus === 'all' ? undefined : responseReviewStatus,
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

    void loadChecklistData();

    return () => {
      isMounted = false;
    };
  }, [
    deferredResponseSearch,
    responsePage,
    responseReviewStatus,
    selectedBuildingName,
    selectedEquipmentType,
  ]);

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

  const checklistMetrics = useMemo(() => {
    const observedResponses = responses.filter(
      response => (response.total_observed ?? 0) > 0,
    ).length;
    const totalPhotos = responses.reduce(
      (sum, response) => sum + (response.total_photos ?? 0),
      0,
    );
    const activeQuestions = questions.filter(
      question => question.activa === true,
    ).length;

    return {
      responseTotal,
      observedResponses,
      totalPhotos,
      activeQuestions,
      inactiveQuestions: questions.length - activeQuestions,
    };
  }, [questions, responseTotal, responses]);

  const scheduleMetrics = useMemo(() => {
    const activeSchedules = schedules.filter(item => item.is_active).length;

    return {
      total: schedules.length,
      active: activeSchedules,
      inactive: schedules.length - activeSchedules,
      unconfiguredScopes: Math.max(
        0,
        properties.length * equipmentTypes.length - schedules.length,
      ),
    };
  }, [equipmentTypes.length, properties.length, schedules]);

  const selectedSchedule = useMemo(
    () =>
      schedules.find(
        item =>
          item.property_id === selectedScheduleProperty &&
          item.equipamento_id === selectedScheduleEquipmentType,
      ) ?? null,
    [schedules, selectedScheduleEquipmentType, selectedScheduleProperty],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadScheduleEquipmentTypes() {
      if (!selectedScheduleProperty) {
        setScheduleEquipmentTypeIds([]);
        return;
      }

      try {
        setLoadingScheduleEquipmentTypes(true);
        const supabase = getSupabaseClient();
        const result = await listAdminChecklistPropertyEquipmentTypeIds(
          supabase,
          selectedScheduleProperty,
        );

        if (isMounted) setScheduleEquipmentTypeIds(result);
      } catch (error) {
        if (isMounted) {
          setScheduleEquipmentTypeIds([]);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los tipos de equipo del inmueble',
          );
        }
      } finally {
        if (isMounted) setLoadingScheduleEquipmentTypes(false);
      }
    }

    void loadScheduleEquipmentTypes();

    return () => {
      isMounted = false;
    };
  }, [selectedScheduleProperty]);

  useEffect(() => {
    let isMounted = true;

    async function loadScheduleEquipments() {
      if (!selectedScheduleProperty || !selectedScheduleEquipmentType) {
        setScheduleEquipments([]);
        return;
      }

      try {
        setLoadingScheduleEquipments(true);
        const supabase = getSupabaseClient();
        const result = await listAdminChecklistScheduleEquipments(supabase, {
          propertyId: selectedScheduleProperty,
          equipamentoId: selectedScheduleEquipmentType,
        });

        if (isMounted) setScheduleEquipments(result);
      } catch (error) {
        if (isMounted) {
          setScheduleEquipments([]);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los equipos del inmueble',
          );
        }
      } finally {
        if (isMounted) setLoadingScheduleEquipments(false);
      }
    }

    void loadScheduleEquipments();

    return () => {
      isMounted = false;
    };
  }, [selectedScheduleEquipmentType, selectedScheduleProperty]);

  useEffect(() => {
    let isMounted = true;

    async function loadScheduleProgress() {
      if (!selectedSchedule) {
        setScheduleProgress(null);
        return;
      }

      try {
        setLoadingScheduleProgress(true);
        const supabase = getSupabaseClient();
        const result = await getAdminChecklistScheduleProgress(supabase, {
          propertyId: selectedSchedule.property_id,
          equipamentoId: selectedSchedule.equipamento_id,
          frequency: selectedSchedule.frequency,
          startDate: selectedSchedule.start_date,
          endDate: selectedSchedule.end_date,
        });

        if (isMounted) setScheduleProgress(result);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar el avance de la programacion',
          );
        }
      } finally {
        if (isMounted) setLoadingScheduleProgress(false);
      }
    }

    void loadScheduleProgress();

    return () => {
      isMounted = false;
    };
  }, [selectedSchedule]);

  function handleEquipmentTypeChange(value: string) {
    setSelectedEquipmentType(value);
    setResponsePage(1);
    setExpandedQuestionGroups({});
    setSuccessMessage(null);
  }

  function handleBuildingNameChange(value: string) {
    setSelectedBuildingName(value);
    setResponsePage(1);
  }

  function handleResponseSearchChange(value: string) {
    setResponseSearch(value);
    setResponsePage(1);
  }

  function handleResponseReviewStatusChange(value: string) {
    setResponseReviewStatus(value as ChecklistReviewStatus);
    setResponsePage(1);
  }

  function handleSelectSchedule(schedule: AdminChecklistScheduleRow) {
    setSelectedScheduleProperty(schedule.property_id);
    setSelectedScheduleEquipmentType(schedule.equipamento_id);
    setSuccessMessage(null);
  }

  function handleSchedulePropertyChange(value: string) {
    setSelectedScheduleProperty(value);
    setSelectedScheduleEquipmentType('');
    setScheduleEquipments([]);
    setScheduleProgress(null);
    setSuccessMessage(null);
  }

  async function refreshSchedules() {
    const supabase = getSupabaseClient();
    const result = await listAdminChecklistSchedules(supabase);
    setSchedules(result);
  }

  async function handleSaveSchedule() {
    try {
      setSavingSchedule(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (!selectedScheduleProperty || !selectedScheduleEquipmentType) {
        throw new Error('Selecciona un inmueble y un tipo de equipo.');
      }

      const occurrencesPerDay = Number(scheduleOccurrencesPerDay);
      if (
        !Number.isInteger(occurrencesPerDay) ||
        occurrencesPerDay < 1 ||
        occurrencesPerDay > 24
      ) {
        throw new Error('El maximo por equipo debe ser entre 1 y 24.');
      }

      if (scheduleWindowStart >= scheduleWindowEnd) {
        throw new Error('La hora de inicio debe ser menor que la hora final.');
      }

      const executionRangeDays = Number(scheduleExecutionRangeDays);
      const executionRangeLimit = getExecutionRangeLimit(scheduleFrequency);
      if (
        !Number.isInteger(executionRangeDays) ||
        executionRangeDays < 1 ||
        executionRangeDays > executionRangeLimit
      ) {
        throw new Error(
          `El rango de ejecucion para ${scheduleFrequency.toLowerCase()} debe ser entre 1 y ${executionRangeLimit}.`,
        );
      }

      if (
        scheduleStartDate &&
        scheduleEndDate &&
        scheduleStartDate > scheduleEndDate
      ) {
        throw new Error(
          'La fecha de inicio no puede ser mayor a la fecha fin.',
        );
      }

      const supabase = getSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error('No se pudo identificar al usuario actual.');
      }

      const availableEquipments = await listAdminChecklistScheduleEquipments(
        supabase,
        {
          propertyId: selectedScheduleProperty,
          equipamentoId: selectedScheduleEquipmentType,
        },
      );

      if (availableEquipments.length === 0) {
        throw new Error(
          'No hay equipos de ese tipo en el inmueble seleccionado. No se puede crear la programacion.',
        );
      }

      await upsertAdminChecklistSchedule(supabase, {
        propertyId: selectedScheduleProperty,
        equipamentoId: selectedScheduleEquipmentType,
        frequency: scheduleFrequency,
        occurrencesPerDay,
        executionRangeDays,
        windowStart: `${scheduleWindowStart}:00`,
        windowEnd: `${scheduleWindowEnd}:00`,
        timezone: 'America/Lima',
        startDate: scheduleStartDate || getTodayInLima(),
        endDate: scheduleEndDate || null,
        isActive: scheduleIsActive,
        userId: user.id,
      });

      await refreshSchedules();
      setSuccessMessage('Programacion de checklist guardada correctamente.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la programacion de checklist',
      );
    } finally {
      setSavingSchedule(false);
    }
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
      setSuccessMessage(null);
      const supabase = getSupabaseClient();
      await updateAdminChecklistQuestion(supabase, {
        id: question.id,
        activa: question.activa === true,
        ponderado: question.ponderado,
      });
      setSuccessMessage('Pregunta actualizada correctamente.');
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

  return {
    properties,
    equipmentTypes,
    selectedEquipmentType,
    handleEquipmentTypeChange,
    responses,
    responseSearch,
    handleResponseSearchChange,
    selectedBuildingName,
    handleBuildingNameChange,
    responseFilterOptions,
    responseReviewStatus,
    handleResponseReviewStatusChange,
    responsePage,
    setResponsePage,
    responseTotal,
    responseTotalPages,
    checklistMetrics,
    schedules,
    scheduleMetrics,
    selectedSchedule,
    scheduleEquipments,
    scheduleEquipmentTypeIds,
    loadingScheduleEquipmentTypes,
    loadingScheduleEquipments,
    scheduleProgress,
    loadingScheduleProgress,
    selectedScheduleProperty,
    handleSchedulePropertyChange,
    selectedScheduleEquipmentType,
    setSelectedScheduleEquipmentType,
    scheduleFrequency,
    setScheduleFrequency,
    scheduleExecutionRangeLimit: getExecutionRangeLimit(scheduleFrequency),
    scheduleOccurrencesPerDay,
    setScheduleOccurrencesPerDay,
    scheduleExecutionRangeDays,
    setScheduleExecutionRangeDays,
    scheduleWindowStart,
    setScheduleWindowStart,
    scheduleWindowEnd,
    setScheduleWindowEnd,
    scheduleStartDate,
    setScheduleStartDate,
    scheduleEndDate,
    setScheduleEndDate,
    scheduleIsActive,
    setScheduleIsActive,
    savingSchedule,
    handleSelectSchedule,
    handleSaveSchedule,
    expandedResponseId,
    setExpandedResponseId,
    questions,
    groupedQuestions,
    expandedQuestionGroups,
    toggleQuestionGroup,
    updateQuestionDraft,
    handleSaveQuestion,
    savingQuestionId,
    isLoading,
    errorMessage,
    successMessage,
  };
}
