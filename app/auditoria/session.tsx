import { AppAlertModal } from '@/components/app-alert-modal';
import { ExitConfirmModal } from '@/components/auditoria/exit-confirm-modal';
import { EquipmentFeedbackCard } from '@/components/auditoria/equipment-feedback-card';
import { AuditQuestionRow } from '@/components/auditoria/audit-question-row';
import { SessionHeader } from '@/components/auditoria/session-header';
import { sessionScreenStyles as styles } from '@/components/auditoria/session-screen-styles';
import { SubmitAuditFooter } from '@/components/auditoria/submit-audit-footer';
import { CameraSourceSheet } from '@/components/maintenance/camera-source-sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditSessionDraft } from '@/hooks/use-audit-session-draft';
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
  EquipmentFeedback,
  StoredEquipmentFeedback,
  AuditQuestion,
} from '@/types/auditoria';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Platform,
  Pressable,
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
  isLastInEquipment: boolean;
}

interface AuditValidationResult {
  isValid: boolean;
  missingStatusLocations: string[];
  missingObservationLocations: string[];
  missingPhotosLocations: string[];
}

interface SystemEquipmentOption {
  id: string;
  label: string;
  equipments: string[];
}

interface InitialCollapsedState {
  systems: Record<string, boolean>;
  equipments: Record<string, boolean>;
}

// EquipmentFeedback is now imported from '@/types/auditoria'

const AIR_CONDITIONING_SECTION_ALIASES = ['aire acondicionado'];
const FIRE_SYSTEM_SECTION_ALIASES = [
  'sistema contra incendio',
  'sistema contra incendios',
  'contra incendio',
  'contra incendios',
];

const AIR_CONDITIONING_OPTIONS: SystemEquipmentOption[] = [
  {
    id: 'chiller-aire',
    label: 'Chiller (aire)',
    equipments: ['planta de agua helada aire', 'planta de agua helada chiller'],
  },
  {
    id: 'chiller-agua',
    label: 'Chiller (agua)',
    equipments: [
      'planta de agua helada agua ',
      'planta de ablandamiento y tratamiento quimico',
    ],
  },
  {
    id: 'vrv-agua',
    label: 'VRV (agua)',
    equipments: ['vrv agua', 'planta de ablandamiento y tratamiento quimico'],
  },
  {
    id: 'vrv-aire',
    label: 'VRV (aire)',
    equipments: ['vrv aire'],
  },
];

const FIRE_SYSTEM_OPTIONS: SystemEquipmentOption[] = [
  {
    id: 'motobomba',
    label: 'Motobomba',
    equipments: [
      'motobomba',
      'red humeda',
      'rociadores',
      'gabinete contra incendio',
    ],
  },
  {
    id: 'electrobomba',
    label: 'Electrobomba',
    equipments: [
      'electrobomba',
      'red humeda de rociadores',
      'gabinetes contra incendio',
    ],
  },
];

