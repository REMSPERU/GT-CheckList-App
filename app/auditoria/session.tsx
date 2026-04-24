import { AppAlertModal } from '@/components/app-alert-modal';
import { AuditQuestionRow } from '@/components/auditoria/audit-question-row';
import { SessionHeader } from '@/components/auditoria/session-header';
import { sessionScreenStyles as styles } from '@/components/auditoria/session-screen-styles';
import { SubmitAuditFooter } from '@/components/auditoria/submit-audit-footer';
import { CameraSourceSheet } from '@/components/maintenance/camera-source-sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import {
  createEmptyAuditAnswer,
  parseLegacyAuditQuestion,
} from '@/lib/auditoria/session-utils';
import { ensureImagePermission } from '@/lib/image-permissions';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';
import type {
  AnswerErrors,
  ApplicableAnswerEntry,
  AuditAnswer,
  AuditQuestion,
} from '@/types/auditoria';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

interface PreparedAuditQuestionRow {
  question: AuditQuestion;
  index: number;
  systemLabel: string;
  equipmentLabel: string | null;
  systemKey: string;
  equipmentCollapseKey: string;
  isFirstInSystem: boolean;
  isFirstInEquipment: boolean;
}

interface AuditValidationResult {
  isValid: boolean;
  missingStatusLocations: string[];
  missingObservationLocations: string[];
  missingPhotosLocations: string[];
}

