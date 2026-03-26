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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { AppAlertModal } from '@/components/app-alert-modal';
import { CameraSourceSheet } from '@/components/maintenance/camera-source-sheet';
import { QuestionChecklistItem } from '@/components/maintenance/checklist/question-checklist-item';
import type {
  ChecklistQuestionAnswer,
  PreguntaEquipamento,
} from '@/types/checklist';
import { supabase } from '@/lib/supabase';
import {
  checklistStorageService,
  type StoredPhotoRef,
} from '@/services/checklist-storage.service';
import { DatabaseService } from '@/services/database';

type AnswerErrors = Record<string, { observation?: string; photos?: string }>;

interface ChecklistAnswerJsonItem {
  pregunta_id: string;
  pregunta: string;
  orden: number;
  status_ok: boolean;
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
  };
}

interface ChecklistResponseInsert {
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
}

function getPeriodFromFrequency(frequencyRaw: string) {
  const frequency = frequencyRaw.toUpperCase();
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (frequency === 'DIARIA') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (frequency === 'SEMANAL') {
    const day = now.getDay();
    const offset = day === 0 ? 6 : day - 1;
    start.setDate(now.getDate() - offset);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(start.getMonth() + 1);
    end.setTime(end.getTime() - 1);
  }

  const periodStart = start.toISOString().slice(0, 10);
  const periodEnd = end.toISOString().slice(0, 10);

  return { periodStart, periodEnd };
}

