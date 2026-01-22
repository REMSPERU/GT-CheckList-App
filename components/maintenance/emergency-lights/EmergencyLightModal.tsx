import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { BaseEquipment } from '@/types/api';

export interface EmergencyLightFormData {
  codigo: string;
  ubicacion: string;
  detalle_ubicacion: string;
  marca: string;
  modelo: string;
}

export interface EmergencyLightModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: EmergencyLightFormData) => Promise<void>;
  /** If provided, modal starts in view mode */
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
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');

  // View mode: when we have an editItem, start in view mode (not editing)
  const [isEditing, setIsEditing] = useState(false);

  const isViewMode = !!editItem && !isEditing;
  const isCreateMode = !editItem;

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      if (editItem) {
        setCodigo(editItem.codigo || '');
        setUbicacion(editItem.ubicacion || '');
        setDetalleUbicacion(editItem.detalle_ubicacion || '');

        // Parse equipment_detail for marca and modelo
        let equipmentDetail: any = null;
        if (editItem.equipment_detail) {
          if (typeof editItem.equipment_detail === 'string') {
            try {
              equipmentDetail = JSON.parse(editItem.equipment_detail);
            } catch (e) {
              console.error('Error parsing equipment_detail:', e);
            }
          } else {
            equipmentDetail = editItem.equipment_detail;
          }
        }
        setMarca(equipmentDetail?.marca || '');
        setModelo(equipmentDetail?.modelo || '');
        setIsEditing(false); // Start in view mode for existing items
      } else {
        // Create mode
        setCodigo(initialCode);
        setUbicacion('');
        setDetalleUbicacion('');
        setMarca('');
        setModelo('');
        setIsEditing(true); // Create mode is always editable
      }
    }
  }, [visible, editItem, initialCode]);

  const handleSave = async () => {
    await onSave({
      codigo,
      ubicacion,
      detalle_ubicacion: detalleUbicacion,
      marca,
      modelo,
    });
    setIsEditing(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const handleEnableEdit = () => {
    setIsEditing(true);
  };

  const renderField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    editable: boolean = true,
  ) => {
    const isFieldEditable = !isViewMode && editable;

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        {isViewMode ? (
          <View style={styles.viewValue}>
            <Text style={styles.viewValueText}>{value || '-'}</Text>
          </View>
        ) : (
          <TextInput
            style={[styles.input, !isFieldEditable && styles.inputDisabled]}
            value={value}
            onChangeText={text => onChangeText(text.toUpperCase())}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            editable={isFieldEditable}
            autoCapitalize="characters"
          />
        )}
      </View>
    );
  };

  const getTitle = () => {
    if (isCreateMode) return 'Nueva Luz de Emergencia';
    if (isViewMode) return 'Detalle Luz de Emergencia';
    return 'Editar Luz de Emergencia';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{getTitle()}</Text>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {renderField('Código', codigo, setCodigo, 'LE-001', isCreateMode)}
            {renderField('Ubicación', ubicacion, setUbicacion, 'Ej: Piso 1')}
            {renderField(
              'Detalle Ubicación',
              detalleUbicacion,
              setDetalleUbicacion,
              'Ej: Pasillo A, junto a escalera',
            )}
            {renderField('Marca', marca, setMarca, 'Ej: Philips')}
            {renderField('Modelo', modelo, setModelo, 'Ej: LED-2000')}
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>
                {isViewMode ? 'Cerrar' : 'Cancelar'}
              </Text>
            </TouchableOpacity>

            {isViewMode ? (
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEnableEdit}>
                <Text style={styles.editText}>Editar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.disabledButton]}
                onPress={handleSave}
                disabled={isLoading}>
                <Text style={styles.saveText}>
                  {isLoading
                    ? 'Guardando...'
                    : isCreateMode
                      ? 'Crear'
                      : 'Guardar'}
                </Text>
              </TouchableOpacity>
            )}
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
    maxHeight: '80%',
  },
  scrollContent: {
    flexGrow: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: 16,
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
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  viewValue: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewValueText: {
    fontSize: 16,
    color: '#1F2937',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
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
  editButton: {
    backgroundColor: '#0891B2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  editText: {
    color: 'white',
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
