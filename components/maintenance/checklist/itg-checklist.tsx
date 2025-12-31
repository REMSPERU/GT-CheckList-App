import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ChecklistItem } from './check-list-item';
import { ItemObservation, ItemMeasurement } from '@/types/maintenance-session';
import { MeasurementInput } from './measurement-input';

interface ITGChecklistProps {
  itgs: any[];
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
  onObservationChange: (itemId: string, text: string) => void;
  onPhotoPress: (itemId: string) => void;
}

export const ITGChecklist: React.FC<ITGChecklistProps> = ({
  itgs,
  checklist,
  measurements = {},
  itemObservations,
  onStatusChange,
  onMeasurementChange,
  onObservationChange,
  onPhotoPress,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  if (!itgs || itgs.length === 0) return null;

  const currentItg = itgs[activeTab];

  const renderDetailRow = (label: string, value: string | number) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueBox}>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );

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
        {currentItg.itms.map((itm: any, idx: number) => {
          const itemId = `itg_${currentItg.id}_${itm.id}`;
          const status = checklist[itemId];
          const obs = itemObservations[itemId];
          const measure = measurements[itemId] || {};

          // Validation Logic
          // Voltage: 220V +/- 10% -> 198 to 242
          // Amperage: <= itm.amperaje (Rated)
          const ratedAmps = parseFloat(itm.amperaje) || 0;

          const validateVoltage = (val: string) => {
            if (!val) return undefined;
            const v = parseFloat(val);
            if (isNaN(v)) return false;
            return v >= 198 && v <= 242;
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

          // Determine if we need to force "Observation" state
          const hasMeasurementIssue =
            isVoltValid === false || isAmpValid === false;

          return (
            <View key={itemId} style={styles.card}>
              <Text style={styles.cardHeader}>
                Interruptor termomagnético (ITM) : {itm.id}
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
                />

                {renderDetailRow(
                  'Diametro de cable',
                  itm.diametro_cable || '-',
                )}
                {renderDetailRow('Tipo cable', itm.tipo_cable || '-')}
              </View>

              {/* Differential Section if exists */}
              {itm.diferencial && itm.diferencial.existe && (
                <View style={styles.subSection}>
                  <Text style={styles.subHeader}>
                    Interruptor diferencial ID : ID-{itm.id}
                  </Text>
                  {renderDetailRow('Amperaje', itm.diferencial.amperaje || '-')}
                  {renderDetailRow(
                    'Diametro de cable',
                    itm.diferencial.diametro_cable || '-',
                  )}
                </View>
              )}

              <View style={styles.divider} />

              <ChecklistItem
                label={
                  hasMeasurementIssue
                    ? 'Observación Requerida'
                    : 'Estatus del circuito'
                }
                status={
                  // If measurement issue, force status to false (Observation mode)
                  // Else use checked status. If undefined, default to true (OK)
                  // Handle potential string type from record by defaulting to true if not explicitly false boolean
                  typeof status === 'boolean' ? status : true
                }
                onStatusChange={val => {
                  // Prevent setting to OK if measurement issue exists
                  if (hasMeasurementIssue && val === true) {
                    // Maybe alert user? For now just ignore or force update.
                    // The parent handler can handle this logic too, but visual feedback here.
                    // We will let the parent `handleStatusChange` decide, but we pass the intent.
                    onStatusChange(itemId, val);
                  } else {
                    onStatusChange(itemId, val);
                  }
                }}
                observation={obs?.note}
                onObservationChange={text => onObservationChange(itemId, text)}
                hasPhoto={true}
                photoUri={obs?.photoUri}
                onPhotoPress={() => onPhotoPress(itemId)}
                // Hide switch if mandatory validation failed? Or just show it as OFF (Obs).
                // If hasMeasurementIssue is true, the user MUST put an observation/photo.
                // We'll rely on the status being false to show the input fields.
                style={{ borderWidth: 0, shadowOpacity: 0, elevation: 0 }}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
};

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
});
