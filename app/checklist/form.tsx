import React, {
  useCallback,
  useEffect,
  memo,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { persistLocalPhoto, saveToGallery } from '@/lib/photo-storage';
import { Ionicons } from '@expo/vector-icons';

import { AppAlertModal } from '@/components/app-alert-modal';
import { CameraSourceSheet } from '@/components/maintenance/camera-source-sheet';
import { QuestionChecklistItem } from '@/components/maintenance/checklist/question-checklist-item';
import type {
  ChecklistQuestionAnswer,
  PreguntaEquipamento,
} from '@/types/checklist';
import { ensureImagePermission } from '@/lib/image-permissions';
import { supabase } from '@/lib/supabase';
import type { StoredPhotoRef } from '@/services/checklist-storage.service';
import { supabaseChecklistScheduleService } from '@/services/supabase-checklist-schedule.service';
import { DatabaseService } from '@/services/database';
import { useUserRole } from '@/hooks/use-user-role';
import { syncService } from '@/services/sync';

type AnswerErrors = Record<string, { observation?: string; photos?: string }>;
type EquipmentOperationalStatus = 'operativo' | 'stand_by' | 'inoperativo';

interface ChecklistAnswerJsonItem {
  pregunta_id: string;
  pregunta: string;
  orden: number;
  ponderado: number | string | null;
  status_ok: boolean | null;
  observacion: string | null;
  fotos: StoredPhotoRef[];
}

interface ChecklistAnswersJson {
  version: 1;
  respuestas: ChecklistAnswerJsonItem[];
  resumen: {
    total_preguntas: number;
    total_ok: number;
    total_observadas: number;
    total_fotos: number;
    puntaje_obtenido: number | null;
    ponderado_total: number;
    estado_operatividad: EquipmentOperationalStatus;
    comentario_operatividad: string | null;
  };
}

interface ChecklistResponseInsert {
  client_submission_id: string;
  user_created: string;
  equipamento_id: string;
  equipamento_nombre: string;
  equipo_id: string;
  equipo_codigo: string;
  equipo_ubicacion: string;
  building_name: string;
  frequency: string;
  period_start: string;
  period_end: string;
  respuestas_json: ChecklistAnswersJson;
  evidencia_general_fotos: StoredPhotoRef[];
  total_questions: number;
  total_ok: number;
  total_observed: number;
  total_photos: number;
  form_started_at: string;
  first_interaction_at: string | null;
  submitted_at: string;
  duration_seconds: number;
  interaction_count: number;
  checklist_schedule_id?: string | null;
}

function generateClientSubmissionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const value = Math.floor(Math.random() * 16);
    const output = char === 'x' ? value : (value & 0x3) | 0x8;
    return output.toString(16);
  });
}

function buildLocalPhotoRef(uri: string): StoredPhotoRef {
  return {
    bucket: 'local',
    path: uri,
    public_url: uri,
  };
}

interface ChecklistSchedulePreview {
  isLoading: boolean;
  hasSchedule: boolean;
  allowed: boolean;
  message: string;
  hint: string | null;
  frequency: string;
  currentCount: number;
  occurrencesPerDay: number | null;
  windowStart: string | null;
  windowEnd: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}

function getPeriodFromFrequency(frequencyRaw: string) {
  const frequency = frequencyRaw.toUpperCase();
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (frequency === 'DIARIA' || frequency === 'INTERDIARIA') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (frequency === 'SEMANAL') {
    const day = now.getDay();
    const offset = day === 0 ? 6 : day - 1;
    start.setDate(now.getDate() - offset);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  } else if (frequency === 'QUINCENAL') {
    start.setDate(now.getDate() <= 15 ? 1 : 16);
    start.setHours(0, 0, 0, 0);

    if (now.getDate() <= 15) {
      end.setDate(15);
      end.setHours(23, 59, 59, 999);
    } else {
      end.setMonth(start.getMonth() + 1, 1);
      end.setTime(end.getTime() - 1);
    }
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(start.getMonth() + 1);
    end.setTime(end.getTime() - 1);
  }

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const periodStart = formatLocalDate(start);
  const periodEnd = formatLocalDate(end);

  return { periodStart, periodEnd };
}

function formatDateToSpanish(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
}

function getLimaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

function buildFriendlyRestrictionMessage(
  reason: string,
  windowLabel: string,
  limitLabel: string,
) {
  const normalized = reason.toLowerCase();

  if (normalized.includes('aun no inicia')) {
    return {
      message: 'La programacion todavia no inicia para este checklist.',
      hint: 'Revisa la fecha de inicio en Programar checklist.',
    };
  }

  if (normalized.includes('ya vencio')) {
    return {
      message: 'La programacion actual ya vencio para este checklist.',
      hint: 'Actualiza la fecha de fin o crea una nueva programacion.',
    };
  }

  if (normalized.includes('rango horario')) {
    return {
      message: `Hoy si corresponde, pero solo se puede registrar entre ${windowLabel}.`,
      hint: 'Intenta nuevamente dentro del horario configurado.',
    };
  }

  if (normalized.includes('frecuencia')) {
    return {
      message:
        'Hoy no toca registrar este checklist segun la frecuencia programada.',
      hint: `Horario configurado: ${windowLabel}. Ese horario aplica solo en dias que si corresponden.`,
    };
  }

  if (normalized.includes('maximo')) {
    return {
      message: 'Ya se completo el limite del rango programado.',
      hint: 'Ajusta el rango de programacion si necesitas reiniciar el avance.',
    };
  }

  return {
    message: 'Este checklist esta restringido en este momento.',
    hint: windowLabel !== '-' ? `Horario configurado: ${windowLabel}.` : 'Por favor verifique la programación.',
  };
}

