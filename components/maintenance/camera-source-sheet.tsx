import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.content}>
          <Text style={styles.title}>Seleccionar origen</Text>

          <TouchableOpacity style={styles.option} onPress={onTakePhoto}>
            <Ionicons name="camera" size={24} color="#06B6D4" />
            <Text style={styles.optionText}>Tomar Foto</Text>
          </TouchableOpacity>

          {showGallery && onPickFromGallery ? (
            <TouchableOpacity style={styles.option} onPress={onPickFromGallery}>
              <Ionicons name="images" size={24} color="#06B6D4" />
              <Text style={styles.optionText}>Elegir de Galeria</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
});
