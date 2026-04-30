import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface ExitConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSaveDraft: () => void;
}

/**
 * Confirmation modal shown when the auditor tries to leave a session
 * with unsaved progress. Offers three actions: save draft, discard, or cancel.
 *
 * Visual style reuses the same overlay / card / typography tokens as
 * AppAlertModal and LogoutConfirmModal for consistency.
 */
export function ExitConfirmModal({
  visible,
  onCancel,
  onDiscard,
  onSaveDraft,
}: ExitConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>¿Salir de la auditoria?</Text>
          <Text style={styles.message}>
            Tiene progreso sin enviar. ¿Que desea hacer?
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
              onPress={onSaveDraft}
              accessibilityRole="button">
              <Text style={styles.primaryButtonText}>Guardar borrador</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.dangerButton,
                pressed && styles.pressed,
              ]}
              onPress={onDiscard}
              accessibilityRole="button">
              <Text style={styles.dangerButtonText}>Descartar cambios</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
              onPress={onCancel}
              accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  button: {
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#0891B2',
  },
  dangerButton: {
    backgroundColor: '#DC2626',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
