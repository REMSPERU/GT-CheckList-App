import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { QuestionChecklistItem } from '@/components/maintenance/checklist/question-checklist-item';
import type {
  ChecklistQuestionAnswer,
  PreguntaEquipamento,
} from '@/types/checklist';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/services/database';

type AnswerErrors = Record<string, { observation?: string; photos?: string }>;

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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const frecuencia = (params.frecuencia || 'MENSUAL').toUpperCase();
  const { periodStart, periodEnd } = useMemo(
    () => getPeriodFromFrequency(frecuencia),
    [frecuencia],
  );

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
        Alert.alert(
          'Error',
          'No se pudieron cargar las preguntas del checklist.',
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, [params.equipamentoId]);

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

  const handleStatusChange = useCallback(
    (questionId: string, status: boolean) => {
      updateAnswer(questionId, prev => ({
        ...prev,
        status,
      }));
      setErrors(prev => ({ ...prev, [questionId]: {} }));
    },
    [updateAnswer],
  );

  const handleObservationChange = useCallback(
    (questionId: string, text: string) => {
      updateAnswer(questionId, prev => ({ ...prev, observacion: text }));
    },
    [updateAnswer],
  );

  const launchCameraOrGallery = useCallback(
    (questionId: string) => {
      const pickFromCamera = async () => {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.5,
        });

        if (!result.canceled && result.assets.length > 0) {
          const uri = result.assets[0].uri;
          updateAnswer(questionId, prev => ({
            ...prev,
            photoUris: [...prev.photoUris, uri],
          }));
        }
      };

      const pickFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.5,
        });

        if (!result.canceled && result.assets.length > 0) {
          const uri = result.assets[0].uri;
          updateAnswer(questionId, prev => ({
            ...prev,
            photoUris: [...prev.photoUris, uri],
          }));
        }
      };

      Alert.alert('Agregar foto', 'Seleccione origen de la foto', [
        {
          text: 'Camara',
          onPress: () => {
            void pickFromCamera();
          },
        },
        {
          text: 'Galeria',
          onPress: () => {
            void pickFromGallery();
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    },
    [updateAnswer],
  );

  const handleRemovePhoto = useCallback(
    (questionId: string, index: number) => {
      updateAnswer(questionId, prev => ({
        ...prev,
        photoUris: prev.photoUris.filter((_, i) => i !== index),
      }));
    },
    [updateAnswer],
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

    setErrors(nextErrors);
    return !hasErrors;
  }, [answers, questions]);

  const checkAlreadySubmitted = useCallback(async () => {
    const { data, error } = await supabase
      .from('maintenance_response')
      .select('id')
      .eq('detail_maintenance->>type', 'equipment_checklist')
      .eq('detail_maintenance->>equipo_id', params.equipoId)
      .eq('detail_maintenance->>period_start', periodStart)
      .limit(1);

    if (error) {
      throw error;
    }

    return (data || []).length > 0;
  }, [params.equipoId, periodStart]);

  const handleSave = useCallback(async () => {
    if (!validate()) {
      Alert.alert('Faltan datos', 'Complete observacion y foto donde aplique.');
      return;
    }

    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        Alert.alert('Error', 'No se pudo obtener el usuario actual.');
        return;
      }

      const alreadyExists = await checkAlreadySubmitted();
      if (alreadyExists) {
        Alert.alert(
          'Checklist ya registrado',
          `Este equipo ya tiene checklist ${frecuencia.toLowerCase()} para el periodo ${periodStart} a ${periodEnd}.`,
        );
        return;
      }

      const questionMap = new Map(questions.map(item => [item.id, item]));
      const respuestas = Object.values(answers).map(answer => ({
        pregunta_id: answer.preguntaId,
        pregunta: questionMap.get(answer.preguntaId)?.pregunta || '',
        orden: questionMap.get(answer.preguntaId)?.orden || 0,
        status_ok: answer.status === true,
        observacion: answer.status === false ? answer.observacion.trim() : null,
        fotos: answer.status === false ? answer.photoUris : [],
      }));

      const hasObservation = respuestas.some(item => item.status_ok === false);

      const detailMaintenance = {
        type: 'equipment_checklist',
        equipamento_id: params.equipamentoId,
        equipamento_nombre: params.equipamentoNombre,
        equipo_id: params.equipoId,
        equipo_codigo: params.equipoCodigo,
        equipo_ubicacion: params.equipoUbicacion,
        building_name: params.buildingName,
        frequency: frecuencia,
        period_start: periodStart,
        period_end: periodEnd,
        respuestas,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('maintenance_response').insert({
        id_mantenimiento: null,
        user_created: user.id,
        detail_maintenance: detailMaintenance,
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Checklist guardado',
        hasObservation
          ? 'Se guardo con observaciones registradas.'
          : 'Se guardo correctamente.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      console.error('Error saving checklist response:', error);
      Alert.alert('Error', 'No se pudo guardar el checklist.');
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
    validate,
  ]);

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{params.equipoCodigo || 'Checklist'}</Text>
        <Text style={styles.subtitle}>
          {params.equipamentoNombre || '-'} - {frecuencia} ({periodStart})
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {questions.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No hay preguntas activas para este tipo de equipo.
            </Text>
          </View>
        )}

        {questions.map((question, index) => {
          const answer = answers[question.id];
          if (!answer) return null;

          return (
            <QuestionChecklistItem
              key={question.id}
              order={index + 1}
              question={question.pregunta}
              value={{
                status: answer.status,
                observation: answer.observacion,
                photoUris: answer.photoUris,
              }}
              onChangeStatus={status => handleStatusChange(question.id, status)}
              onChangeObservation={text =>
                handleObservationChange(question.id, text)
              }
              onAddPhoto={() => launchCameraOrGallery(question.id)}
              onRemovePhoto={indexToRemove =>
                handleRemovePhoto(question.id, indexToRemove)
              }
              errors={errors[question.id]}
              disabled={isSaving}
            />
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          disabled={isSaving}
          onPress={handleSave}>
          <Text style={styles.saveBtnText}>
            {isSaving ? 'Guardando...' : 'Guardar checklist'}
          </Text>
        </TouchableOpacity>
      </View>
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
});
