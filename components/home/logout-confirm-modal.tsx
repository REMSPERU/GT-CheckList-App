import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface LogoutConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function LogoutConfirmModal({
  visible,
  onCancel,
  onConfirm,
}: LogoutConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Cerrar sesion</Text>
          <Text style={styles.message}>
            Estas seguro de que deseas cerrar sesion?
          </Text>

          <View style={styles.actions}>
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

            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.dangerButton,
                pressed && styles.pressed,
              ]}
              onPress={onConfirm}
              accessibilityRole="button">
              <Text style={styles.dangerButtonText}>Cerrar sesion</Text>
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
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
  },
  dangerButton: {
    backgroundColor: '#DC2626',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
