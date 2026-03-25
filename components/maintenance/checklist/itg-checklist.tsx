import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { ChecklistItem } from './check-list-item';
import { ItemObservation, ItemMeasurement } from '@/types/maintenance-session';
import { MeasurementInput } from './measurement-input';
import { CableTypePicker } from './cable-type-picker';
import type { ITG, ITM } from '@/types/api';

interface ITGChecklistProps {
  itgs: ITG[];
  checklist: Record<string, boolean | string>;
  measurements?: Record<string, ItemMeasurement>;
  itemObservations: Record<string, ItemObservation>;
  onStatusChange: (itemId: string, status: boolean) => void;
  onMeasurementChange: (
    itemId: string,
    field: 'voltage' | 'amperage',
    value: string,
    isValid: boolean,
  ) => void;
  onMeasurementStatusChange: (
    itemId: string,
    field: 'voltage' | 'amperage' | 'cableDiameter',
    status: boolean,
  ) => void;
  onCableChange: (
    itemId: string,
    field: 'cableDiameter' | 'cableType',
    value: string,
    originalValue: string,
  ) => void;
  onObservationChange: (itemId: string, text: string) => void;
  onPhotoPress: (itemId: string) => void;
  configuredVoltage?: number;
  validationErrors?: Record<string, string[]>;
}