function normalizeAuditLabel(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function buildValidationMessage(result: AuditValidationResult) {
  const summarizeLocations = (locations: string[]) => {
    const counter = new Map<string, number>();

    locations.forEach(location => {
      counter.set(location, (counter.get(location) ?? 0) + 1);
    });

    return [...counter.entries()]
      .slice(0, 4)
      .map(([location, count]) =>
        count > 1 ? `${location} (${count})` : location,
      )
      .join(', ');
  };

  const lines: string[] = ['Revise los datos antes de guardar la auditoria:'];

  if (result.missingStatusLocations.length > 0) {
    lines.push(
      `- Falta marcar OK/OBS en ${result.missingStatusLocations.length} actividad(es).`,
    );
    lines.push(
      `  Revisar en: ${summarizeLocations(result.missingStatusLocations)}.`,
    );
  }

  if (result.missingObservationLocations.length > 0) {
    lines.push(
      `- Hay ${result.missingObservationLocations.length} actividad(es) en OBS sin observacion.`,
    );
    lines.push(
      `  Revisar en: ${summarizeLocations(result.missingObservationLocations)}.`,
    );
  }

  if (result.missingPhotosLocations.length > 0) {
    lines.push(
      `- Hay ${result.missingPhotosLocations.length} actividad(es) en OBS sin evidencia fotografica.`,
    );
    lines.push(
      `  Revisar en: ${summarizeLocations(result.missingPhotosLocations)}.`,
    );
  }

  return lines.join('\n');
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
  const [collapsedSystems, setCollapsedSystems] = useState<
    Record<string, boolean>
  >({});
  const [collapsedEquipments, setCollapsedEquipments] = useState<
    Record<string, boolean>
  >({});
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
      setCollapsedSystems({});
      setCollapsedEquipments({});
    } catch (error) {
      console.error('Failed to load audit questions:', error);
      showAlert('Error', 'No se pudieron cargar las actividades de auditoria.');
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
    void loadQuestions();
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
            status: isApplicable ? current.status : null,
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
    const hasCameraPermission = await ensureImagePermission('camera', {
      deniedMessage: 'Debe habilitar acceso a la camara.',
    });
    if (!hasCameraPermission) {
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
  }, []);

  const pickFromGallery = useCallback(async () => {
    const hasLibraryPermission = await ensureImagePermission('mediaLibrary', {
      deniedMessage: 'Debe habilitar acceso a la galeria.',
    });
    if (!hasLibraryPermission) {
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
  }, []);

  const validateAnswers = useCallback((): AuditValidationResult => {
    const nextErrors: AnswerErrors = {};
    const missingStatusLocations: string[] = [];
    const missingObservationLocations: string[] = [];
    const missingPhotosLocations: string[] = [];

    for (const question of questions) {
      const answer = answers[question.id];
      const systemLabel =
        normalizeAuditLabel(question.section_name) || 'General';
      const equipmentLabel = normalizeAuditLabel(question.equipment_name);
      const locationLabel = equipmentLabel
        ? `${systemLabel} - ${equipmentLabel}`
        : systemLabel;

      if (!answer || !answer.isApplicable) {
        continue;
      }

      if (answer.status === null) {
        missingStatusLocations.push(locationLabel);
        nextErrors[question.id] = {
          status: 'Seleccione OK u OBS para continuar.',
        };
        continue;
      }

      if (answer.status === false) {
        const obs = answer.observation.trim();
        if (!obs) {
          missingObservationLocations.push(locationLabel);
          nextErrors[question.id] = {
            ...nextErrors[question.id],
            observation: 'Ingrese una observacion.',
          };
        }

        if (answer.photoUris.length === 0) {
          missingPhotosLocations.push(locationLabel);
          nextErrors[question.id] = {
            ...nextErrors[question.id],
            photos: 'Adjunte al menos una foto para OBS.',
          };
        }
      }
    }

    setErrors(nextErrors);
    return {
      isValid: Object.keys(nextErrors).length === 0,
      missingStatusLocations,
      missingObservationLocations,
      missingPhotosLocations,
    };
  }, [answers, questions]);

  const handleSubmit = useCallback(async () => {
    if (!canAudit || !user?.id || !params.buildingId) {
      showAlert('Error', 'No tiene permisos para registrar auditorias.');
      return;
    }

    const validationResult = validateAnswers();
    if (!validationResult.isValid) {
      showAlert(
        'Validacion incompleta',
        buildValidationMessage(validationResult),
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

  const preparedQuestions = useMemo<PreparedAuditQuestionRow[]>(() => {
    return questions.map((question, index) => {
      const previousQuestion = questions[index - 1];
      const currentSystem = normalizeAuditLabel(question.section_name);
      const currentEquipment = normalizeAuditLabel(question.equipment_name);
      const previousSystem = normalizeAuditLabel(
        previousQuestion?.section_name,
      );
      const previousEquipment = normalizeAuditLabel(
        previousQuestion?.equipment_name,
      );

      const systemLabel = currentSystem || 'General';
      const systemKey = currentSystem || '__GENERAL__';
      const equipmentKey = currentEquipment || '__WITHOUT_EQUIPMENT__';
      const previousSystemKey = previousSystem || '__GENERAL__';
      const previousEquipmentKey = previousEquipment || '__WITHOUT_EQUIPMENT__';

      const isFirstInSystem = index === 0 || previousSystemKey !== systemKey;
      const isFirstInEquipment =
        isFirstInSystem ||
        previousSystemKey !== systemKey ||
        previousEquipmentKey !== equipmentKey;

      return {
        question,
        index,
        systemLabel,
        equipmentLabel: currentEquipment,
        systemKey,
        equipmentCollapseKey: `${systemKey}::${equipmentKey}`,
        isFirstInSystem,
        isFirstInEquipment,
      };
    });
  }, [questions]);

  const visibleQuestions = useMemo(() => {
    return preparedQuestions.filter(item => {
      const isSystemCollapsed = collapsedSystems[item.systemKey] ?? false;

      if (isSystemCollapsed) {
        return item.isFirstInSystem;
      }

      const isEquipmentCollapsed =
        collapsedEquipments[item.equipmentCollapseKey] ?? false;

      if (isEquipmentCollapsed) {
        return item.isFirstInEquipment;
      }

      return true;
    });
  }, [collapsedEquipments, collapsedSystems, preparedQuestions]);

  const renderQuestionItem = useCallback(
    ({ item }: { item: PreparedAuditQuestionRow }) => {
      const isSystemCollapsed = collapsedSystems[item.systemKey] ?? false;
      const isEquipmentCollapsed =
        collapsedEquipments[item.equipmentCollapseKey] ?? false;

      return (
        <AuditQuestionRow
          question={item.question}
          index={item.index}
          systemLabel={item.systemLabel}
          equipmentLabel={item.equipmentLabel}
          isFirstInSystem={item.isFirstInSystem}
          isFirstInEquipment={item.isFirstInEquipment}
          isSystemCollapsed={isSystemCollapsed}
          isEquipmentCollapsed={isEquipmentCollapsed}
          answer={answers[item.question.id]}
          error={errors[item.question.id]}
          isSaving={isSaving}
          onToggleSystem={() => {
            setCollapsedSystems(prev => ({
              ...prev,
              [item.systemKey]: !prev[item.systemKey],
            }));
          }}
          onToggleEquipment={() => {
            setCollapsedEquipments(prev => ({
              ...prev,
              [item.equipmentCollapseKey]: !prev[item.equipmentCollapseKey],
            }));
          }}
          onChangeApplicable={handleChangeApplicable}
          onChangeStatus={handleChangeStatus}
          onChangeObservation={handleChangeObservation}
          onAddPhoto={handleOpenCameraSheet}
          onRemovePhoto={handleRemovePhoto}
        />
      );
    },
    [
      answers,
      collapsedEquipments,
      collapsedSystems,
      errors,
      handleChangeApplicable,
      handleChangeObservation,
      handleChangeStatus,
      handleOpenCameraSheet,
      handleRemovePhoto,
      isSaving,
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
          <Text style={styles.statusText}>Cargando actividades...</Text>
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
        data={visibleQuestions}
        keyExtractor={item => item.question.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderQuestionItem}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
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
