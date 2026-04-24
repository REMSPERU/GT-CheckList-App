import { QuestionChecklistItem } from '@/components/maintenance/checklist/question-checklist-item';
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
  isFirstInSystem: boolean;
  isFirstInEquipment: boolean;
  isSystemCollapsed: boolean;
  isEquipmentCollapsed: boolean;
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
  isFirstInSystem,
  isFirstInEquipment,
  isSystemCollapsed,
  isEquipmentCollapsed,
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
  const shouldShowChecklist = !isSystemCollapsed && !isEquipmentCollapsed;
  const systemLabel = question.section_name ?? 'Sin sistema';
  const equipmentLabel = question.equipment_name ?? 'Sin equipamiento';

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
          <Text style={sessionScreenStyles.sectionTitle}>
            Sistema: {systemLabel}
          </Text>
          <Ionicons
            name={isSystemCollapsed ? 'chevron-down' : 'chevron-up'}
            size={18}
            color="#0F766E"
            style={sessionScreenStyles.hierarchyChevron}
          />
        </Pressable>
      ) : null}

      {!isSystemCollapsed && isFirstInEquipment ? (
        <Pressable
          style={({ pressed }) => [
            sessionScreenStyles.equipmentHeader,
            pressed && sessionScreenStyles.pressed,
          ]}
          onPress={onToggleEquipment}
          accessibilityRole="button">
          <Text style={sessionScreenStyles.equipmentTitle}>
            Equipamiento: {equipmentLabel}
          </Text>
          <Ionicons
            name={isEquipmentCollapsed ? 'chevron-down' : 'chevron-up'}
            size={16}
            color="#0E7490"
            style={sessionScreenStyles.hierarchyChevron}
          />
        </Pressable>
      ) : null}

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