function buildChecklistAnswersJson(
  questions: PreguntaEquipamento[],
  answers: Record<string, ChecklistQuestionAnswer>,
  uploadedQuestionPhotos: Record<string, StoredPhotoRef[]>,
  operationalStatus: EquipmentOperationalStatus,
  operationalComment: string,
): ChecklistAnswersJson {
  const questionMap = new Map(questions.map(item => [item.id, item]));
  const trimmedOperationalComment = operationalComment.trim();

  const respuestas = Object.values(answers).map(answer => {
    const question = questionMap.get(answer.preguntaId);
    const isStandBy = operationalStatus === 'stand_by';
    const isInoperativo = operationalStatus === 'inoperativo';
    const statusOk = isStandBy
      ? null
      : isInoperativo
        ? false
        : answer.status === true;

    return {
      pregunta_id: answer.preguntaId,
      pregunta: question?.pregunta || '',
      orden: question?.orden || 0,
      ponderado: isStandBy ? null : (question?.ponderado ?? null),
      status_ok: statusOk,
      observacion: isInoperativo
        ? trimmedOperationalComment
          ? `Equipo inoperativo: ${trimmedOperationalComment}`
          : 'Equipo inoperativo'
        : isStandBy
          ? 'Equipo en stand by'
          : answer.status === false
            ? answer.observacion.trim()
            : null,
      fotos:
        operationalStatus === 'operativo' && answer.status === false
          ? (uploadedQuestionPhotos[answer.preguntaId] ?? [])
          : [],
    };
  });

  const scorableResponses =
    operationalStatus === 'stand_by' ? [] : respuestas;
  const totalObservadas = scorableResponses.filter(
    item => item.status_ok === false,
  ).length;
  const totalOk = scorableResponses.filter(
    item => item.status_ok === true,
  ).length;
  const totalFotos = respuestas.reduce(
    (acc, item) => acc + item.fotos.length,
    0,
  );
  const ponderadoTotal = scorableResponses.reduce(
    (acc, item) => acc + parseQuestionWeight(item.ponderado),
    0,
  );
  const puntajeObtenido =
    operationalStatus === 'stand_by'
      ? null
      : scorableResponses.reduce(
          (acc, item) =>
            acc + (item.status_ok ? parseQuestionWeight(item.ponderado) : 0),
          0,
        );

  return {
    version: 1,
    respuestas,
    resumen: {
      total_preguntas: scorableResponses.length,
      total_ok: totalOk,
      total_observadas: totalObservadas,
      total_fotos: totalFotos,
      puntaje_obtenido: puntajeObtenido,
      ponderado_total: ponderadoTotal,
      estado_operatividad: operationalStatus,
      comentario_operatividad: trimmedOperationalComment || null,
    },
  };
}

