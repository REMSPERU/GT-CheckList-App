import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type {
  BaseEquipment,
  EquipmentHistoryAction,
  EquipmentHistoryEntry,
} from '@/types/api';

const HISTORY_ACTION_LABELS: Record<EquipmentHistoryAction, string> = {
  INSERT: 'Creado',
  UPDATE: 'Actualizado',
  SOFT_DELETE: 'Desactivado',
  RESTORE: 'Restaurado',
};

function formatHistoryDate(value: string) {
  try {
    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function toFieldLabel(field: string) {
  const labels: Record<string, string> = {
    codigo: 'Codigo',
    ubicacion: 'Ubicacion',
    detalle_ubicacion: 'Detalle ubicacion',
    estatus: 'Estatus',
    config: 'Configuracion',
    equipment_detail: 'Marca/Modelo',
    id_property: 'Propiedad',
    id_equipamento: 'Tipo equipo',
  };

  return labels[field] || field;
}

export interface EmergencyLightFormData {
  codigo: string;
  ubicacion: string;
  detalle_ubicacion: string;
  marca: string;
  modelo: string;
  config?: boolean;
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
  historyItems?: EquipmentHistoryEntry[];
  isHistoryLoading?: boolean;
}

export function EmergencyLightModal({
  visible,
  onClose,
  onSave,
  editItem,
  initialCode = '',
  isLoading = false,
  historyItems = [],
  isHistoryLoading = false,
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
      config: editItem ? editItem.config : true,
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

            {!!editItem && (
              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>Ultimos cambios</Text>

                {isHistoryLoading ? (
                  <Text style={styles.historyMeta}>Cargando historial...</Text>
                ) : historyItems.length === 0 ? (
                  <Text style={styles.historyMeta}>
                    Aun no hay cambios registrados.
                  </Text>
                ) : (
                  historyItems.map(item => (
                    <View key={item.id} style={styles.historyItem}>
                      <Text style={styles.historyItemTitle}>
                        v{item.version} -{' '}
                        {HISTORY_ACTION_LABELS[item.accion] || item.accion}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {formatHistoryDate(item.changed_at)}
                      </Text>
                      <Text style={styles.historyFields}>
                        {item.changed_fields.map(toFieldLabel).join(' · ') ||
                          'Sin detalle de campos'}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
              onPress={handleClose}
              accessibilityRole="button">
              <Text style={styles.cancelText}>
                {isViewMode ? 'Cerrar' : 'Cancelar'}
              </Text>
            </Pressable>

            {isViewMode ? (
              <Pressable
                style={({ pressed }) => [
                  styles.editButton,
                  pressed && styles.pressed,
                ]}
                onPress={handleEnableEdit}
                accessibilityRole="button">
                <Text style={styles.editText}>Editar</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  isLoading && styles.disabledButton,
                  pressed && styles.pressed,
                ]}
                onPress={handleSave}
                disabled={isLoading}
                accessibilityRole="button">
                <Text style={styles.saveText}>
                  {isLoading
                    ? 'Guardando...'
                    : isCreateMode
                      ? 'Crear'
                      : 'Guardar'}
                </Text>
              </Pressable>
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
  historySection: {
    marginTop: 4,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 14,
    gap: 10,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  historyItem: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  historyItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  historyMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyFields: {
    fontSize: 12,
    color: '#374151',
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
  pressed: {
    opacity: 0.84,
  },
});
