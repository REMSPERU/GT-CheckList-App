import { useEffect, useMemo, useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase-browser';
import {
  listAdminChecklistQuestions,
  listAdminChecklistResponses,
  updateAdminChecklistQuestion,
} from '@/services/admin/checklist.service';
import { listAdminEquipmentTypes } from '@/services/admin/equipment-types.service';
import type {
  AdminChecklistQuestionRow,
  AdminChecklistResponseRow,
  AdminEquipmentTypeRow,
} from '@/types/admin';

const RESPONSE_PAGE_SIZE = 20;

export interface QuestionGroup {
  key: string;
  systemName: string;
  equipmentName: string;
  questions: AdminChecklistQuestionRow[];
}

export function useAdminChecklist() {
  const [equipmentTypes, setEquipmentTypes] = useState<AdminEquipmentTypeRow[]>(
    [],
  );
  const [selectedEquipmentType, setSelectedEquipmentType] = useState('');
  const [questions, setQuestions] = useState<AdminChecklistQuestionRow[]>([]);
  const [responses, setResponses] = useState<AdminChecklistResponseRow[]>([]);
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(
    null,
  );
  const [expandedQuestionGroups, setExpandedQuestionGroups] = useState<
    Record<string, boolean>
  >({});
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

    void loadEquipmentTypes();

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

    void loadChecklistData();

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
    setExpandedQuestionGroups({});
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

  return {
    equipmentTypes,
    selectedEquipmentType,
    handleEquipmentTypeChange,
    responses,
    responsePage,
    setResponsePage,
    responseTotal,
    responseTotalPages,
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
  };
}
