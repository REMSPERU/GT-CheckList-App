import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { BaseEquipment } from '@/types/api';

export interface GroundingWellModalProps {
  visible: boolean;
  onClose: () => void;
  /** Item to view */
  item?: BaseEquipment | null;
}

export function GroundingWellModal({
  visible,
  onClose,
  item,
}: GroundingWellModalProps) {
  const [codigo, setCodigo] = useState('');
  const [ubicacion, setUbicacion] = useState('');

  // Specific fields for Grounding Well
  const [numero, setNumero] = useState<string | number>('');
  const [grupo, setGrupo] = useState('');
  const [denominacion, setDenominacion] = useState('');
  const [detalleTecnico, setDetalleTecnico] = useState<Record<string, any>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (visible && item) {
      setCodigo(item.codigo || '');
      setUbicacion(item.ubicacion || '');

      // Parse equipment_detail
      let equipmentDetail: any = null;
      if (item.equipment_detail) {
        if (typeof item.equipment_detail === 'string') {
          try {
            equipmentDetail = JSON.parse(item.equipment_detail);
          } catch (e) {
            console.error('Error parsing equipment_detail:', e);
          }
        } else {
          equipmentDetail = item.equipment_detail;
        }
      }

      setNumero(equipmentDetail?.numero ?? '-');
      setGrupo(equipmentDetail?.grupo ?? '');
      setDenominacion(equipmentDetail?.denominacion ?? '');
      setDetalleTecnico(equipmentDetail?.detalle_tecnico || {});
    }
  }, [visible, item]);

  const renderField = (label: string, value: string | number) => {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.viewValue}>
          <Text style={styles.viewValueText}>{value || '-'}</Text>
        </View>
      </View>
    );
  };

  const renderTechnicalDetail = () => {
    if (!detalleTecnico || Object.keys(detalleTecnico).length === 0) {
      return null;
    }

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Detalle Técnico</Text>
        <View style={styles.technicalGrid}>
          {Object.entries(detalleTecnico).map(([key, value]) => (
            <View key={key} style={styles.technicalItem}>
              <Text style={styles.technicalLabel}>
                {key.replace(/_/g, ' ').toUpperCase()}
              </Text>
              <Text style={styles.technicalValue}>{String(value)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Detalle Pozo a Tierra</Text>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {renderField('Código', codigo)}
            {renderField('Ubicación', ubicacion)}
            {/* {renderField('Detalle Ubicación', detalleUbicacion)} */}

            <View style={styles.divider} />

            {renderField('Número', numero)}
            {renderField('Grupo', grupo)}
            {renderField('Denominación', denominacion)}

            {renderTechnicalDetail()}
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Cerrar</Text>
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
    marginTop: 16,
  },
  closeButton: {
    backgroundColor: '#0891B2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  closeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  sectionContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  technicalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  technicalItem: {
    width: '48%',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  technicalLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  technicalValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
});