function normalizeAuditLabel(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function buildInitialCollapsedState(
  questions: AuditQuestion[],
): InitialCollapsedState {
  return questions.reduce<InitialCollapsedState>(
    (acc, question) => {
      const systemKey =
        normalizeAuditLabel(question.section_name) || '__GENERAL__';
      const equipmentKey =
        normalizeAuditLabel(question.equipment_name) || '__WITHOUT_EQUIPMENT__';
      const equipmentCollapseKey = `${systemKey}::${equipmentKey}`;

      acc.systems[systemKey] = true;
      acc.equipments[equipmentCollapseKey] = true;

      return acc;
    },
    {
      systems: {},
      equipments: {},
    },
  );
}

function normalizeForMatch(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildEquipmentFeedbackKey(
  systemLabel: string,
  equipmentLabel: string | null,
) {
  return equipmentLabel ? `${systemLabel}::${equipmentLabel}` : systemLabel;
}

function matchesSection(
  sectionName: string | null | undefined,
  expectedSections: string[],
) {
  const normalizedSection = normalizeForMatch(sectionName);

  if (!normalizedSection) {
    return false;
  }

  return expectedSections.some(sectionAlias => {
    const normalizedAlias = normalizeForMatch(sectionAlias);
    return (
      normalizedSection === normalizedAlias ||
      normalizedSection.includes(normalizedAlias)
    );
  });
}

function matchesEquipment(
  equipmentName: string | null | undefined,
  option: SystemEquipmentOption,
) {
  const normalizedEquipment = normalizeForMatch(equipmentName);
  if (!normalizedEquipment) {
    return false;
  }

  return option.equipments.some(equipment => {
    const expected = normalizeForMatch(equipment);
    return normalizedEquipment.includes(expected);
  });
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
  const { loadDraft, schedulePersist, flushDraft, clearDraft } =
    useAuditSessionDraft(params.buildingId);

  const startedAtRef = useRef(new Date().toISOString());
  const onPhotoSelectedRef = useRef<((uri: string) => void) | null>(null);

  // Ref mirrors so schedulePersist always reads the latest state
  const answersRef = useRef<Record<string, AuditAnswer>>({});
  const feedbacksRef = useRef<Record<string, EquipmentFeedback>>({});
  const airOptionRef = useRef<string | null>(null);
  const fireOptionRef = useRef<string | null>(null);

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
  const [equipmentFeedbacks, setEquipmentFeedbacks] = useState<
    Record<string, EquipmentFeedback>
  >({});
  const [selectedAirConditioningOption, setSelectedAirConditioningOption] =
    useState<string | null>(null);
  const [selectedFireSystemOption, setSelectedFireSystemOption] = useState<
    string | null
  >(null);
  const [isCameraSheetVisible, setIsCameraSheetVisible] = useState(false);
  const [isExitModalVisible, setIsExitModalVisible] = useState(false);
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
  });

  const scheduledFor = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Keep refs in sync with state so schedulePersist reads fresh values
  answersRef.current = answers;
  feedbacksRef.current = equipmentFeedbacks;
  airOptionRef.current = selectedAirConditioningOption;
  fireOptionRef.current = selectedFireSystemOption;

  /** Queue a debounced draft write using current ref snapshots. */
  const persistCurrentDraft = useCallback(() => {
    schedulePersist({
      buildingId: params.buildingId,
      startedAt: startedAtRef.current,
      answers: answersRef.current,
      equipmentFeedbacks: feedbacksRef.current,
      selectedAirConditioningOption: airOptionRef.current,
      selectedFireSystemOption: fireOptionRef.current,
      lastUpdatedAt: new Date().toISOString(),
    });
  }, [params.buildingId, schedulePersist]);

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
      const initialCollapsedState = buildInitialCollapsedState(safeQuestions);

      // Attempt to restore an existing draft for this building
      const draft = await loadDraft();
      if (draft) {
        // Merge: only restore answers for questions that still exist
        for (const [questionId, answer] of Object.entries(draft.answers)) {
          if (initialAnswers[questionId]) {
            initialAnswers[questionId] = answer;
          }
        }
        startedAtRef.current = draft.startedAt;
        setAnswers(initialAnswers);
        setEquipmentFeedbacks(draft.equipmentFeedbacks);
        setSelectedAirConditioningOption(draft.selectedAirConditioningOption);
        setSelectedFireSystemOption(draft.selectedFireSystemOption);
      } else {
        setAnswers(initialAnswers);
        setEquipmentFeedbacks({});
        setSelectedAirConditioningOption(null);
        setSelectedFireSystemOption(null);
      }

      setCollapsedSystems(initialCollapsedState.systems);
      setCollapsedEquipments(initialCollapsedState.equipments);
    } catch (error) {
      console.error('Failed to load audit questions:', error);
      showAlert('Error', 'No se pudieron cargar las actividades de auditoria.');
    } finally {
      setIsLoading(false);
    }
  }, [showAlert, loadDraft]);

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

  const hasAirConditioningQuestions = useMemo(() => {
    return questions.some(question =>
      matchesSection(question.section_name, AIR_CONDITIONING_SECTION_ALIASES),
    );
  }, [questions]);

  const hasFireSystemQuestions = useMemo(() => {
    return questions.some(question =>
      matchesSection(question.section_name, FIRE_SYSTEM_SECTION_ALIASES),
    );
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const selectedAirOption = AIR_CONDITIONING_OPTIONS.find(
      option => option.id === selectedAirConditioningOption,
    );
    const selectedFireOption = FIRE_SYSTEM_OPTIONS.find(
      option => option.id === selectedFireSystemOption,
    );

    return questions.filter(question => {
      if (
        matchesSection(question.section_name, AIR_CONDITIONING_SECTION_ALIASES)
      ) {
        return selectedAirOption
          ? matchesEquipment(question.equipment_name, selectedAirOption)
          : false;
      }

      if (matchesSection(question.section_name, FIRE_SYSTEM_SECTION_ALIASES)) {
        return selectedFireOption
          ? matchesEquipment(question.equipment_name, selectedFireOption)
          : false;
      }

      return true;
    });
  }, [questions, selectedAirConditioningOption, selectedFireSystemOption]);

  const equipmentFeedbackTargets = useMemo(() => {
    const dedup = new Map<
      string,
      {
        key: string;
        systemLabel: string;
        equipmentLabel: string | null;
        displayLabel: string;
      }
    >();

    filteredQuestions.forEach(question => {
      const systemLabel =
        normalizeAuditLabel(question.section_name) || 'General';
      const equipmentLabel = normalizeAuditLabel(question.equipment_name);
      const key = buildEquipmentFeedbackKey(systemLabel, equipmentLabel);

      if (!dedup.has(key)) {
        dedup.set(key, {
          key,
          systemLabel,
          equipmentLabel,
          displayLabel: equipmentLabel || systemLabel,
        });
      }
    });

    return [...dedup.values()];
  }, [filteredQuestions]);

  const displayQuestions = useMemo(() => {
    const selectedAirOption = AIR_CONDITIONING_OPTIONS.find(
      option => option.id === selectedAirConditioningOption,
    );
    const selectedFireOption = FIRE_SYSTEM_OPTIONS.find(
      option => option.id === selectedFireSystemOption,
    );

    let shownAirPlaceholder = false;
    let shownFirePlaceholder = false;

    return questions.filter(question => {
      if (
        matchesSection(question.section_name, AIR_CONDITIONING_SECTION_ALIASES)
      ) {
        if (selectedAirOption) {
          return matchesEquipment(question.equipment_name, selectedAirOption);
        }

        if (shownAirPlaceholder) {
          return false;
        }

        shownAirPlaceholder = true;
        return true;
      }

      if (matchesSection(question.section_name, FIRE_SYSTEM_SECTION_ALIASES)) {
        if (selectedFireOption) {
          return matchesEquipment(question.equipment_name, selectedFireOption);
        }

        if (shownFirePlaceholder) {
          return false;
        }

        shownFirePlaceholder = true;
        return true;
      }

      return true;
    });
  }, [questions, selectedAirConditioningOption, selectedFireSystemOption]);

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
        persistCurrentDraft();
      };
      setIsCameraSheetVisible(true);
    },
    [clearQuestionErrors, persistCurrentDraft],
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
      persistCurrentDraft();
    },
    [clearQuestionErrors, persistCurrentDraft],
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
      persistCurrentDraft();
    },
    [clearQuestionErrors, persistCurrentDraft],
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
      persistCurrentDraft();
    },
    [clearQuestionErrors, persistCurrentDraft],
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
      persistCurrentDraft();
    },
    [clearQuestionErrors, persistCurrentDraft],
  );

  const ensureEquipmentFeedback = useCallback(
    (systemLabel: string, equipmentLabel: string | null) => {
      const key = buildEquipmentFeedbackKey(systemLabel, equipmentLabel);
      const resolvedLabel = equipmentLabel || systemLabel;

      return {
        key,
        buildDefault: (): EquipmentFeedback => ({
          equipmentLabel: resolvedLabel,
          goodPracticesComment: '',
          goodPracticesPhotos: [],
          improvementOpportunityComment: '',
          improvementOpportunityPhotos: [],
        }),
      };
    },
    [],
  );

  const handleEquipmentFeedbackCommentChange = useCallback(
    (
      systemLabel: string,
      equipmentLabel: string | null,
      field: 'goodPracticesComment' | 'improvementOpportunityComment',
      text: string,
    ) => {
      const feedbackEntry = ensureEquipmentFeedback(
        systemLabel,
        equipmentLabel,
      );

      setEquipmentFeedbacks(prev => {
        const current = prev[feedbackEntry.key] ?? feedbackEntry.buildDefault();

        return {
          ...prev,
          [feedbackEntry.key]: {
            ...current,
            [field]: text,
          },
        };
      });
      persistCurrentDraft();
    },
    [ensureEquipmentFeedback, persistCurrentDraft],
  );

  const handleOpenEquipmentFeedbackPhotoSheet = useCallback(
    (
      systemLabel: string,
      equipmentLabel: string | null,
      field: 'goodPracticesPhotos' | 'improvementOpportunityPhotos',
    ) => {
      const feedbackEntry = ensureEquipmentFeedback(
        systemLabel,
        equipmentLabel,
      );

      onPhotoSelectedRef.current = (uri: string) => {
        setEquipmentFeedbacks(prev => {
          const current =
            prev[feedbackEntry.key] ?? feedbackEntry.buildDefault();

          return {
            ...prev,
            [feedbackEntry.key]: {
              ...current,
              [field]: [...current[field], uri],
            },
          };
        });
        persistCurrentDraft();
      };

      setIsCameraSheetVisible(true);
    },
    [ensureEquipmentFeedback, persistCurrentDraft],
  );

  const handleRemoveEquipmentFeedbackPhoto = useCallback(
    (
      systemLabel: string,
      equipmentLabel: string | null,
      field: 'goodPracticesPhotos' | 'improvementOpportunityPhotos',
      photoIndex: number,
    ) => {
      const feedbackEntry = ensureEquipmentFeedback(
        systemLabel,
        equipmentLabel,
      );

      setEquipmentFeedbacks(prev => {
        const current = prev[feedbackEntry.key] ?? feedbackEntry.buildDefault();

        return {
          ...prev,
          [feedbackEntry.key]: {
            ...current,
            [field]: current[field].filter((_, index) => index !== photoIndex),
          },
        };
      });
      persistCurrentDraft();
    },
    [ensureEquipmentFeedback, persistCurrentDraft],
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

    for (const question of filteredQuestions) {
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
  }, [answers, filteredQuestions]);

  const handleSubmit = useCallback(async () => {
    if (!canAudit || !user?.id || !params.buildingId) {
      showAlert('Error', 'No tiene permisos para registrar auditorias.');
      return;
    }

    const missingSelections: string[] = [];
    if (hasAirConditioningQuestions && !selectedAirConditioningOption) {
      missingSelections.push('Aire acondicionado');
    }
    if (hasFireSystemQuestions && !selectedFireSystemOption) {
      missingSelections.push('Sistema contra incendios');
    }

    if (missingSelections.length > 0) {
      showAlert(
        'Seleccion requerida',
        `Debe elegir una opcion en: ${missingSelections.join(', ')}.`,
      );
      return;
    }

    if (filteredQuestions.length === 0) {
      showAlert(
        'Sin actividades',
        'No hay actividades disponibles para guardar.',
      );
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

      const payloadAnswers = filteredQuestions
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

      const payloadEquipmentFeedback: StoredEquipmentFeedback[] =
        equipmentFeedbackTargets
          .map(target => {
            const feedback = equipmentFeedbacks[target.key];

            const goodPracticesComment =
              feedback?.goodPracticesComment.trim() || null;
            const improvementOpportunityComment =
              feedback?.improvementOpportunityComment.trim() || null;
            const goodPracticesPhotos =
              feedback?.goodPracticesPhotos.map(uri => ({ local_uri: uri })) ||
              [];
            const improvementOpportunityPhotos =
              feedback?.improvementOpportunityPhotos.map(uri => ({
                local_uri: uri,
              })) || [];

            const hasContent =
              Boolean(goodPracticesComment) ||
              Boolean(improvementOpportunityComment) ||
              goodPracticesPhotos.length > 0 ||
              improvementOpportunityPhotos.length > 0;

            if (!hasContent) {
              return null;
            }

            return {
              equipment_key: target.key,
              equipment_label: target.displayLabel,
              good_practices_comment: goodPracticesComment,
              good_practices_photos: goodPracticesPhotos,
              improvement_opportunity_comment: improvementOpportunityComment,
              improvement_opportunity_photos: improvementOpportunityPhotos,
            };
          })
          .filter(item => item !== null);

      const totalObs = payloadAnswers.filter(
        item => item.status === 'OBS',
      ).length;
      const totalOk = payloadAnswers.length - totalObs;
      const totalNotApplicable =
        filteredQuestions.length - payloadAnswers.length;
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
          equipment_feedback: payloadEquipmentFeedback,
        },
        summary: {
          total_questions: filteredQuestions.length,
          total_applies: payloadAnswers.length,
          total_not_applicable: totalNotApplicable,
          total_ok: totalOk,
          total_obs: totalObs,
          total_photos: totalPhotos,
        },
      });

      syncService
        .triggerSync('audit-session-submit', { pushOnly: true })
        .catch(error => {
          console.error('Audit push failed, will retry later:', error);
        });

      // Draft is no longer needed after successful submit
      await clearDraft();

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
    equipmentFeedbackTargets,
    equipmentFeedbacks,
    isAuditor,
    params.buildingId,
    filteredQuestions,
    hasAirConditioningQuestions,
    hasFireSystemQuestions,
    scheduledFor,
    selectedAirConditioningOption,
    selectedFireSystemOption,
    showAlert,
    user?.id,
    validateAnswers,
    clearDraft,
  ]);

  /** Derived flag: has the user made any progress worth saving? */
  const hasProgress = useMemo(() => {
    const hasAnswerProgress = Object.values(answers).some(
      a => a.status !== null || !a.isApplicable,
    );
    const hasFeedbackProgress = Object.values(equipmentFeedbacks).some(
      f =>
        f.goodPracticesComment.trim() !== '' ||
        f.improvementOpportunityComment.trim() !== '' ||
        f.goodPracticesPhotos.length > 0 ||
        f.improvementOpportunityPhotos.length > 0,
    );
    return hasAnswerProgress || hasFeedbackProgress;
  }, [answers, equipmentFeedbacks]);

  const handleBack = useCallback(() => {
    if (hasProgress) {
      setIsExitModalVisible(true);
    } else {
      router.back();
    }
  }, [hasProgress, router]);

  const handleExitDiscard = useCallback(async () => {
    setIsExitModalVisible(false);
    await clearDraft();
    router.back();
  }, [clearDraft, router]);

  const handleExitSaveDraft = useCallback(async () => {
    setIsExitModalVisible(false);
    await flushDraft();
    router.back();
  }, [flushDraft, router]);

  // Intercept Android hardware back button
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (hasProgress) {
          setIsExitModalVisible(true);
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [hasProgress]);

  const preparedQuestions = useMemo<PreparedAuditQuestionRow[]>(() => {
    return displayQuestions.map((question, index) => {
      const previousQuestion = displayQuestions[index - 1];
      const nextQuestion = displayQuestions[index + 1];
      const currentSystem = normalizeAuditLabel(question.section_name);
      const currentEquipment = normalizeAuditLabel(question.equipment_name);
      const previousSystem = normalizeAuditLabel(
        previousQuestion?.section_name,
      );
      const previousEquipment = normalizeAuditLabel(
        previousQuestion?.equipment_name,
      );
      const nextSystem = normalizeAuditLabel(nextQuestion?.section_name);
      const nextEquipment = normalizeAuditLabel(nextQuestion?.equipment_name);

      const systemLabel = currentSystem || 'General';
      const systemKey = currentSystem || '__GENERAL__';
      const equipmentKey = currentEquipment || '__WITHOUT_EQUIPMENT__';
      const previousSystemKey = previousSystem || '__GENERAL__';
      const previousEquipmentKey = previousEquipment || '__WITHOUT_EQUIPMENT__';
      const nextSystemKey = nextSystem || '__GENERAL__';
      const nextEquipmentKey = nextEquipment || '__WITHOUT_EQUIPMENT__';

      const isFirstInSystem = index === 0 || previousSystemKey !== systemKey;
      const isFirstInEquipment =
        isFirstInSystem ||
        previousSystemKey !== systemKey ||
        previousEquipmentKey !== equipmentKey;
      const isLastInEquipment =
        index === displayQuestions.length - 1 ||
        nextSystemKey !== systemKey ||
        nextEquipmentKey !== equipmentKey;

      return {
        question,
        index,
        systemLabel,
        equipmentLabel: currentEquipment,
        systemKey,
        equipmentCollapseKey: `${systemKey}::${equipmentKey}`,
        isFirstInSystem,
        isFirstInEquipment,
        isLastInEquipment,
      };
    });
  }, [displayQuestions]);

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
      const isAirConditioningSystem = matchesSection(
        item.question.section_name,
        AIR_CONDITIONING_SECTION_ALIASES,
      );
      const isFireSystem = matchesSection(
        item.question.section_name,
        FIRE_SYSTEM_SECTION_ALIASES,
      );
      const hideChecklist =
        (isAirConditioningSystem && !selectedAirConditioningOption) ||
        (isFireSystem && !selectedFireSystemOption);

      const selectionHint = hideChecklist
        ? 'Seleccione una opcion para habilitar las actividades de este sistema.'
        : null;

      const systemSelector = item.isFirstInSystem ? (
        isAirConditioningSystem ? (
          <View style={styles.selectorCard}>
            <Text style={styles.selectorTitle}>
              Sistema de aire acondicionado
            </Text>
            <Text style={styles.selectorSubtitle}>
              Elija una opcion para mostrar actividades.
            </Text>
            <View style={styles.selectorOptionsRow}>
              {AIR_CONDITIONING_OPTIONS.map(option => {
                const isSelected = selectedAirConditioningOption === option.id;

                return (
                  <Pressable
                    key={option.id}
                    style={({ pressed }) => [
                      styles.selectorChip,
                      isSelected && styles.selectorChipSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setSelectedAirConditioningOption(option.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}>
                    <Text
                      style={[
                        styles.selectorChipText,
                        isSelected && styles.selectorChipTextSelected,
                      ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : isFireSystem ? (
          <View style={styles.selectorCard}>
            <Text style={styles.selectorTitle}>Sistema contra incendios</Text>
            <Text style={styles.selectorSubtitle}>
              Elija una opcion para mostrar actividades.
            </Text>
            <View style={styles.selectorOptionsRow}>
              {FIRE_SYSTEM_OPTIONS.map(option => {
                const isSelected = selectedFireSystemOption === option.id;

                return (
                  <Pressable
                    key={option.id}
                    style={({ pressed }) => [
                      styles.selectorChip,
                      isSelected && styles.selectorChipSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setSelectedFireSystemOption(option.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}>
                    <Text
                      style={[
                        styles.selectorChipText,
                        isSelected && styles.selectorChipTextSelected,
                      ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null
      ) : null;

      const equipmentFeedbackContent = item.isLastInEquipment ? (
        <EquipmentFeedbackCard
          equipmentLabel={item.equipmentLabel || item.systemLabel}
          value={
            equipmentFeedbacks[
              buildEquipmentFeedbackKey(item.systemLabel, item.equipmentLabel)
            ] ?? {
              equipmentLabel: item.equipmentLabel || item.systemLabel,
              goodPracticesComment: '',
              goodPracticesPhotos: [],
              improvementOpportunityComment: '',
              improvementOpportunityPhotos: [],
            }
          }
          disabled={isSaving}
          onChangeGoodPracticesComment={text =>
            handleEquipmentFeedbackCommentChange(
              item.systemLabel,
              item.equipmentLabel,
              'goodPracticesComment',
              text,
            )
          }
          onAddGoodPracticesPhoto={() =>
            handleOpenEquipmentFeedbackPhotoSheet(
              item.systemLabel,
              item.equipmentLabel,
              'goodPracticesPhotos',
            )
          }
          onRemoveGoodPracticesPhoto={photoIndex =>
            handleRemoveEquipmentFeedbackPhoto(
              item.systemLabel,
              item.equipmentLabel,
              'goodPracticesPhotos',
              photoIndex,
            )
          }
          onChangeImprovementOpportunityComment={text =>
            handleEquipmentFeedbackCommentChange(
              item.systemLabel,
              item.equipmentLabel,
              'improvementOpportunityComment',
              text,
            )
          }
          onAddImprovementOpportunityPhoto={() =>
            handleOpenEquipmentFeedbackPhotoSheet(
              item.systemLabel,
              item.equipmentLabel,
              'improvementOpportunityPhotos',
            )
          }
          onRemoveImprovementOpportunityPhoto={photoIndex =>
            handleRemoveEquipmentFeedbackPhoto(
              item.systemLabel,
              item.equipmentLabel,
              'improvementOpportunityPhotos',
              photoIndex,
            )
          }
        />
      ) : null;

      return (
        <AuditQuestionRow
          question={item.question}
          index={item.index}
          systemLabel={item.systemLabel}
          equipmentLabel={item.equipmentLabel}
          isFirstInSystem={item.isFirstInSystem}
          isFirstInEquipment={item.isFirstInEquipment}
          isLastInEquipment={item.isLastInEquipment}
          isSystemCollapsed={isSystemCollapsed}
          isEquipmentCollapsed={isEquipmentCollapsed}
          hideChecklist={hideChecklist}
          selectionHint={selectionHint}
          systemSelector={systemSelector}
          equipmentFeedbackContent={equipmentFeedbackContent}
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
      handleEquipmentFeedbackCommentChange,
      handleOpenCameraSheet,
      handleOpenEquipmentFeedbackPhotoSheet,
      handleRemovePhoto,
      handleRemoveEquipmentFeedbackPhoto,
      isSaving,
      equipmentFeedbacks,
      selectedAirConditioningOption,
      selectedFireSystemOption,
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
        onBack={handleBack}
      />

      <FlatList
        data={visibleQuestions}
        keyExtractor={item => item.question.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderQuestionItem}
        ListEmptyComponent={
          <Text style={styles.emptyStateText}>
            No hay actividades para esta auditoria.
          </Text>
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        ListFooterComponent={
          <View>
            <SubmitAuditFooter isSaving={isSaving} onSubmit={handleSubmit} />
          </View>
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

      <ExitConfirmModal
        visible={isExitModalVisible}
        onCancel={() => setIsExitModalVisible(false)}
        onDiscard={handleExitDiscard}
        onSaveDraft={handleExitSaveDraft}
      />
    </SafeAreaView>
  );
}
