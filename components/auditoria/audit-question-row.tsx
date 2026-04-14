import { QuestionChecklistItem } from '@/components/maintenance/checklist/question-checklist-item';
import type {
  AnswerErrors,
  AuditAnswer,
  AuditQuestion,
} from '@/types/auditoria';
import { Text, View } from 'react-native';
import { sessionScreenStyles } from './session-screen-styles';

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

export function AuditQuestionRow({
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
        <View style={sessionScreenStyles.sectionHeader}>
          <Text style={sessionScreenStyles.sectionTitle}>
            {question.section_name}
          </Text>
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
