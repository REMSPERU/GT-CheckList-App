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
  isApplicable: boolean;
  status: boolean | null;
  observation: string;
  photoUris: string[];
}

interface AuditQuestion {
  id: string;
  question_code: string;
  question_text: string;
  order_index: number;
  section_id: string | null;
  section_name: string | null;
  section_order_index: number | null;
}

type AnswerErrors = Record<string, { observation?: string; photos?: string }>;

type ApplicableAnswerEntry = {
  question: AuditQuestion;
  answer: AuditAnswer & { status: boolean };
};

function createEmptyAuditAnswer(): AuditAnswer {
  return {
    isApplicable: true,
    status: true,
    observation: '',
    photoUris: [],
  };
}

function parseLegacyAuditQuestion(questionText: string) {
  const match = questionText.match(/^\s*\[([^\]]+)\]\s*(.+)$/);

  if (!match) {
    return {
      sectionName: null,
      cleanQuestionText: questionText,
    };
  }

  return {
    sectionName: match[1].trim(),
    cleanQuestionText: match[2].trim(),
  };
}

interface SessionHeaderProps {
  buildingImageUrl?: string;
  buildingName?: string;
  scheduledFor: string;
  onBack: () => void;
}

function SessionHeader({
  buildingImageUrl,
  buildingName,
  scheduledFor,
  onBack,
}: SessionHeaderProps) {
  return (
    <View style={styles.headerContainer}>
      <Pressable
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        onPress={onBack}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </Pressable>
      <Image
        source={
          buildingImageUrl
            ? { uri: buildingImageUrl }
            : require('@/assets/images/icon.png')
        }
        style={styles.headerImage}
        contentFit="cover"
      />
      <View style={styles.overlay} />
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle} numberOfLines={2}>
          {buildingName || 'Auditoria'}
        </Text>
        <Text style={styles.headerSubtitle}>
          Fecha de auditoria: {scheduledFor}
        </Text>
      </View>
    </View>
  );
}

interface AuditQuestionRowProps {
  question: AuditQuestion;
  index: number;
  previousSectionName: string | null;
  answer: AuditAnswer | undefined;
  error: AnswerErrors[string] | undefined;
  isSaving: boolean;
  onChangeApplicable: (questionId: string, isApplicable: boolean) => void;
  onChangeStatus: (questionId: string, status: boolean) => void;
  onChangeObservation: (questionId: string, text: string) => void;
  onAddPhoto: (questionId: string) => void;
  onRemovePhoto: (questionId: string, photoIndex: number) => void;
}

function AuditQuestionRow({
  question,
  index,
  previousSectionName,
  answer,
  error,
  isSaving,
  onChangeApplicable,
  onChangeStatus,
  onChangeObservation,
  onAddPhoto,
  onRemovePhoto,
}: AuditQuestionRowProps) {
  return (
    <View>
      {question.section_name &&
      question.section_name !== previousSectionName ? (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{question.section_name}</Text>
        </View>
      ) : null}

      <QuestionChecklistItem
        order={index + 1}
        question={question.question_text}
        value={{
          isApplicable: answer?.isApplicable ?? true,
          status: answer?.status ?? true,
          observation: answer?.observation ?? '',
          photoUris: answer?.photoUris ?? [],
        }}
        onChangeApplicable={isApplicable =>
          onChangeApplicable(question.id, isApplicable)
        }
        showApplicabilityToggle={true}
        onChangeStatus={status => onChangeStatus(question.id, status)}
        onChangeObservation={text => onChangeObservation(question.id, text)}
        onAddPhoto={() => onAddPhoto(question.id)}
        onRemovePhoto={photoIndex => onRemovePhoto(question.id, photoIndex)}
        errors={error}
        disabled={isSaving}
        statusLayout="stacked"
      />
    </View>
  );
}

interface SubmitAuditFooterProps {
  isSaving: boolean;
  onSubmit: () => void;
}

function SubmitAuditFooter({ isSaving, onSubmit }: SubmitAuditFooterProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.submitButton,
        pressed && styles.pressed,
        isSaving && styles.submitButtonDisabled,
      ]}
      onPress={onSubmit}
      disabled={isSaving}>
      <Text style={styles.submitText}>
        {isSaving ? 'Guardando...' : 'Guardar auditoria'}
      </Text>
    </Pressable>
  );
}

