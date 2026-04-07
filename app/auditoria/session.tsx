import { AppAlertModal } from '@/components/app-alert-modal';
import { CameraSourceSheet } from '@/components/maintenance/camera-source-sheet';
import { QuestionChecklistItem } from '@/components/maintenance/checklist/question-checklist-item';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface AuditAnswer {
  status: boolean | null;
  observation: string;
  photoUris: string[];
}

interface AuditQuestion {
  id: string;
  question_code: string;
  question_text: string;
  order_index: number;
}

type AnswerErrors = Record<string, { observation?: string; photos?: string }>;

export default function AuditoriaSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    buildingId: string;
    buildingName: string;
    buildingImageUrl?: string;
  }>();
  const { user } = useAuth();
  const { canAudit, isAuditor } = useUserRole();

  const startedAtRef = useRef(new Date().toISOString());
  const onPhotoSelectedRef = useRef<((uri: string) => void) | null>(null);

  const [questions, setQuestions] = useState<AuditQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, AuditAnswer>>({});
  const [errors, setErrors] = useState<AnswerErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCameraSheetVisible, setIsCameraSheetVisible] = useState(false);
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
  });

  const scheduledFor = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const showAlert = useCallback((title: string, message: string) => {
    setAlert({ visible: true, title, message });
  }, []);

  const closeAlert = useCallback(() => {
    setAlert({ visible: false, title: '', message: '' });
  }, []);

  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const localQuestions = (await DatabaseService.getAuditQuestions()) as
        | AuditQuestion[]
        | null;

      const safeQuestions = localQuestions ?? [];
      setQuestions(safeQuestions);

      const initialAnswers: Record<string, AuditAnswer> = {};
      safeQuestions.forEach(question => {
        initialAnswers[question.id] = {
          status: null,
          observation: '',
          photoUris: [],
        };
      });
      setAnswers(initialAnswers);
    } catch (error) {
      console.error('Failed to load audit questions:', error);
      showAlert('Error', 'No se pudieron cargar las preguntas de auditoria.');
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleOpenCameraSheet = useCallback((questionId: string) => {
    onPhotoSelectedRef.current = (uri: string) => {
      setAnswers(prev => {
        const current = prev[questionId];
        if (!current) return prev;

        return {
          ...prev,
          [questionId]: {
            ...current,
            photoUris: [...current.photoUris, uri],
          },
        };
      });
    };
    setIsCameraSheetVisible(true);
  }, []);

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permiso requerido', 'Debe habilitar acceso a la camara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled) {
      const uri = result.assets[0]?.uri;
      if (uri) {
        onPhotoSelectedRef.current?.(uri);
      }
    }

    setIsCameraSheetVisible(false);
  }, [showAlert]);

  const pickFromGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permiso requerido', 'Debe habilitar acceso a la galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled) {
      const uri = result.assets[0]?.uri;
      if (uri) {
        onPhotoSelectedRef.current?.(uri);
      }
    }

    setIsCameraSheetVisible(false);
  }, [showAlert]);

  const validateAnswers = useCallback(() => {
    const nextErrors: AnswerErrors = {};

    for (const question of questions) {
      const answer = answers[question.id];

      if (!answer || answer.status === null) {
        nextErrors[question.id] = {
          observation: 'Debe marcar OK u OBS.',
        };
        continue;
      }

      if (answer.status === false) {
        const obs = answer.observation.trim();
        if (!obs) {
          nextErrors[question.id] = {
            ...nextErrors[question.id],
            observation: 'Ingrese una observacion.',
          };
        }

        if (answer.photoUris.length === 0) {
          nextErrors[question.id] = {
            ...nextErrors[question.id],
            photos: 'Adjunte al menos una foto para OBS.',
          };
        }
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [answers, questions]);

  const handleSubmit = useCallback(async () => {
    if (!canAudit || !user?.id || !params.buildingId) {
      showAlert('Error', 'No tiene permisos para registrar auditorias.');
      return;
    }

    if (!validateAnswers()) {
      showAlert(
        'Validacion',
        'Complete todas las preguntas y evidencias antes de enviar.',
      );
      return;
    }

    setIsSaving(true);
    try {
      if (isAuditor) {
        const assignedProperties =
          await DatabaseService.getAssignedPropertiesForAuditor(user.id);
        const isAssigned = (assignedProperties || []).some(property => {
          if (
            !property ||
            typeof property !== 'object' ||
            !('id' in property)
          ) {
            return false;
          }

          return (
            String((property as { id: string }).id) ===
            String(params.buildingId)
          );
        });

        if (!isAssigned) {
          showAlert(
            'Sin permiso',
            'Este inmueble ya no esta asignado a su usuario auditor.',
          );
          return;
        }
      }

      const payloadAnswers = questions.map(question => {
        const answer = answers[question.id];
        const status = answer.status === true ? 'OK' : 'OBS';

        return {
          question_id: question.id,
          question_code: question.question_code,
          status,
          observation: status === 'OBS' ? answer.observation.trim() : null,
          comment: status === 'OBS' ? answer.observation.trim() : null,
          photos:
            status === 'OBS'
              ? answer.photoUris.map(uri => ({ url: uri, path: uri }))
              : [],
        };
      });

      const totalObs = payloadAnswers.filter(
        item => item.status === 'OBS',
      ).length;
      const totalOk = payloadAnswers.length - totalObs;
      const totalPhotos = payloadAnswers.reduce(
        (acc, item) => acc + item.photos.length,
        0,
      );
      const submittedAt = new Date().toISOString();

      await DatabaseService.saveOfflineAuditSession({
        propertyId: params.buildingId,
        auditorId: user.id,
        createdBy: user.id,
        scheduledFor,
        startedAt: startedAtRef.current,
        submittedAt,
        auditPayload: {
          version: 1,
          answers: payloadAnswers,
        },
        summary: {
          total_questions: payloadAnswers.length,
          total_ok: totalOk,
          total_obs: totalObs,
          total_photos: totalPhotos,
        },
      });

      syncService.pushData().catch(error => {
        console.error('Audit push failed, will retry later:', error);
      });

      showAlert(
        'Guardado',
        'Auditoria guardada localmente. Se sincronizara cuando haya internet.',
      );
    } catch (error) {
      console.error('Failed to save audit session:', error);
      showAlert('Error', 'No se pudo guardar la auditoria localmente.');
    } finally {
      setIsSaving(false);
    }
  }, [
    answers,
    canAudit,
    isAuditor,
    params.buildingId,
    questions,
    scheduledFor,
    showAlert,
    user?.id,
    validateAnswers,
  ]);

  if (!canAudit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.statusText}>No tiene permisos de auditoria.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.statusText}>Cargando preguntas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.headerContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Image
          source={
            params.buildingImageUrl
              ? { uri: params.buildingImageUrl }
              : require('@/assets/images/icon.png')
          }
          style={styles.headerImage}
          contentFit="cover"
        />
        <View style={styles.overlay} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {params.buildingName || 'Auditoria'}
          </Text>
          <Text style={styles.headerSubtitle}>
            Fecha de auditoria: {scheduledFor}
          </Text>
        </View>
      </View>

      <FlatList
        data={questions}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <QuestionChecklistItem
            order={index + 1}
            question={item.question_text}
            value={{
              status: answers[item.id]?.status ?? null,
              observation: answers[item.id]?.observation ?? '',
              photoUris: answers[item.id]?.photoUris ?? [],
            }}
            onChangeStatus={status => {
              setAnswers(prev => ({
                ...prev,
                [item.id]: {
                  ...prev[item.id],
                  status,
                  observation: status ? '' : (prev[item.id]?.observation ?? ''),
                  photoUris: status ? [] : (prev[item.id]?.photoUris ?? []),
                },
              }));
            }}
            onChangeObservation={text => {
              setAnswers(prev => ({
                ...prev,
                [item.id]: {
                  ...prev[item.id],
                  observation: text,
                },
              }));
            }}
            onAddPhoto={() => handleOpenCameraSheet(item.id)}
            onRemovePhoto={photoIndex => {
              setAnswers(prev => ({
                ...prev,
                [item.id]: {
                  ...prev[item.id],
                  photoUris:
                    prev[item.id]?.photoUris.filter(
                      (_, i) => i !== photoIndex,
                    ) ?? [],
                },
              }));
            }}
            errors={errors[item.id]}
            disabled={isSaving}
          />
        )}
        ListFooterComponent={
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.pressed,
              isSaving && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSaving}>
            <Text style={styles.submitText}>
              {isSaving ? 'Guardando...' : 'Guardar auditoria'}
            </Text>
          </Pressable>
        }
      />

      <CameraSourceSheet
        visible={isCameraSheetVisible}
        onClose={() => setIsCameraSheetVisible(false)}
        onTakePhoto={takePhoto}
        showGallery={true}
        onPickFromGallery={pickFromGallery}
      />

      <AppAlertModal
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => {
          closeAlert();
          if (alert.title === 'Guardado') {
            router.back();
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    marginTop: 8,
    color: '#6B7280',
  },
  headerContainer: {
    minHeight: 170,
    position: 'relative',
    overflow: 'hidden',
  },
  headerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 72,
  },
  backButton: {
    position: 'absolute',
    top: 44,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.92)',
  },
  listContent: {
    padding: 16,
    paddingBottom: 28,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: '#0891B2',
    borderRadius: 10,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.84,
  },
});
