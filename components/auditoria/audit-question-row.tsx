import { QuestionChecklistItem } from '@/components/maintenance/checklist/question-checklist-item';
import type { ReactNode } from 'react';
import type {
  AnswerErrors,
  AuditAnswer,
  AuditQuestion,
} from '@/types/auditoria';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { sessionScreenStyles } from './session-screen-styles';

interface AuditQuestionRowProps {
  question: AuditQuestion;
  index: number;
  systemLabel: string;
  equipmentLabel: string | null;
  isFirstInSystem: boolean;
  isFirstInEquipment: boolean;
  isSystemCollapsed: boolean;
  isEquipmentCollapsed: boolean;
  hideChecklist?: boolean;
  selectionHint?: string | null;
  systemSelector?: ReactNode;
  equipmentFeedbackContent?: ReactNode;
  answer: AuditAnswer | undefined;
  error: AnswerErrors[string] | undefined;
  isSaving: boolean;
  onToggleSystem: () => void;
  onToggleEquipment: () => void;
  onChangeApplicable: (questionId: string, isApplicable: boolean) => void;
  onChangeStatus: (questionId: string, status: boolean) => void;
  onChangeObservation: (questionId: string, text: string) => void;
  onAddPhoto: (questionId: string) => void;
  onRemovePhoto: (questionId: string, photoIndex: number) => void;
}

export function AuditQuestionRow({
  question,
  index,
  systemLabel,
  equipmentLabel,
  isFirstInSystem,
  isFirstInEquipment,
  isSystemCollapsed,
  isEquipmentCollapsed,
  hideChecklist = false,
  selectionHint = null,
  systemSelector,
  equipmentFeedbackContent,
  answer,
  error,
  isSaving,
  onToggleSystem,
  onToggleEquipment,
  onChangeApplicable,
  onChangeStatus,
  onChangeObservation,
  onAddPhoto,
  onRemovePhoto,
}: AuditQuestionRowProps) {
  const shouldShowChecklist =
    !isSystemCollapsed && !isEquipmentCollapsed && !hideChecklist;
  const shouldShowEquipmentHeader = Boolean(equipmentLabel);

  return (
    <View>
      {isFirstInSystem ? (
        <Pressable
          style={({ pressed }) => [
            sessionScreenStyles.sectionHeader,
            pressed && sessionScreenStyles.pressed,
          ]}
          onPress={onToggleSystem}
          accessibilityRole="button">
          <Text style={sessionScreenStyles.sectionTitle}>{systemLabel}</Text>
          <Ionicons
            name={isSystemCollapsed ? 'chevron-down' : 'chevron-up'}
            size={18}
            color="#0F766E"
            style={sessionScreenStyles.hierarchyChevron}
          />
        </Pressable>
      ) : null}

      {!isSystemCollapsed && isFirstInSystem ? systemSelector : null}

      {!isSystemCollapsed && selectionHint ? (
        <Text style={sessionScreenStyles.selectionHintText}>
          {selectionHint}
        </Text>
      ) : null}

      {!isSystemCollapsed && shouldShowEquipmentHeader && isFirstInEquipment ? (
        <Pressable
          style={({ pressed }) => [
            sessionScreenStyles.equipmentHeader,
            pressed && sessionScreenStyles.pressed,
          ]}
          onPress={onToggleEquipment}
          accessibilityRole="button">
          <Text style={sessionScreenStyles.equipmentTitle}>
            {equipmentLabel}
          </Text>
          <Ionicons
            name={isEquipmentCollapsed ? 'chevron-down' : 'chevron-up'}
            size={16}
            color="#0E7490"
            style={sessionScreenStyles.hierarchyChevron}
          />
        </Pressable>
      ) : null}

      {!isSystemCollapsed && !isEquipmentCollapsed && isFirstInEquipment
        ? equipmentFeedbackContent
        : null}

      {shouldShowChecklist ? (
        <QuestionChecklistItem
          order={index + 1}
          question={question.question_text}
          value={{
            isApplicable: answer?.isApplicable ?? true,
            status: answer?.status ?? null,
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
      ) : null}
    </View>
  );
}
