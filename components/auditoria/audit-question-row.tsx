import { QuestionChecklistItem } from '@/components/maintenance/checklist/question-checklist-item';
import { memo, type ReactNode } from 'react';
import type {
  AnswerErrors,
  AuditAnswer,
  AuditQuestion,
} from '@/types/auditoria';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sessionScreenStyles } from './session-screen-styles';

interface AuditQuestionRowProps {
  question: AuditQuestion;
  index: number;
  systemLabel: string;
  equipmentLabel: string | null;
  systemKey: string;
  equipmentCollapseKey: string;
  isFirstInSystem: boolean;
  isFirstInEquipment: boolean;
  isLastInEquipment: boolean;
  isSystemCollapsed: boolean;
  isEquipmentCollapsed: boolean;
  systemPendingCount: number;
  equipmentPendingCount: number;
  hideChecklist?: boolean;
  selectionHint?: string | null;
  systemSelector?: ReactNode;
  systemApplicabilityControl?: ReactNode;
  equipmentFeedbackContent?: ReactNode;
  answer: AuditAnswer | undefined;
  error: AnswerErrors[string] | undefined;
  isSaving: boolean;
  onToggleSystem: (systemKey: string) => void;
  onToggleEquipment: (equipmentCollapseKey: string) => void;
  onChangeApplicable: (questionId: string, isApplicable: boolean) => void;
  onChangeStatus: (questionId: string, status: boolean) => void;
  onChangeObservation: (questionId: string, text: string) => void;
  onAddPhoto: (questionId: string) => void;
  onRemovePhoto: (questionId: string, photoIndex: number) => void;
}

export const AuditQuestionRow = memo(function AuditQuestionRow({
  question,
  index,
  systemLabel,
  equipmentLabel,
  systemKey,
  equipmentCollapseKey,
  isFirstInSystem,
  isFirstInEquipment,
  isLastInEquipment,
  isSystemCollapsed,
  isEquipmentCollapsed,
  systemPendingCount,
  equipmentPendingCount,
  hideChecklist = false,
  selectionHint = null,
  systemSelector,
  systemApplicabilityControl,
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
          onPress={() => onToggleSystem(systemKey)}
          accessibilityRole="button">
          <Text style={sessionScreenStyles.sectionTitle}>{systemLabel}</Text>
          <View style={sessionScreenStyles.headerMetaRow}>
            {systemPendingCount > 0 ? (
              <Text style={sessionScreenStyles.pendingBadge}>
                {systemPendingCount} pendiente
                {systemPendingCount === 1 ? '' : 's'}
              </Text>
            ) : null}
            <Ionicons
              name={isSystemCollapsed ? 'chevron-down' : 'chevron-up'}
              size={18}
              color="#0F766E"
              style={sessionScreenStyles.hierarchyChevron}
            />
          </View>
        </Pressable>
      ) : null}

      {!isSystemCollapsed && isFirstInSystem ? systemSelector : null}

      {!isSystemCollapsed && !hideChecklist && isFirstInSystem
        ? systemApplicabilityControl
        : null}

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
          onPress={() => onToggleEquipment(equipmentCollapseKey)}
          accessibilityRole="button">
          <Text style={sessionScreenStyles.equipmentTitle}>
            {equipmentLabel}
          </Text>
          <View style={sessionScreenStyles.headerMetaRow}>
            {equipmentPendingCount > 0 ? (
              <Text style={sessionScreenStyles.pendingBadgeSecondary}>
                {equipmentPendingCount} pendiente
                {equipmentPendingCount === 1 ? '' : 's'}
              </Text>
            ) : null}
            <Ionicons
              name={isEquipmentCollapsed ? 'chevron-down' : 'chevron-up'}
              size={16}
              color="#0E7490"
              style={sessionScreenStyles.hierarchyChevron}
            />
          </View>
        </Pressable>
      ) : null}

      {shouldShowChecklist ? (
        <View
          style={shouldShowEquipmentHeader ? styles.equipmentContent : null}>
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

          {isLastInEquipment ? equipmentFeedbackContent : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  equipmentContent: {
    marginLeft: 8,
  },
});