function buildChecklistAnswersJson(
  questions: PreguntaEquipamento[],
  answers: Record<string, ChecklistQuestionAnswer>,
  uploadedQuestionPhotos: Record<string, StoredPhotoRef[]>,
): ChecklistAnswersJson {
  const questionMap = new Map(questions.map(item => [item.id, item]));

  const respuestas = Object.values(answers).map(answer => ({
    pregunta_id: answer.preguntaId,
    pregunta: questionMap.get(answer.preguntaId)?.pregunta || '',
    orden: questionMap.get(answer.preguntaId)?.orden || 0,
    status_ok: answer.status === true,
    observacion: answer.status === false ? answer.observacion.trim() : null,
    fotos:
      answer.status === false
        ? (uploadedQuestionPhotos[answer.preguntaId] ?? [])
        : [],
  }));

  const totalObservadas = respuestas.filter(item => !item.status_ok).length;
  const totalOk = respuestas.length - totalObservadas;
  const totalFotos = respuestas.reduce(
    (acc, item) => acc + item.fotos.length,
    0,
  );

  return {
    version: 1,
    respuestas,
    resumen: {
      total_preguntas: respuestas.length,
      total_ok: totalOk,
      total_observadas: totalObservadas,
      total_fotos: totalFotos,
    },
  };
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
  const params = useLocalSearchParams<{
    buildingName: string;
    equipamentoId: string;
    equipamentoNombre: string;
    frecuencia: string;
    equipoId: string;
    equipoCodigo: string;
    equipoUbicacion: string;
  }>();

  const [questions, setQuestions] = useState<PreguntaEquipamento[]>([]);
  const [answers, setAnswers] = useState<
    Record<string, ChecklistQuestionAnswer>
  >({});
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

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.5,
    });

    if (!result.canceled && result.assets.length > 0) {
      onPhotoSelectedRef.current?.(result.assets[0].uri);
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

  const handleObservationChange = useCallback(
    (questionId: string, text: string) => {
      registerInteraction();
      updateAnswer(questionId, prev => ({ ...prev, observacion: text }));
    },
    [registerInteraction, updateAnswer],
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

  const uploadChecklistPhotos = useCallback(
    async (userId: string) => {
      const uploadedGeneralPhotos = await Promise.all(
        generalPhotoUris.map(uri =>
          checklistStorageService.uploadPhoto({
            uri,
            userId,
            equipoId: params.equipoId,
            kind: 'general',
          }),
        ),
      );

      const uploadedQuestionPhotos: Record<string, StoredPhotoRef[]> = {};

      for (const answer of Object.values(answers)) {
        if (answer.status !== false || answer.photoUris.length === 0) {
          continue;
        }

        const photos = await Promise.all(
          answer.photoUris.map(uri =>
            checklistStorageService.uploadPhoto({
              uri,
              userId,
              equipoId: params.equipoId,
              questionId: answer.preguntaId,
              kind: 'question',
            }),
          ),
        );

        uploadedQuestionPhotos[answer.preguntaId] = photos;
      }

      return { uploadedGeneralPhotos, uploadedQuestionPhotos };
    },
    [answers, generalPhotoUris, params.equipoId],
  );

  const validate = useCallback(() => {
    const nextErrors: AnswerErrors = {};
    let hasErrors = false;

    questions.forEach(question => {
      const answer = answers[question.id];
      if (!answer) return;

      if (answer.status === false) {
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
      setGeneralPhotoError('Agregue una foto general del checklist.');
    } else {
      setGeneralPhotoError('');
    }

    setErrors(nextErrors);
    return !hasErrors;
  }, [answers, generalPhotoUris.length, questions]);

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
    if (!validate()) {
      showAppAlert(
        'Faltan datos',
        'Complete observacion y foto donde aplique.',
      );
      return;
    }

    setIsSaving(true);
    let uploadedPhotosForRollback: StoredPhotoRef[] = [];
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        showAppAlert('Error', 'No se pudo obtener el usuario actual.');
        return;
      }

      const alreadyExists = await checkAlreadySubmitted();
      if (alreadyExists) {
        showAppAlert(
          'Checklist ya registrado',
          `Este equipo ya tiene checklist ${frecuencia.toLowerCase()} para el periodo ${periodStart} a ${periodEnd}.`,
        );
        return;
      }

      const { uploadedGeneralPhotos, uploadedQuestionPhotos } =
        await uploadChecklistPhotos(user.id);
      uploadedPhotosForRollback = [
        ...uploadedGeneralPhotos,
        ...Object.values(uploadedQuestionPhotos).flat(),
      ];

      const respuestasJson = buildChecklistAnswersJson(
        questions,
        answers,
        uploadedQuestionPhotos,
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

      const payload: ChecklistResponseInsert = {
        user_created: user.id,
        equipamento_id: params.equipamentoId,
        equipamento_nombre: params.equipamentoNombre,
        equipo_id: params.equipoId,
        equipo_codigo: params.equipoCodigo,
        equipo_ubicacion: params.equipoUbicacion,
        building_name: params.buildingName,
        frequency: frecuencia,
        period_start: periodStart,
        period_end: periodEnd,
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
      };

      const { error } = await supabase
        .from('checklist_response')
        .insert(payload);

      if (error) {
        throw error;
      }

      showAppAlert(
        'Checklist guardado',
        hasObservation
          ? 'Se guardo con observaciones registradas.'
          : 'Se guardo correctamente.',
        () => router.back(),
      );
    } catch (error) {
      console.error('Error saving checklist response:', error);

      if (uploadedPhotosForRollback.length > 0) {
        try {
          await checklistStorageService.removePhotos(uploadedPhotosForRollback);
        } catch (rollbackError) {
          console.error('Error rollback checklist photos:', rollbackError);
        }
      }

      showAppAlert('Error', 'No se pudo guardar el checklist.');
    } finally {
      setIsSaving(false);
    }
  }, [
    answers,
    checkAlreadySubmitted,
    frecuencia,
    params.buildingName,
    params.equipoCodigo,
    params.equipoId,
    params.equipoUbicacion,
    params.equipamentoId,
    params.equipamentoNombre,
    periodEnd,
    periodStart,
    questions,
    router,
    showAppAlert,
    uploadChecklistPhotos,
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

  const listHeader = useMemo(
    () => (
      <View style={styles.generalPhotoCard}>
        <Text style={styles.generalPhotoTitle}>Foto general (obligatoria)</Text>
        <Text style={styles.generalPhotoSubtitle}>
          Sirve como evidencia global del estado del equipo.
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
    ),
    [
      generalPhotoError,
      generalPhotoUris,
      handleAddGeneralPhoto,
      isSaving,
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
        <Text style={styles.title}>{params.equipoCodigo || 'Checklist'}</Text>
        <Text style={styles.subtitle}>
          {params.equipamentoNombre || '-'} - {frecuencia} ({periodStart})
        </Text>
      </View>

      <FlatList
        data={questions}
        keyExtractor={item => item.id}
        renderItem={renderQuestionItem}
        contentContainerStyle={styles.content}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No hay preguntas activas para este tipo de equipo.
            </Text>
          </View>
        }
        ListFooterComponent={<View style={styles.listFooterSpace} />}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
      />

      <View style={styles.footer}>
        <Pressable
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          disabled={isSaving}
          onPress={handleSave}
          accessibilityRole="button">
          <Text style={styles.saveBtnText}>
            {isSaving ? 'Guardando...' : 'Guardar checklist'}
          </Text>
        </Pressable>
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
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
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
  pressed: {
    opacity: 0.82,
  },
});