function parseQuestionWeight(
  value: number | string | null | undefined,
): number {
  if (value === null || value === undefined || value === '') return 0;

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface ChecklistQuestionRowProps {
  question: PreguntaEquipamento;
  index: number;
  answer: ChecklistQuestionAnswer;
  error?: { observation?: string; photos?: string };
  disabled: boolean;
  onStatusChange: (questionId: string, status: boolean) => void;
  onObservationChange: (questionId: string, text: string) => void;
  onAddPhoto: (questionId: string) => void;
  onRemovePhoto: (questionId: string, index: number) => void;
}

const ChecklistQuestionRow = memo(function ChecklistQuestionRow({
  question,
  index,
  answer,
  error,
  disabled,
  onStatusChange,
  onObservationChange,
  onAddPhoto,
  onRemovePhoto,
}: ChecklistQuestionRowProps) {
  const handleStatus = useCallback(
    (status: boolean) => {
      onStatusChange(question.id, status);
    },
    [onStatusChange, question.id],
  );

  const handleObservation = useCallback(
    (text: string) => {
      onObservationChange(question.id, text);
    },
    [onObservationChange, question.id],
  );

  const handleAddPhoto = useCallback(() => {
    onAddPhoto(question.id);
  }, [onAddPhoto, question.id]);

  const handleRemovePhoto = useCallback(
    (indexToRemove: number) => {
      onRemovePhoto(question.id, indexToRemove);
    },
    [onRemovePhoto, question.id],
  );

  return (
    <QuestionChecklistItem
      order={index + 1}
      question={question.pregunta}
      value={{
        status: answer.status,
        observation: answer.observacion,
        photoUris: answer.photoUris,
      }}
      onChangeStatus={handleStatus}
      onChangeObservation={handleObservation}
      onAddPhoto={handleAddPhoto}
      onRemovePhoto={handleRemovePhoto}
      errors={error}
      disabled={disabled}
    />
  );
});

export default function ChecklistFormScreen() {
  const router = useRouter();
  const { canScheduleMaintenance } = useUserRole();
  const params = useLocalSearchParams<{
    buildingId: string;
    buildingName: string;
    equipamentoId: string;
    equipamentoNombre: string;
    frecuencia: string;
    equipoId: string;
    equipoCodigo: string;
    equipoUbicacion: string;
    equipoDetalleUbicacion?: string;
  }>();

  const [questions, setQuestions] = useState<PreguntaEquipamento[]>([]);
  const [answers, setAnswers] = useState<
    Record<string, ChecklistQuestionAnswer>
  >({});
  const [operationalStatus, setOperationalStatus] =
    useState<EquipmentOperationalStatus>('operativo');
  const [operationalComment, setOperationalComment] = useState('');
  const [errors, setErrors] = useState<AnswerErrors>({});
  const [generalPhotoUris, setGeneralPhotoUris] = useState<string[]>([]);
  const [generalPhotoError, setGeneralPhotoError] = useState('');
  const [alertState, setAlertState] = useState({
    visible: false,
    title: '',
    message: '',
  });
  const [isCameraSheetVisible, setIsCameraSheetVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [schedulePreview, setSchedulePreview] =
    useState<ChecklistSchedulePreview>({
      isLoading: false,
      hasSchedule: false,
      allowed: true,
      message: 'No hay programacion activa para este checklist.',
      hint: null,
      frequency: '',
      currentCount: 0,
      occurrencesPerDay: null,
      windowStart: null,
      windowEnd: null,
      periodStart: null,
      periodEnd: null,
    });
  const startedAtMsRef = useRef<number>(Date.now());
  const firstInteractionAtMsRef = useRef<number | null>(null);
  const interactionCountRef = useRef<number>(0);
  const onPhotoSelectedRef = useRef<((uri: string) => void) | null>(null);
  const alertActionRef = useRef<(() => void) | null>(null);

  const frecuencia = (params.frecuencia || 'MENSUAL').toUpperCase();
  const { periodStart, periodEnd } = useMemo(
    () => getPeriodFromFrequency(frecuencia),
    [frecuencia],
  );
  const periodStartLabel = useMemo(
    () => formatDateToSpanish(periodStart),
    [periodStart],
  );
  const periodEndLabel = useMemo(
    () => formatDateToSpanish(periodEnd),
    [periodEnd],
  );
  const isNormalChecklistFlow = operationalStatus === 'operativo';
  const visibleQuestions = isNormalChecklistFlow ? questions : [];

  const showAppAlert = useCallback(
    (title: string, message: string, onClose?: () => void) => {
      alertActionRef.current = onClose || null;
      setAlertState({
        visible: true,
        title,
        message,
      });
    },
    [],
  );

  const closeAppAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
    const action = alertActionRef.current;
    alertActionRef.current = null;
    if (action) {
      action();
    }
  }, []);

  useEffect(() => {
    const loadQuestions = async () => {
      if (!params.equipamentoId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // 1) Prefer local mirror (offline-first)
        let rows = (await DatabaseService.getChecklistQuestionsByEquipamento(
          params.equipamentoId,
        )) as PreguntaEquipamento[];

        // 2) Fallback to direct Supabase if local still empty
        if (rows.length === 0) {
          const { data, error } = await supabase
            .from('preguntas_equipamento')
            .select('*')
            .eq('equipamento_id', params.equipamentoId)
            .eq('activa', true)
            .order('orden', { ascending: true });

          if (error) {
            throw error;
          }

          rows = (data || []) as PreguntaEquipamento[];
        }

        setQuestions(rows);

        const nextAnswers: Record<string, ChecklistQuestionAnswer> = {};
        rows.forEach(row => {
          nextAnswers[row.id] = {
            preguntaId: row.id,
            status: true,
            observacion: '',
            photoUris: [],
          };
        });
        setAnswers(nextAnswers);
      } catch (error) {
        console.error('Error loading checklist questions:', error);
        showAppAlert(
          'Error',
          'No se pudieron cargar las preguntas del checklist.',
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, [params.equipamentoId, showAppAlert]);

  useEffect(() => {
    let isMounted = true;

    const loadSchedulePreview = async () => {
      if (!params.buildingId || !params.equipamentoId) {
        return;
      }

      setSchedulePreview(prev => ({ ...prev, isLoading: true }));

      try {
        const calendarValidation =
          await DatabaseService.validateLocalChecklistWorkingDay(
            getLimaDateString(),
          );

        if (!isMounted) {
          return;
        }

        if (!calendarValidation.allowed) {
          setSchedulePreview({
            isLoading: false,
            hasSchedule: true,
            allowed: false,
            message:
              calendarValidation.reason ||
              'Hoy es un dia no laborable segun el calendario de checklist.',
            hint: 'La regla se valido con el calendario global guardado en el dispositivo.',
            frequency: '',
            currentCount: 0,
            occurrencesPerDay: null,
            windowStart: null,
            windowEnd: null,
            periodStart: null,
            periodEnd: null,
          });
          return;
        }

        const result =
          await supabaseChecklistScheduleService.validateChecklistSubmission(
            params.buildingId,
            params.equipamentoId,
            params.equipoId,
          );

        if (!isMounted) {
          return;
        }

        if (!result.has_schedule) {
          setSchedulePreview({
            isLoading: false,
            hasSchedule: false,
            allowed: true,
            message: 'No hay programacion activa para este checklist.',
            hint: null,
            frequency: '',
            currentCount: 0,
            occurrencesPerDay: null,
            windowStart: null,
            windowEnd: null,
            periodStart: null,
            periodEnd: null,
          });
          return;
        }

        const windowLabel =
          result.window_start && result.window_end
            ? `${result.window_start.slice(0, 5)} - ${result.window_end.slice(0, 5)}`
            : '-';
        const limitLabel =
          typeof result.occurrences_per_day === 'number'
            ? `${result.current_count}/${result.occurrences_per_day}`
            : '-';
        const restrictionCopy = buildFriendlyRestrictionMessage(
          result.reason || 'Fuera de programacion.',
          windowLabel,
          limitLabel,
        );

        setSchedulePreview({
          isLoading: false,
          hasSchedule: true,
          allowed: result.allowed,
          message: result.allowed
            ? result.window_start && result.window_end
              ? `Dentro de programacion. Horario ${windowLabel}.`
              : 'Dentro de programacion.'
            : restrictionCopy.message,
          hint: result.allowed ? null : restrictionCopy.hint,
          frequency: result.frequency || '',
          currentCount: result.current_count,
          occurrencesPerDay: result.occurrences_per_day,
          windowStart: result.window_start,
          windowEnd: result.window_end,
          periodStart: result.period_start,
          periodEnd: result.period_end,
        });
      } catch (error) {
        console.error('Error checking checklist schedule preview:', error);
        if (!isMounted) {
          return;
        }
        setSchedulePreview({
          isLoading: false,
          hasSchedule: false,
          allowed: true,
          message:
            'No se pudo validar la programacion remota. Se usara la validacion local disponible.',
          hint: 'El calendario global local permite llenar hoy; la sincronizacion confirmara el registro cuando vuelva la conexion.',
          frequency: '',
          currentCount: 0,
          occurrencesPerDay: null,
          windowStart: null,
          windowEnd: null,
          periodStart: null,
          periodEnd: null,
        });
      }
    };

    loadSchedulePreview();

    return () => {
      isMounted = false;
    };
  }, [params.buildingId, params.equipoId, params.equipamentoId]);

  const updateAnswer = useCallback(
    (
      questionId: string,
      updater: (prev: ChecklistQuestionAnswer) => ChecklistQuestionAnswer,
    ) => {
      setAnswers(prev => ({
        ...prev,
        [questionId]: updater(prev[questionId]),
      }));
    },
    [],
  );

  const registerInteraction = useCallback(() => {
    interactionCountRef.current += 1;
    if (firstInteractionAtMsRef.current === null) {
      firstInteractionAtMsRef.current = Date.now();
    }
  }, []);

  const openCameraSheet = useCallback(
    (onUriSelected: (uri: string) => void) => {
      onPhotoSelectedRef.current = onUriSelected;
      setIsCameraSheetVisible(true);
    },
    [],
  );

  const handleTakePhoto = useCallback(async () => {
    setIsCameraSheetVisible(false);

    const hasCameraPermission = await ensureImagePermission('camera', {
      deniedMessage: 'Debe habilitar acceso a la camara para tomar fotos.',
    });
    if (!hasCameraPermission) {
      onPhotoSelectedRef.current = null;
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.5,
    });

    if (!result.canceled && result.assets.length > 0) {
      const rawUri = result.assets[0].uri;
      const photoUri = await persistLocalPhoto(rawUri);
      await saveToGallery(photoUri);
      onPhotoSelectedRef.current?.(photoUri);
    }

    onPhotoSelectedRef.current = null;
  }, []);

  const handleCloseCameraSheet = useCallback(() => {
    setIsCameraSheetVisible(false);
    onPhotoSelectedRef.current = null;
  }, []);

  const handleStatusChange = useCallback(
    (questionId: string, status: boolean) => {
      registerInteraction();
      updateAnswer(questionId, prev => ({
        ...prev,
        status,
      }));
      setErrors(prev => ({ ...prev, [questionId]: {} }));
    },
    [registerInteraction, updateAnswer],
  );

  const handleOperationalStatusChange = useCallback(
    (nextStatus: EquipmentOperationalStatus) => {
      registerInteraction();
      setOperationalStatus(nextStatus);
      setErrors({});
      setGeneralPhotoError('');
    },
    [registerInteraction],
  );

  const handleObservationChange = useCallback(
    (questionId: string, text: string) => {
      registerInteraction();
      updateAnswer(questionId, prev => ({ ...prev, observacion: text }));
    },
    [registerInteraction, updateAnswer],
  );

  const handleOperationalCommentChange = useCallback(
    (text: string) => {
      registerInteraction();
      setOperationalComment(text);
    },
    [registerInteraction],
  );

  const handleAddQuestionPhoto = useCallback(
    (questionId: string) => {
      openCameraSheet(uri => {
        registerInteraction();
        updateAnswer(questionId, prev => ({
          ...prev,
          photoUris: [...prev.photoUris, uri],
        }));
      });
    },
    [openCameraSheet, registerInteraction, updateAnswer],
  );

  const handleRemovePhoto = useCallback(
    (questionId: string, index: number) => {
      registerInteraction();
      updateAnswer(questionId, prev => ({
        ...prev,
        photoUris: prev.photoUris.filter((_, i) => i !== index),
      }));
    },
    [registerInteraction, updateAnswer],
  );

  const handleAddGeneralPhoto = useCallback(() => {
    openCameraSheet(uri => {
      registerInteraction();
      setGeneralPhotoUris(prev => [...prev, uri]);
      setGeneralPhotoError('');
    });
  }, [openCameraSheet, registerInteraction]);

  const handleRemoveGeneralPhoto = useCallback(
    (index: number) => {
      registerInteraction();
      setGeneralPhotoUris(prev => prev.filter((_, i) => i !== index));
    },
    [registerInteraction],
  );

  const validate = useCallback(() => {
    const nextErrors: AnswerErrors = {};
    let hasErrors = false;

    questions.forEach(question => {
      const answer = answers[question.id];
      if (!answer) return;

      if (operationalStatus === 'operativo' && answer.status === false) {
        const itemError: { observation?: string; photos?: string } = {};

        if (!answer.observacion.trim()) {
          itemError.observation = 'Ingrese una observacion.';
        }

        if (answer.photoUris.length === 0) {
          itemError.photos = 'Agregue al menos una foto.';
        }

        if (itemError.observation || itemError.photos) {
          hasErrors = true;
          nextErrors[question.id] = itemError;
        }
      }
    });

    if (generalPhotoUris.length === 0) {
      hasErrors = true;
      setGeneralPhotoError(
        operationalStatus === 'operativo'
          ? 'Agregue una foto general del checklist.'
          : 'Agregue una foto del equipo.',
      );
    } else {
      setGeneralPhotoError('');
    }

    setErrors(nextErrors);
    return !hasErrors;
  }, [answers, generalPhotoUris.length, operationalStatus, questions]);

  const checkAlreadySubmitted = useCallback(async () => {
    const { data, error } = await supabase
      .from('checklist_response')
      .select('id')
      .eq('equipo_id', params.equipoId)
      .eq('frequency', frecuencia)
      .eq('period_start', periodStart)
      .limit(1);

    if (error) {
      throw error;
    }

    return (data || []).length > 0;
  }, [frecuencia, params.equipoId, periodStart]);

  const handleSave = useCallback(async () => {
    if (schedulePreview.isLoading) {
      showAppAlert(
        'Validando programacion',
        'Todavia estamos validando la programacion. Intente nuevamente en unos segundos.',
      );
      return;
    }

    if (questions.length === 0) {
      showAppAlert(
        'Checklist sin preguntas',
        'No se puede guardar este checklist porque no tiene preguntas activas.',
      );
      return;
    }

    if (schedulePreview.hasSchedule && !schedulePreview.allowed) {
      showAppAlert(
        'Checklist fuera de programacion',
        `${schedulePreview.message}${schedulePreview.hint ? `\n${schedulePreview.hint}` : ''}`,
      );
      return;
    }

    if (!validate()) {
      showAppAlert(
        'Faltan datos',
        operationalStatus === 'operativo'
          ? 'Complete observacion y foto donde aplique.'
          : 'Agregue la foto del equipo.',
      );
      return;
    }

    setIsSaving(true);
    try {
      const { data } = await supabase.auth.getUser().catch(() => ({
        data: { user: null },
      }));
      const localSession = data.user
        ? null
        : await DatabaseService.getSession();
      const userId = data.user?.id || localSession?.user_id;

      if (!userId) {
        showAppAlert('Error', 'No se pudo obtener el usuario actual.');
        return;
      }

      let checklistScheduleId: string | null = null;
      let effectiveFrequency = frecuencia;
      let effectivePeriodStart: string | null = null;
      let effectivePeriodEnd: string | null = null;
      let effectiveOccurrencesLimit: number | null = null;

      const calendarValidation =
        await DatabaseService.validateLocalChecklistWorkingDay(
          getLimaDateString(),
        );

      if (!calendarValidation.allowed) {
        showAppAlert(
          'Checklist fuera de programacion',
          calendarValidation.reason ||
            'Hoy es un dia no laborable segun el calendario de checklist.',
        );
        return;
      }

      try {
        const scheduleValidation =
          await supabaseChecklistScheduleService.validateChecklistSubmission(
            params.buildingId,
            params.equipamentoId,
            params.equipoId,
          );

        if (scheduleValidation.has_schedule) {
          checklistScheduleId = scheduleValidation.schedule_id;
          effectiveFrequency = scheduleValidation.frequency || frecuencia;
          effectivePeriodStart = scheduleValidation.period_start;
          effectivePeriodEnd = scheduleValidation.period_end;
          effectiveOccurrencesLimit = scheduleValidation.occurrences_per_day;

          if (!scheduleValidation.allowed) {
            const timeWindow =
              scheduleValidation.window_start && scheduleValidation.window_end
                ? `${scheduleValidation.window_start.slice(0, 5)} - ${scheduleValidation.window_end.slice(0, 5)}`
                : '-';
            const rangeLabel =
              scheduleValidation.period_start && scheduleValidation.period_end
                ? scheduleValidation.period_start === scheduleValidation.period_end
                  ? `${formatDateToSpanish(scheduleValidation.period_start)}`
                  : `${formatDateToSpanish(scheduleValidation.period_start)} a ${formatDateToSpanish(scheduleValidation.period_end)}`
                : '-';

            showAppAlert(
              'Checklist fuera de programación',
              `${scheduleValidation.reason || 'No está permitido registrar el checklist en este momento.'}\nRango: ${rangeLabel}\nHorario: ${timeWindow}`,
            );
            return;
          }
        } else {
          const alreadyExists = await checkAlreadySubmitted();
          if (alreadyExists) {
            const periodStr = periodStart === periodEnd
              ? `para la fecha ${periodStartLabel}`
              : `para el periodo ${periodStartLabel} a ${periodEndLabel}`;
            showAppAlert(
              'Checklist ya registrado',
              `Este equipo ya tiene checklist ${frecuencia.toLowerCase()} ${periodStr}.`,
            );
            return;
          }
        }
      } catch (scheduleValidationError) {
        console.warn(
          'Schedule validation unavailable, using local checklist validation:',
          scheduleValidationError,
        );
      }

      const fallbackPeriod = getPeriodFromFrequency(effectiveFrequency);
      const schedulePeriod = {
        periodStart: effectivePeriodStart || fallbackPeriod.periodStart,
        periodEnd: effectivePeriodEnd || fallbackPeriod.periodEnd,
      };
      const localCounts = await DatabaseService.getChecklistCountsByEquipo(
        params.buildingId,
        params.equipamentoId,
        effectiveFrequency,
        schedulePeriod.periodStart,
      );
      const existingLocalCount = localCounts
        .filter(item => item.equipo_id === params.equipoId)
        .reduce(
          (acc, item) =>
            acc +
            Number(item.synced_count || 0) +
            Number(item.pending_count || 0) +
            Number(item.conflict_count || 0),
          0,
        );

      if (
        checklistScheduleId &&
        effectiveOccurrencesLimit !== null &&
        existingLocalCount >= effectiveOccurrencesLimit
      ) {
        const periodStr = schedulePeriod.periodStart === schedulePeriod.periodEnd
          ? `para la fecha ${formatDateToSpanish(schedulePeriod.periodStart)}`
          : `para el rango ${formatDateToSpanish(schedulePeriod.periodStart)} a ${formatDateToSpanish(schedulePeriod.periodEnd)}`;
        showAppAlert(
          'Checklist ya registrado',
          `Este equipo ya alcanzo el limite local ${periodStr}.`,
        );
        return;
      }

      if (!checklistScheduleId && existingLocalCount > 0) {
        const periodStr = schedulePeriod.periodStart === schedulePeriod.periodEnd
          ? `para la fecha ${formatDateToSpanish(schedulePeriod.periodStart)}`
          : `para el periodo ${formatDateToSpanish(schedulePeriod.periodStart)} a ${formatDateToSpanish(schedulePeriod.periodEnd)}`;
        showAppAlert(
          'Checklist ya registrado',
          `Este equipo ya tiene checklist ${effectiveFrequency.toLowerCase()} local ${periodStr}.`,
        );
        return;
      }

      const uploadedGeneralPhotos = generalPhotoUris.map(buildLocalPhotoRef);
      const uploadedQuestionPhotos: Record<string, StoredPhotoRef[]> = {};
      const offlinePhotos: {
        kind: 'general' | 'question';
        questionId?: string;
        localUri: string;
      }[] = generalPhotoUris.map(uri => ({
        kind: 'general' as const,
        localUri: uri,
      }));

      Object.values(answers).forEach(answer => {
        if (
          operationalStatus !== 'operativo' ||
          answer.status !== false ||
          answer.photoUris.length === 0
        ) {
          return;
        }

        uploadedQuestionPhotos[answer.preguntaId] =
          answer.photoUris.map(buildLocalPhotoRef);
        answer.photoUris.forEach(uri => {
          offlinePhotos.push({
            kind: 'question',
            questionId: answer.preguntaId,
            localUri: uri,
          });
        });
      });

      const respuestasJson = buildChecklistAnswersJson(
        questions,
        answers,
        uploadedQuestionPhotos,
        operationalStatus,
        operationalComment,
      );
      const hasObservation = respuestasJson.resumen.total_observadas > 0;
      const submittedAtMs = Date.now();
      const formStartedAt = new Date(startedAtMsRef.current).toISOString();
      const firstInteractionAt = firstInteractionAtMsRef.current
        ? new Date(firstInteractionAtMsRef.current).toISOString()
        : null;
      const submittedAt = new Date(submittedAtMs).toISOString();
      const durationSeconds = Math.max(
        1,
        Math.round((submittedAtMs - startedAtMsRef.current) / 1000),
      );
      const clientSubmissionId = generateClientSubmissionId();

      const payload: ChecklistResponseInsert = {
        client_submission_id: clientSubmissionId,
        user_created: userId,
        equipamento_id: params.equipamentoId,
        equipamento_nombre: params.equipamentoNombre,
        equipo_id: params.equipoId,
        equipo_codigo: params.equipoCodigo,
        equipo_ubicacion: [
          params.equipoUbicacion,
          params.equipoDetalleUbicacion,
        ]
          .filter(Boolean)
          .join(' - '),
        building_name: params.buildingName,
        frequency: effectiveFrequency,
        period_start: schedulePeriod.periodStart,
        period_end: schedulePeriod.periodEnd,
        respuestas_json: respuestasJson,
        evidencia_general_fotos: uploadedGeneralPhotos,
        total_questions: respuestasJson.resumen.total_preguntas,
        total_ok: respuestasJson.resumen.total_ok,
        total_observed: respuestasJson.resumen.total_observadas,
        total_photos:
          respuestasJson.resumen.total_fotos + uploadedGeneralPhotos.length,
        form_started_at: formStartedAt,
        first_interaction_at: firstInteractionAt,
        submitted_at: submittedAt,
        duration_seconds: durationSeconds,
        interaction_count: interactionCountRef.current,
        checklist_schedule_id: checklistScheduleId,
      };

      await DatabaseService.saveOfflineChecklistResponse({
        clientSubmissionId,
        buildingId: params.buildingId,
        equipamentoId: params.equipamentoId,
        equipoId: params.equipoId,
        frequency: effectiveFrequency,
        periodStart: schedulePeriod.periodStart,
        periodEnd: schedulePeriod.periodEnd,
        userCreated: userId,
        payload,
        photos: offlinePhotos,
      });

      void syncService.triggerSync('checklist-save-local', { pushOnly: true });

      showAppAlert(
        'Checklist guardado localmente',
        hasObservation
          ? 'Se guardo con observaciones y se sincronizara automaticamente.'
          : 'Se guardo correctamente y se sincronizara automaticamente.',
        () => router.back(),
      );
    } catch (error) {
      console.error('Error saving checklist response:', error);
      showAppAlert('Error', 'No se pudo guardar el checklist.');
    } finally {
      setIsSaving(false);
    }
  }, [
    answers,
    checkAlreadySubmitted,
    frecuencia,
    generalPhotoUris,
    operationalStatus,
    operationalComment,
    params.buildingName,
    params.buildingId,
    params.equipoCodigo,
    params.equipoDetalleUbicacion,
    params.equipoId,
    params.equipoUbicacion,
    params.equipamentoId,
    params.equipamentoNombre,
    periodEnd,
    periodEndLabel,
    periodStart,
    periodStartLabel,
    questions,
    router,
    schedulePreview.allowed,
    schedulePreview.hasSchedule,
    schedulePreview.hint,
    schedulePreview.isLoading,
    schedulePreview.message,
    showAppAlert,
    validate,
  ]);

  const renderGeneralPhoto = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <View style={styles.photoWrap}>
        <Image
          source={{ uri: item }}
          style={styles.photo}
          contentFit="cover"
          transition={100}
        />
        <Pressable
          onPress={() => handleRemoveGeneralPhoto(index)}
          style={({ pressed }) => [
            styles.removePhotoBtn,
            pressed && styles.pressed,
          ]}
          disabled={isSaving}
          accessibilityRole="button">
          <Ionicons name="close-circle" size={20} color="#EF4444" />
        </Pressable>
      </View>
    ),
    [handleRemoveGeneralPhoto, isSaving],
  );

  const renderQuestionItem = useCallback(
    ({ item, index }: { item: PreguntaEquipamento; index: number }) => {
      const answer = answers[item.id];
      if (!answer) {
        return null;
      }

      return (
        <ChecklistQuestionRow
          question={item}
          index={index}
          answer={answer}
          error={errors[item.id]}
          disabled={isSaving}
          onStatusChange={handleStatusChange}
          onObservationChange={handleObservationChange}
          onAddPhoto={handleAddQuestionPhoto}
          onRemovePhoto={handleRemovePhoto}
        />
      );
    },
    [
      answers,
      errors,
      isSaving,
      handleStatusChange,
      handleObservationChange,
      handleAddQuestionPhoto,
      handleRemovePhoto,
    ],
  );

  const handleOpenSchedule = useCallback(() => {
    router.push({
      pathname: '/checklist/schedule',
      params: {
        buildingId: params.buildingId,
        buildingName: params.buildingName,
        equipamentoId: params.equipamentoId,
        equipamentoNombre: params.equipamentoNombre,
      },
    });
  }, [
    params.buildingId,
    params.buildingName,
    params.equipamentoId,
    params.equipamentoNombre,
    router,
  ]);

  const saveBlockedReason = useMemo(() => {
    if (schedulePreview.isLoading) {
      return 'Se esta validando la programacion. Intente en unos segundos.';
    }

    if (questions.length === 0) {
      return 'No se puede guardar porque este checklist no tiene preguntas activas.';
    }

    if (schedulePreview.hasSchedule && !schedulePreview.allowed) {
      return (
        schedulePreview.message ||
        'No se puede guardar porque la programacion actual lo restringe.'
      );
    }

    return null;
  }, [
    questions.length,
    schedulePreview.allowed,
    schedulePreview.hasSchedule,
    schedulePreview.isLoading,
    schedulePreview.message,
  ]);

  const listHeader = useMemo(
    () => (
      <>
        <View style={styles.operationalStatusCard}>
          <Text style={styles.generalPhotoTitle}>Estado del equipo</Text>
          <Text style={styles.generalPhotoSubtitle}>
            Seleccione la condicion antes de completar el checklist.
          </Text>

          <View style={styles.operationalStatusOptions}>
            {([
              ['operativo', 'Operativo'],
              ['stand_by', 'Stand by'],
              ['inoperativo', 'Inoperativo'],
            ] as const).map(([value, label]) => {
              const isSelected = operationalStatus === value;

              return (
                <Pressable
                  key={value}
                  onPress={() => handleOperationalStatusChange(value)}
                  style={({ pressed }) => [
                    styles.operationalStatusOption,
                    isSelected && styles.operationalStatusOptionActive,
                    pressed && styles.pressed,
                  ]}
                  disabled={isSaving}
                  accessibilityRole="button">
                  <Text
                    style={[
                      styles.operationalStatusOptionText,
                      isSelected && styles.operationalStatusOptionTextActive,
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {operationalStatus === 'inoperativo' ? (
            <View style={styles.operationalCommentWrap}>
              <Text style={styles.generalPhotoTitle}>
                Comentario de inoperatividad (opcional)
              </Text>
              <Text style={styles.generalPhotoSubtitle}>
                Agregue un detalle adicional aparte de la foto del equipo.
              </Text>
              <TextInput
                value={operationalComment}
                onChangeText={handleOperationalCommentChange}
                placeholder="Escriba el motivo o detalle observado"
                placeholderTextColor="#94A3B8"
                style={styles.operationalCommentInput}
                multiline
                editable={!isSaving}
                textAlignVertical="top"
              />
            </View>
          ) : null}
        </View>

        <View style={styles.generalPhotoCard}>
          <Text style={styles.generalPhotoTitle}>
            {operationalStatus === 'operativo'
              ? 'Foto general (obligatoria)'
              : 'Foto del equipo (obligatoria)'}
          </Text>
          <Text style={styles.generalPhotoSubtitle}>
            {operationalStatus === 'operativo'
              ? 'Sirve como evidencia global del estado del equipo.'
              : 'Sirve como evidencia del estado seleccionado.'}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosRow}>
            {generalPhotoUris.map((uri, index) => (
              <View key={`${uri}_${index}`}>
                {renderGeneralPhoto({ item: uri, index })}
              </View>
            ))}

            <Pressable
              onPress={handleAddGeneralPhoto}
              style={({ pressed }) => [
                styles.addPhotoBtn,
                pressed && styles.pressed,
              ]}
              disabled={isSaving}
              accessibilityRole="button">
              <Ionicons name="camera-outline" size={22} color="#475569" />
              <Text style={styles.addPhotoText}>Agregar foto</Text>
            </Pressable>
          </ScrollView>

          {generalPhotoError ? (
            <Text style={styles.errorText}>{generalPhotoError}</Text>
          ) : null}
        </View>
      </>
    ),
    [
      generalPhotoError,
      generalPhotoUris,
      handleAddGeneralPhoto,
      handleOperationalCommentChange,
      handleOperationalStatusChange,
      isSaving,
      operationalComment,
      operationalStatus,
      renderGeneralPhoto,
    ],
  );

  if (isLoading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#0891B2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button">
          <Text style={styles.backBtnText}>Volver</Text>
        </Pressable>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>{params.equipoCodigo || 'Checklist'}</Text>
        </View>
        <Text style={styles.subtitle}>
          {params.equipamentoNombre || '-'} - {frecuencia} ({periodStartLabel})
        </Text>
      </View>

      <View
        style={[
          styles.scheduleCard,
          schedulePreview.hasSchedule
            ? schedulePreview.allowed
              ? styles.scheduleCardAllowed
              : styles.scheduleCardBlocked
            : styles.scheduleCardNoSchedule,
        ]}>
        <Text style={styles.scheduleTitle}>
          {schedulePreview.hasSchedule
            ? schedulePreview.allowed
              ? 'Programacion activa'
              : 'Programacion restringida'
            : 'Sin programacion'}
        </Text>
        <Text style={styles.scheduleText}>
          {schedulePreview.isLoading
            ? 'Validando programacion...'
            : schedulePreview.message}
        </Text>
        {!schedulePreview.allowed && schedulePreview.hint ? (
          <Text style={styles.scheduleHint}>{schedulePreview.hint}</Text>
        ) : null}
        {!schedulePreview.allowed || !schedulePreview.hasSchedule ? (
          <Pressable
            onPress={handleOpenSchedule}
            style={({ pressed }) => [
              styles.scheduleActionBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button">
            <Text style={styles.scheduleActionText}>
              {canScheduleMaintenance
                ? schedulePreview.hasSchedule
                  ? 'Ajustar programacion'
                  : 'Crear programacion'
                : 'Ver programacion'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={visibleQuestions}
        keyExtractor={item => item.id}
        renderItem={renderQuestionItem}
        contentContainerStyle={styles.content}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          operationalStatus === 'operativo' ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No hay preguntas activas para este tipo de equipo.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={styles.listFooterSpace} />}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.saveBtn,
            (isSaving || saveBlockedReason !== null) && styles.saveBtnDisabled,
          ]}
          disabled={isSaving || saveBlockedReason !== null}
          onPress={handleSave}
          accessibilityRole="button">
          <Text style={styles.saveBtnText}>
            {isSaving ? 'Guardando...' : 'Guardar checklist'}
          </Text>
        </Pressable>
        {saveBlockedReason ? (
          <Text style={styles.saveBlockedText}>{saveBlockedReason}</Text>
        ) : null}
      </View>

      <CameraSourceSheet
        visible={isCameraSheetVisible}
        onTakePhoto={() => {
          void handleTakePhoto();
        }}
        onClose={handleCloseCameraSheet}
      />

      <AppAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        onClose={closeAppAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  backBtnText: {
    color: '#0369A1',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 12,
    color: '#64748B',
  },
  scheduleCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  scheduleCardAllowed: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  scheduleCardBlocked: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  scheduleCardNoSchedule: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  scheduleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  scheduleText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  scheduleHint: {
    marginTop: 4,
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  scheduleActionBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scheduleActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  listFooterSpace: {
    height: 8,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
  },
  emptyStateText: {
    color: '#64748B',
    fontSize: 14,
  },
  generalPhotoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
  },
  operationalStatusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 14,
    marginBottom: 12,
  },
  operationalStatusOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  operationalStatusOption: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  operationalStatusOptionActive: {
    borderColor: '#0891B2',
    backgroundColor: '#ECFEFF',
  },
  operationalStatusOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  operationalStatusOptionTextActive: {
    color: '#0E7490',
  },
  operationalStatusHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  operationalCommentWrap: {
    marginTop: 12,
  },
  operationalCommentInput: {
    minHeight: 86,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  generalPhotoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  generalPhotoSubtitle: {
    marginTop: 2,
    marginBottom: 10,
    fontSize: 12,
    color: '#64748B',
  },
  photosRow: {
    alignItems: 'center',
    gap: 10,
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  addPhotoBtn: {
    width: 92,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveBtn: {
    backgroundColor: '#0891B2',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  saveBlockedText: {
    marginTop: 8,
    fontSize: 12,
    color: '#B91C1C',
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.82,
  },
});
