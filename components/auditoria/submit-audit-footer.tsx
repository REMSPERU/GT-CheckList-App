import { Pressable, Text } from 'react-native';
import { sessionScreenStyles } from './session-screen-styles';

interface SubmitAuditFooterProps {
  isSaving: boolean;
  onSubmit: () => void;
}

export function SubmitAuditFooter({
  isSaving,
  onSubmit,
}: SubmitAuditFooterProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        sessionScreenStyles.submitButton,
        pressed && sessionScreenStyles.pressed,
        isSaving && sessionScreenStyles.submitButtonDisabled,
      ]}
      onPress={onSubmit}
      disabled={isSaving}>
      <Text style={sessionScreenStyles.submitText}>
        {isSaving ? 'Guardando...' : 'Guardar auditoria'}
      </Text>
    </Pressable>
  );
}
