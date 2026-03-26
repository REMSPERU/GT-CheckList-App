import React from 'react';
import { Modal, StyleSheet, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CameraSourceSheetProps {
  visible: boolean;
  onTakePhoto: () => void;
  onClose: () => void;
  showGallery?: boolean;
  onPickFromGallery?: () => void;
}

export function CameraSourceSheet({
  visible,
  onTakePhoto,
  onClose,
  showGallery = false,
  onPickFromGallery,
}: CameraSourceSheetProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.content}>
          <Text style={styles.title}>Seleccionar origen</Text>

          <Pressable
            style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            onPress={onTakePhoto}
            accessibilityRole="button">
            <Ionicons name="camera" size={24} color="#06B6D4" />
            <Text style={styles.optionText}>Tomar Foto</Text>
          </Pressable>

          {showGallery && onPickFromGallery ? (
            <Pressable
              style={({ pressed }) => [
                styles.option,
                pressed && styles.pressed,
              ]}
              onPress={onPickFromGallery}
              accessibilityRole="button">
              <Ionicons name="images" size={24} color="#06B6D4" />
              <Text style={styles.optionText}>Elegir de Galeria</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed && styles.pressed,
            ]}
            onPress={onClose}
            accessibilityRole="button">
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
    textAlign: 'center',
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  cancelBtn: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  pressed: {
    opacity: 0.84,
  },
});
