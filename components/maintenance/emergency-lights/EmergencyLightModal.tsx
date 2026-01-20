import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { BaseEquipment } from '@/types/api';

export interface EmergencyLightFormData {
  codigo: string;
  ubicacion: string;
  detalle_ubicacion: string;
}

export interface EmergencyLightModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: EmergencyLightFormData) => Promise<void>;
  /** If provided, modal is in edit mode */
  editItem?: BaseEquipment | null;
  /** Initial code for create mode */
  initialCode?: string;
  isLoading?: boolean;
}

export function EmergencyLightModal({
  visible,
  onClose,
  onSave,
  editItem,
  initialCode = '',
  isLoading = false,
}: EmergencyLightModalProps) {
  const [codigo, setCodigo] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [detalleUbicacion, setDetalleUbicacion] = useState('');

  const isEditMode = !!editItem;

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      if (editItem) {
        setCodigo(editItem.codigo || '');
        setUbicacion(editItem.ubicacion || '');
        setDetalleUbicacion(editItem.detalle_ubicacion || '');
      } else {
        setCodigo(initialCode);
        setUbicacion('');
        setDetalleUbicacion('');
      }
    }
  }, [visible, editItem, initialCode]);

  const handleSave = async () => {
    await onSave({ codigo, ubicacion, detalle_ubicacion: detalleUbicacion });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {isEditMode
              ? 'Editar Luz de Emergencia'
              : 'Nueva Luz de Emergencia'}
          </Text>

          <Text style={styles.label}>Código</Text>
          <TextInput
            style={styles.input}
            value={codigo}
            onChangeText={setCodigo}
            placeholder="LE-001"
            placeholderTextColor="#9CA3AF"
            editable={!isEditMode} // Code usually not editable in edit mode
          />

          <Text style={styles.label}>Ubicación</Text>
          <TextInput
            style={styles.input}
            value={ubicacion}
            onChangeText={setUbicacion}
            placeholder="Ej: Piso 1"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Detalle Ubicación</Text>
          <TextInput
            style={styles.input}
            value={detalleUbicacion}
            onChangeText={setDetalleUbicacion}
            placeholder="Ej: Pasillo A, junto a escalera"
            placeholderTextColor="#9CA3AF"
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.disabledButton]}
              onPress={handleSave}
              disabled={isLoading}>
              <Text style={styles.saveText}>
                {isLoading ? 'Guardando...' : isEditMode ? 'Guardar' : 'Crear'}
              </Text>
            </TouchableOpacity>
          </View>
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
    padding: 20,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#0891B2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
});
