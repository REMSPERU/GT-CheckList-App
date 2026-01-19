import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type SaveFeedbackStatus = 'loading' | 'success' | 'error' | 'offline';

interface SaveFeedbackModalProps {
  visible: boolean;
  status: SaveFeedbackStatus;
  message?: string;
  onClose: () => void;
  onRetry?: () => void;
}

const statusConfig = {
  loading: {
    icon: null,
    title: 'Guardando...',
    color: '#06B6D4',
    bgColor: '#E0F7FA',
  },
  success: {
    icon: 'checkmark-circle' as const,
    title: '¡Guardado exitosamente!',
    color: '#10B981',
    bgColor: '#ECFDF5',
  },
  error: {
    icon: 'alert-circle' as const,
    title: 'Error al guardar',
    color: '#EF4444',
    bgColor: '#FEF2F2',
  },
  offline: {
    icon: 'cloud-offline' as const,
    title: 'Guardado localmente',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
  },
};

export function SaveFeedbackModal({
  visible,
  status,
  message,
  onClose,
  onRetry,
}: SaveFeedbackModalProps) {
  const config = statusConfig[status];

  const defaultMessages = {
    loading: 'Por favor espere...',
    success: 'El mantenimiento se ha sincronizado correctamente.',
    error:
      'Hubo un problema al subir los datos. Los datos están guardados localmente y se reintentará.',
    offline:
      'Sin conexión a internet. Los datos se sincronizarán automáticamente cuando vuelva la conexión.',
  };

  const displayMessage = message || defaultMessages[status];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={status !== 'loading' ? onClose : undefined}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon or Loading */}
          <View
            style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
            {status === 'loading' ? (
              <ActivityIndicator size="large" color={config.color} />
            ) : (
              <Ionicons name={config.icon!} size={48} color={config.color} />
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{config.title}</Text>

          {/* Message */}
          <Text style={styles.message}>{displayMessage}</Text>

          {/* Buttons */}
          {status !== 'loading' && (
            <View style={styles.buttonContainer}>
              {status === 'error' && onRetry && (
                <TouchableOpacity
                  style={[styles.button, styles.retryButton]}
                  onPress={onRetry}>
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.closeButton,
                  status === 'error' && onRetry && styles.secondaryButton,
                ]}
                onPress={onClose}>
                <Text
                  style={[
                    styles.closeButtonText,
                    status === 'error' && onRetry && styles.secondaryButtonText,
                  ]}>
                  {status === 'success'
                    ? 'Continuar'
                    : status === 'error'
                      ? 'Cerrar'
                      : 'Entendido'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  closeButton: {
    backgroundColor: '#06B6D4',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#EF4444',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    color: '#374151',
  },
});