export const ITGChecklist = React.memo(function ITGChecklist({
  itgs,
  checklist,
  measurements = {},
  itemObservations,
  onStatusChange,
  onMeasurementChange,
  onMeasurementStatusChange,
  onCableChange,
  onObservationChange,
  onPhotoPress,
  configuredVoltage = 220,
  validationErrors = {},
}: ITGChecklistProps) {
  const [activeTab, setActiveTab] = useState(0);

  const normalizeCableType = (value?: string) => {
    if (!value) return '';

    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');

    if (normalized.includes('no_libre') && normalized.includes('halogeno')) {
      return 'no_libre_halogeno';
    }
    if (normalized.includes('libre') && normalized.includes('halogeno')) {
      return 'libre_halogeno';
    }

    return normalized;
  };

  const hasCableTypeMismatch = (
    measurement: ItemMeasurement,
    referenceCableType?: string,
  ) => {
    const currentCableType =
      normalizeCableType(measurement.cableType) || measurement.cableType || '';
    const originalCableType =
      normalizeCableType(measurement.originalCableType || referenceCableType) ||
      measurement.originalCableType ||
      referenceCableType ||
      '';

    return (
      currentCableType.length > 0 &&
      originalCableType.length > 0 &&
      currentCableType !== originalCableType
    );
  };

  if (!itgs || itgs.length === 0) return null;

  const currentItg = itgs[activeTab];

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}>
        {itgs.map((itg, index) => (
          <TouchableOpacity
            key={`tab_${index}`}
            style={[styles.tab, activeTab === index && styles.activeTab]}
            onPress={() => setActiveTab(index)}>
            <Text
              style={[
                styles.tabText,
                activeTab === index && styles.activeTabText,
              ]}>
              {itg.id ? `ITG-${itg.id}` : `ITG-${index + 1}`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <View style={styles.content}>
        {currentItg.itms.map((itm: ITM) => {
          const itemId = `itg_${currentItg.id}_${itm.id}`;
          const itmLabel = itm.nombre || itm.id;
          const status = checklist[itemId];
          const obs = itemObservations[itemId];
          const measure = measurements[itemId] || {};
          const differential = itm.diferencial;

          // Validation Logic
          // Voltage: configuredVoltage +/- 10
          // Amperage: <= itm.amperaje (Rated)
          const ratedAmps = Number(itm.amperaje) || 0;

          const validateVoltage = (val: string) => {
            if (!val) return undefined;
            const v = parseFloat(val);
            if (isNaN(v)) return false;
            const min = configuredVoltage - 10;
            const max = configuredVoltage + 10;
            return v >= min && v <= max;
          };

          const validateAmperage = (val: string) => {
            if (!val) return undefined;
            const a = parseFloat(val);
            if (isNaN(a)) return false;
            return ratedAmps > 0 ? a <= ratedAmps : true;
          };

          const isVoltValid = measure.voltage
            ? validateVoltage(measure.voltage)
            : undefined;
          const isAmpValid = measure.amperage
            ? validateAmperage(measure.amperage)
            : undefined;
          const voltageStatus =
            measure.isVoltageInRange ?? (isVoltValid === false ? false : true);
          const amperageStatus =
            measure.isAmperageInRange ?? (isAmpValid === false ? false : true);
          const cableDiameterStatus = measure.isCableDiameterInRange ?? true;
          const hasCableTypeIssue = hasCableTypeMismatch(
            measure,
            itm.tipo_cable,
          );

          // Differential validation (calculate outside IIFE so it can be used in hasMeasurementIssue)
          const diffId = `diff_itg_${currentItg.id}_${itm.id}`;
          const diffMeasure = measurements[diffId] || {};
          const diffRatedAmps = Number(differential?.amperaje) || 0;
          const testId = `test_itg_${currentItg.id}_${itm.id}`;
          const testStatus = checklist[testId];
          const testObs = itemObservations[testId];

          const validateDiffAmperage = (val: string) => {
            if (!val) return undefined;
            const a = parseFloat(val);
            if (isNaN(a)) return false;
            return diffRatedAmps > 0 ? a <= diffRatedAmps : true;
          };

          const isDiffVoltValid = diffMeasure.voltage
            ? validateVoltage(diffMeasure.voltage)
            : undefined;
          const isDiffAmpValid = diffMeasure.amperage
            ? validateDiffAmperage(diffMeasure.amperage)
            : undefined;
          const diffVoltageStatus =
            diffMeasure.isVoltageInRange ??
            (isDiffVoltValid === false ? false : true);
          const diffAmperageStatus =
            diffMeasure.isAmperageInRange ??
            (isDiffAmpValid === false ? false : true);
          const diffCableDiameterStatus =
            diffMeasure.isCableDiameterInRange ?? true;
          const hasDiffCableTypeIssue = hasCableTypeMismatch(
            diffMeasure,
            differential?.tipo_cable,
          );

          // Check if differential has measurement issues
          const hasDiffMeasurementIssue = Boolean(
            differential?.existe &&
            (diffVoltageStatus === false ||
              diffAmperageStatus === false ||
              diffCableDiameterStatus === false ||
              hasDiffCableTypeIssue),
          );

          // Determine if we need to force "Observation" state
          // Now includes both ITM and Differential measurement issues
          const hasMeasurementIssue =
            voltageStatus === false ||
            amperageStatus === false ||
            cableDiameterStatus === false ||
            hasCableTypeIssue ||
            hasDiffMeasurementIssue;
          const hasObservationError =
            validationErrors[itemId]?.includes('observation');

          return (
            <View key={itemId} style={styles.card}>
              <Text style={styles.cardHeader}>
                Interruptor termomagnético (ITM) : {itmLabel}
              </Text>

              <View style={styles.detailsContainer}>
                {/* Inputs for Voltage and Amperage */}
                <MeasurementInput
                  label="Voltaje (V)"
                  value={measure.voltage || ''}
                  onChange={val =>
                    onMeasurementChange(
                      itemId,
                      'voltage',
                      val,
                      validateVoltage(val) === true,
                    )
                  }
                  unit="V"
                  isValid={isVoltValid}
                  placeholder="220"
                  showIncomplete={validationErrors[itemId]?.includes('voltage')}
                  errorMessage={
                    validationErrors[itemId]?.includes('voltage')
                      ? 'Requerido'
                      : undefined
                  }
                  statusValue={voltageStatus}
                  onStatusChange={value =>
                    onMeasurementStatusChange(itemId, 'voltage', value)
                  }
                />

                <MeasurementInput
                  label={`Amperaje (Max ${itm.amperaje || '-'} A)`}
                  value={measure.amperage || ''}
                  onChange={val =>
                    onMeasurementChange(
                      itemId,
                      'amperage',
                      val,
                      validateAmperage(val) === true,
                    )
                  }
                  unit="A"
                  isValid={isAmpValid}
                  placeholder="0.0"
                  showIncomplete={validationErrors[itemId]?.includes(
                    'amperage',
                  )}
                  errorMessage={
                    validationErrors[itemId]?.includes('amperage')
                      ? 'Requerido'
                      : undefined
                  }
                  statusValue={amperageStatus}
                  onStatusChange={value =>
                    onMeasurementStatusChange(itemId, 'amperage', value)
                  }
                />

                {/* Editable Cable fields */}
                <MeasurementInput
                  label={`Diámetro de cable (Ref: ${itm.diametro_cable || '-'})`}
                  value={measure.cableDiameter || ''}
                  onChange={val =>
                    onCableChange(
                      itemId,
                      'cableDiameter',
                      val,
                      itm.diametro_cable || '',
                    )
                  }
                  placeholder={itm.diametro_cable || 'Ej: 2.5mm'}
                  keyboardType="default"
                  showIncomplete={validationErrors[itemId]?.includes(
                    'cableDiameter',
                  )}
                  errorMessage={
                    validationErrors[itemId]?.includes('cableDiameter')
                      ? 'Requerido'
                      : undefined
                  }
                  statusValue={cableDiameterStatus}
                  onStatusChange={value =>
                    onMeasurementStatusChange(itemId, 'cableDiameter', value)
                  }
                />

                <CableTypePicker
                  label={`Tipo de cable (Ref: ${itm.tipo_cable})`}
                  value={measure.cableType || ''}
                  onChange={val =>
                    onCableChange(
                      itemId,
                      'cableType',
                      val,
                      itm.tipo_cable || '',
                    )
                  }
                  showIncomplete={validationErrors[itemId]?.includes(
                    'cableType',
                  )}
                  errorMessage={
                    validationErrors[itemId]?.includes('cableType')
                      ? 'Requerido'
                      : undefined
                  }
                />
              </View>

              {/* Differential Section if exists */}
              {differential?.existe && (
                <View style={styles.subSection}>
                  <Text style={styles.subHeader}>
                    Interruptor diferencial ID : ID-{itmLabel}
                  </Text>

                  <View style={styles.subSectionContent}>
                    <MeasurementInput
                      label="Voltaje Diferencial (V)"
                      value={diffMeasure.voltage || ''}
                      onChange={val =>
                        onMeasurementChange(
                          diffId,
                          'voltage',
                          val,
                          validateVoltage(val) === true,
                        )
                      }
                      unit="V"
                      isValid={isDiffVoltValid}
                      placeholder={`${configuredVoltage}`}
                      showIncomplete={validationErrors[diffId]?.includes(
                        'voltage',
                      )}
                      errorMessage={
                        validationErrors[diffId]?.includes('voltage')
                          ? 'Requerido'
                          : undefined
                      }
                      statusValue={diffVoltageStatus}
                      onStatusChange={value =>
                        onMeasurementStatusChange(diffId, 'voltage', value)
                      }
                    />

                    <MeasurementInput
                      label={`Amperaje Diferencial (Max ${differential.amperaje || '-'} A)`}
                      value={diffMeasure.amperage || ''}
                      onChange={val =>
                        onMeasurementChange(
                          diffId,
                          'amperage',
                          val,
                          validateDiffAmperage(val) === true,
                        )
                      }
                      unit="A"
                      isValid={isDiffAmpValid}
                      placeholder="0.0"
                      showIncomplete={validationErrors[diffId]?.includes(
                        'amperage',
                      )}
                      errorMessage={
                        validationErrors[diffId]?.includes('amperage')
                          ? 'Requerido'
                          : undefined
                      }
                      statusValue={diffAmperageStatus}
                      onStatusChange={value =>
                        onMeasurementStatusChange(diffId, 'amperage', value)
                      }
                    />

                    {/* Editable Differential Cable fields */}
                    <MeasurementInput
                      label={`Diámetro de cable (Ref: ${differential.diametro_cable || '-'})`}
                      value={diffMeasure.cableDiameter || ''}
                      onChange={val =>
                        onCableChange(
                          diffId,
                          'cableDiameter',
                          val,
                          differential.diametro_cable || '',
                        )
                      }
                      placeholder={differential.diametro_cable || 'Ej: 2.5mm'}
                      keyboardType="default"
                      showIncomplete={validationErrors[diffId]?.includes(
                        'cableDiameter',
                      )}
                      errorMessage={
                        validationErrors[diffId]?.includes('cableDiameter')
                          ? 'Requerido'
                          : undefined
                      }
                      statusValue={diffCableDiameterStatus}
                      onStatusChange={value =>
                        onMeasurementStatusChange(
                          diffId,
                          'cableDiameter',
                          value,
                        )
                      }
                    />

                    <CableTypePicker
                      label={`Tipo de cable (Ref: ${differential.tipo_cable === 'libre_halogeno' ? 'Libre Halógeno' : differential.tipo_cable === 'no_libre_halogeno' ? 'No Libre Halógeno' : '-'})`}
                      value={diffMeasure.cableType || ''}
                      onChange={val =>
                        onCableChange(
                          diffId,
                          'cableType',
                          val,
                          differential.tipo_cable || '',
                        )
                      }
                      showIncomplete={validationErrors[diffId]?.includes(
                        'cableType',
                      )}
                      errorMessage={
                        validationErrors[diffId]?.includes('cableType')
                          ? 'Requerido'
                          : undefined
                      }
                    />

                    <ChecklistItem
                      label="Prueba Test"
                      status={
                        typeof testStatus === 'boolean' ? testStatus : true
                      }
                      onStatusChange={val => onStatusChange(testId, val)}
                      observation={testObs?.note}
                      onObservationChange={text =>
                        onObservationChange(testId, text)
                      }
                      hasPhoto={true}
                      photoUri={testObs?.photoUri}
                      photoUris={testObs?.photoUris}
                      onPhotoPress={() => onPhotoPress(testId)}
                      style={styles.flatChecklistItem}
                    />
                  </View>
                </View>
              )}

              <View style={styles.divider} />

              {(hasMeasurementIssue || status === false) && (
                <View
                  style={[
                    styles.observationCard,
                    hasObservationError && styles.observationCardError,
                  ]}>
                  <Text style={styles.observationTitle}>Observación</Text>
                  <TextInput
                    style={styles.observationInput}
                    placeholder="Ingrese observación"
                    value={obs?.note || ''}
                    onChangeText={text => onObservationChange(itemId, text)}
                    multiline
                    textAlignVertical="top"
                  />

                  <View style={styles.observationPhotoRow}>
                    {obs?.photoUri ? (
                      <Image
                        source={{ uri: obs.photoUri }}
                        style={styles.observationPhoto}
                      />
                    ) : null}
                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={() => onPhotoPress(itemId)}>
                      <Text style={styles.photoButtonText}>
                        {obs?.photoUri
                          ? 'Cambiar o eliminar foto'
                          : 'Agregar foto'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {hasObservationError && (
                    <Text style={styles.observationErrorText}>
                      Debe ingresar observación.
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabsContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    minWidth: 80,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#0891B2',
    borderColor: '#0891B2',
  },
  tabText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#11181C',
    marginBottom: 16,
  },
  subSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  subHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#11181C',
    marginBottom: 12,
  },
  subSectionContent: {
    marginTop: 12,
    gap: 12,
  },
  detailsContainer: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  detailValueBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  detailValue: {
    fontSize: 14,
    color: '#11181C',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  observationCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  observationCardError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  observationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
  },
  observationInput: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: '#11181C',
  },
  observationPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  observationPhoto: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  photoButton: {
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  photoButtonText: {
    color: '#0369A1',
    fontSize: 13,
    fontWeight: '600',
  },
  observationErrorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '500',
  },
  flatChecklistItem: {
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
});