export default function AuditoriaSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    buildingId: string;
    buildingName: string;
    buildingAddress?: string;
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

      const safeQuestions = (localQuestions ?? []).map(question => {
        const parsed = parseLegacyAuditQuestion(question.question_text);
        const sectionName =
          question.section_name && question.section_name.trim().length > 0
            ? question.section_name
            : parsed.sectionName;

        return {
          ...question,
          section_name: sectionName,
          question_text:
            sectionName !== null
              ? parsed.cleanQuestionText
              : question.question_text,
        };
      });

      setQuestions(safeQuestions);

      const initialAnswers: Record<string, AuditAnswer> = {};
      safeQuestions.forEach(question => {
        initialAnswers[question.id] = createEmptyAuditAnswer();
      });
      setAnswers(initialAnswers);
    } catch (error) {
      console.error('Failed to load audit questions:', error);
      showAlert('Error', 'No se pudieron cargar las preguntas de auditoria.');
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  const clearQuestionErrors = useCallback((questionId: string) => {
    setErrors(prev => {
      if (!prev[questionId]) {
        return prev;
      }

      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleOpenCameraSheet = useCallback(
    (questionId: string) => {
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
        clearQuestionErrors(questionId);
      };
      setIsCameraSheetVisible(true);
    },
    [clearQuestionErrors],
  );

  const handleChangeApplicable = useCallback(
    (questionId: string, isApplicable: boolean) => {
      setAnswers(prev => {
        const current = prev[questionId] ?? createEmptyAuditAnswer();

        return {
          ...prev,
          [questionId]: {
            ...current,
            isApplicable,
            status: isApplicable ? (current.status ?? true) : null,
            observation: isApplicable ? current.observation : '',
            photoUris: isApplicable ? current.photoUris : [],
          },
        };
      });
      clearQuestionErrors(questionId);
    },
    [clearQuestionErrors],
  );

  const handleChangeStatus = useCallback(
    (questionId: string, status: boolean) => {
      setAnswers(prev => {
        const current = prev[questionId] ?? createEmptyAuditAnswer();

        return {
          ...prev,
          [questionId]: {
            ...current,
            status,
            observation: status ? '' : current.observation,
            photoUris: status ? [] : current.photoUris,
          },
        };
      });
      clearQuestionErrors(questionId);
    },
    [clearQuestionErrors],
  );

  const handleChangeObservation = useCallback(
    (questionId: string, text: string) => {
      setAnswers(prev => {
        const current = prev[questionId] ?? createEmptyAuditAnswer();

        return {
          ...prev,
          [questionId]: {
            ...current,
            observation: text,
          },
        };
      });
      clearQuestionErrors(questionId);
    },
    [clearQuestionErrors],
  );

  const handleRemovePhoto = useCallback(
    (questionId: string, photoIndex: number) => {
      setAnswers(prev => {
        const current = prev[questionId] ?? createEmptyAuditAnswer();

        return {
          ...prev,
          [questionId]: {
            ...current,
            photoUris: current.photoUris.filter(
              (_, index) => index !== photoIndex,
            ),
          },
        };
      });
      clearQuestionErrors(questionId);
    },
    [clearQuestionErrors],
  );

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

      if (!answer || !answer.isApplicable) {
        continue;
      }

      if (answer.status === null) {
        nextErrors[question.id] = {
          observation: 'Seleccione OK u OBS para continuar.',
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
        const isAssigned = assignedProperties.some(property => {
          return String(property.id) === String(params.buildingId);
        });

        if (!isAssigned) {
          showAlert(
            'Sin permiso',
            'Este inmueble ya no esta asignado a su usuario auditor.',
          );
          return;
        }
      }

      const payloadAnswers = questions
        .map(question => ({ question, answer: answers[question.id] }))
        .filter((entry): entry is ApplicableAnswerEntry => {
          return (
            entry.answer?.isApplicable === true && entry.answer.status !== null
          );
        })
        .map(({ question, answer }) => {
          const status = answer.status === true ? 'OK' : 'OBS';

          return {
            question_id: question.id,
            status,
            comment: status === 'OBS' ? answer.observation.trim() : null,
            photos:
              status === 'OBS'
                ? answer.photoUris.map(uri => ({ local_uri: uri }))
                : [],
          };
        });

      const totalObs = payloadAnswers.filter(
        item => item.status === 'OBS',
      ).length;
      const totalOk = payloadAnswers.length - totalObs;
      const totalNotApplicable = questions.length - payloadAnswers.length;
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
          version: 2,
          answers: payloadAnswers,
        },
        summary: {
          total_questions: questions.length,
          total_applies: payloadAnswers.length,
          total_not_applicable: totalNotApplicable,
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
        'Auditoria guardada localmente. Revise el historial para generar el informe cuando este subida.',
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

  const renderQuestionItem = useCallback(
    ({ item, index }: { item: AuditQuestion; index: number }) => (
      <AuditQuestionRow
        question={item}
        index={index}
        previousSectionName={questions[index - 1]?.section_name ?? null}
        answer={answers[item.id]}
        error={errors[item.id]}
        isSaving={isSaving}
        onChangeApplicable={handleChangeApplicable}
        onChangeStatus={handleChangeStatus}
        onChangeObservation={handleChangeObservation}
        onAddPhoto={handleOpenCameraSheet}
        onRemovePhoto={handleRemovePhoto}
      />
    ),
    [
      answers,
      errors,
      handleChangeApplicable,
      handleChangeObservation,
      handleChangeStatus,
      handleOpenCameraSheet,
      handleRemovePhoto,
      isSaving,
      questions,
    ],
  );

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
      <SessionHeader
        buildingImageUrl={params.buildingImageUrl}
        buildingName={params.buildingName}
        scheduledFor={scheduledFor}
        onBack={router.back}
      />

      <FlatList
        data={questions}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderQuestionItem}
        ListFooterComponent={
          <SubmitAuditFooter isSaving={isSaving} onSubmit={handleSubmit} />
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
  sectionHeader: {
    paddingHorizontal: 2,
    paddingTop: 8,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
