import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
} from 'react-native';
import { ItemObservation, ItemMeasurement } from '@/types/maintenance-session';
import { MeasurementInput } from './measurement-input';
import { CableTypePicker } from './cable-type-picker';
import type { ITG, ITM } from '@/types/api';

interface ITGChecklistProps {
  itgs: ITG[];
  checklist: Record<string, boolean>;
  measurements?: Record<string, ItemMeasurement>;
  itemObservations: Record<string, ItemObservation>;
  onStatusChange: (itemId: string, status: boolean) => void;
  onMeasurementChange: (
    itemId: string,
    field: 'voltage' | 'amperage',
    value: string,
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

const ObservationCard = React.memo(function ObservationCard({
  obsId,
  title,
  reportText,
  photoUri,
  onObservationChange,
  onPhotoPress,
}: {
  obsId: string;
  title: string;
  reportText: string;
  photoUri?: string;
  onObservationChange: (itemId: string, text: string) => void;
  onPhotoPress: (itemId: string) => void;
}) {
  useEffect(() => {
    onObservationChange(obsId, reportText);
  }, [obsId, onObservationChange, reportText]);

  return (
    <View style={styles.observationCard}>
      <Text style={styles.observationTitle}>{title}</Text>
      <View style={styles.reportTextBox}>
        <Text style={styles.reportTextLabel}>Texto del informe:</Text>
        <Text style={styles.reportText}>{reportText}</Text>
      </View>

      <View style={styles.observationPhotoRow}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.observationPhoto}
            contentFit="cover"
            transition={100}
          />
        ) : null}
        <Pressable
          style={({ pressed }) => [
            styles.photoButton,
            pressed && styles.pressed,
          ]}
          onPress={() => onPhotoPress(obsId)}
          accessibilityRole="button">
          <Text style={styles.photoButtonText}>
            {photoUri ? 'Cambiar o eliminar foto' : 'Agregar foto (opcional)'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const ITMCard = React.memo(
  function ITMCard({
    itm,
    currentItgId,
    checklist,
    measurements = {},
    itemObservations,
    validationErrors = {},
    configuredVoltage,
    onStatusChange,
    onMeasurementChange,
    onMeasurementStatusChange,
    onCableChange,
    onObservationChange,
    onPhotoPress,
  }: {
    itm: ITM;
    currentItgId: string;
    checklist: Record<string, boolean>;
    measurements?: Record<string, ItemMeasurement>;
    itemObservations: Record<string, ItemObservation>;
    validationErrors?: Record<string, string[]>;
    configuredVoltage: number;
    onStatusChange: (itemId: string, status: boolean) => void;
    onMeasurementChange: (
      itemId: string,
      field: 'voltage' | 'amperage',
      value: string,
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
  }) {
    const DEFAULT_OBSERVATIONS = {
      voltage: 'Voltaje fuera de rango',
      amperage: 'No conforme (no coincide con diseno)',
      cableDiameter: 'Diametro de cable no es el adecuado',
      test: 'No conforme (fallas en operacion o estado)',
      circuitIndependent: 'Cuenta con 2 o mas circuitos',
    } as const;

    const itemId = `itg_${currentItgId}_${itm.id}`;
    const circuitIndependentId = `circuit_independent_itg_${currentItgId}_${itm.id}`;
    const itmLabel = itm.nombre || itm.id;
    const measure = measurements[itemId] || {};
    const differential = itm.diferencial;
    const isCircuitIndependentOk = checklist[circuitIndependentId] !== false;

    const voltageStatus = measure.isVoltageInRange ?? true;
    const amperageStatus = measure.isAmperageInRange ?? true;
    const cableDiameterStatus = measure.isCableDiameterInRange ?? true;

    const diffId = `diff_itg_${currentItgId}_${itm.id}`;
    const testDiffId = `test_id_itg_${currentItgId}_${itm.id}`;
    const diffMeasure = measurements[diffId] || {};
    const testId = `test_itg_${currentItgId}_${itm.id}`;
    const testApplyId = `${testId}_applies`;
    const testResultId = `${testId}_result`;
    const isTestApplicable = checklist[testApplyId] === true;
    const isTestOk = checklist[testResultId] !== false;

    const diffVoltageStatus = diffMeasure.isVoltageInRange ?? true;
    const diffAmperageStatus = diffMeasure.isAmperageInRange ?? true;
    const diffCableDiameterStatus = diffMeasure.isCableDiameterInRange ?? true;

    const itmVoltageObsId = `${itemId}_voltage`;
    const itmAmperageObsId = `${itemId}_amperage`;
    const itmCableObsId = `${itemId}_cableDiameter`;
    const diffVoltageObsId = `${diffId}_voltage`;
    const diffAmperageObsId = `${diffId}_amperage`;
    const diffCableObsId = `${diffId}_cableDiameter`;
    const circuitIndependentObsId = `${circuitIndependentId}_obs`;
    const testDiffObsId = `${testDiffId}_obs`;

    const renderObservationCard = (
      obsId: string,
      title: string,
      reportText: string,
    ) => {
      const obs = itemObservations[obsId];

      return (
        <ObservationCard
          obsId={obsId}
          title={title}
          reportText={reportText}
          photoUri={obs?.photoUri}
          onObservationChange={onObservationChange}
          onPhotoPress={onPhotoPress}
        />
      );
    };

    return (
      <View style={styles.card}>
        <Text style={styles.cardHeader}>
          Interruptor termomagnético (ITM) : {itmLabel}
        </Text>

        <View style={styles.detailsContainer}>
          <MeasurementInput
            label="Voltaje (V)"
            value={measure.voltage || ''}
            onChange={val => onMeasurementChange(itemId, 'voltage', val)}
            unit="V"
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
          {voltageStatus === false &&
            renderObservationCard(
              itmVoltageObsId,
              'Observación voltaje ITM',
              DEFAULT_OBSERVATIONS.voltage,
            )}

          <MeasurementInput
            label={`Amperaje (Max ${itm.amperaje || '-'} A)`}
            value={measure.amperage || ''}
            onChange={val => onMeasurementChange(itemId, 'amperage', val)}
            unit="A"
            placeholder="0.0"
            showIncomplete={validationErrors[itemId]?.includes('amperage')}
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
          {amperageStatus === false &&
            renderObservationCard(
              itmAmperageObsId,
              'Observación amperaje ITM',
              DEFAULT_OBSERVATIONS.amperage,
            )}

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
            showIncomplete={validationErrors[itemId]?.includes('cableDiameter')}
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
          {cableDiameterStatus === false &&
            renderObservationCard(
              itmCableObsId,
              'Observación diámetro cable ITM',
              DEFAULT_OBSERVATIONS.cableDiameter,
            )}

          <CableTypePicker
            label={`Tipo de cable (Ref: ${itm.tipo_cable})`}
            value={measure.cableType || ''}
            onChange={val =>
              onCableChange(itemId, 'cableType', val, itm.tipo_cable || '')
            }
            showIncomplete={validationErrors[itemId]?.includes('cableType')}
            errorMessage={
              validationErrors[itemId]?.includes('cableType')
                ? 'Requerido'
                : undefined
            }
          />
        </View>

        {differential?.existe && (
          <View style={styles.subSection}>
            <Text style={styles.subHeader}>
              Interruptor diferencial ID : ID-{itmLabel}
            </Text>

            <View style={styles.subSectionContent}>
              <MeasurementInput
                label="Voltaje Diferencial (V)"
                value={diffMeasure.voltage || ''}
                onChange={val => onMeasurementChange(diffId, 'voltage', val)}
                unit="V"
                placeholder={`${configuredVoltage}`}
                showIncomplete={validationErrors[diffId]?.includes('voltage')}
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
              {diffVoltageStatus === false &&
                renderObservationCard(
                  diffVoltageObsId,
                  'Observación voltaje diferencial',
                  DEFAULT_OBSERVATIONS.voltage,
                )}

              <MeasurementInput
                label={`Amperaje Diferencial (Max ${differential.amperaje || '-'} A)`}
                value={diffMeasure.amperage || ''}
                onChange={val => onMeasurementChange(diffId, 'amperage', val)}
                unit="A"
                placeholder="0.0"
                showIncomplete={validationErrors[diffId]?.includes('amperage')}
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
              {diffAmperageStatus === false &&
                renderObservationCard(
                  diffAmperageObsId,
                  'Observación amperaje diferencial',
                  DEFAULT_OBSERVATIONS.amperage,
                )}

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
                  onMeasurementStatusChange(diffId, 'cableDiameter', value)
                }
              />
              {diffCableDiameterStatus === false &&
                renderObservationCard(
                  diffCableObsId,
                  'Observación diámetro cable diferencial',
                  DEFAULT_OBSERVATIONS.cableDiameter,
                )}

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
                showIncomplete={validationErrors[diffId]?.includes('cableType')}
                errorMessage={
                  validationErrors[diffId]?.includes('cableType')
                    ? 'Requerido'
                    : undefined
                }
              />

              <View style={styles.testBody}>
                <Text style={styles.testTitle}>Test - ID</Text>
                <View style={styles.resultToggleRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.resultButton,
                      checklist[testDiffId] !== false &&
                        styles.resultButtonOkActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => onStatusChange(testDiffId, true)}>
                    <Text
                      style={[
                        styles.resultButtonText,
                        checklist[testDiffId] !== false &&
                          styles.resultButtonTextActive,
                      ]}>
                      OK
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.resultButton,
                      checklist[testDiffId] === false &&
                        styles.resultButtonObsActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => onStatusChange(testDiffId, false)}>
                    <Text
                      style={[
                        styles.resultButtonText,
                        checklist[testDiffId] === false &&
                          styles.resultButtonTextActive,
                      ]}>
                      OBSERVADO
                    </Text>
                  </Pressable>
                </View>

                {checklist[testDiffId] === false &&
                  renderObservationCard(
                    testDiffObsId,
                    'Observación Test - ID',
                    DEFAULT_OBSERVATIONS.test,
                  )}
              </View>
            </View>
          </View>
        )}

        <View style={styles.testSection}>
          <View style={styles.testHeaderRow}>
            <Text style={styles.testTitle}>ITM - Test</Text>
            <View style={styles.testSwitchWrap}>
              <Text style={styles.testSwitchLabel}>
                {isTestApplicable ? 'Aplica' : 'No aplica'}
              </Text>
              <Switch
                value={isTestApplicable}
                onValueChange={value => onStatusChange(testApplyId, value)}
                trackColor={{ false: '#D1D5DB', true: '#A5F3FC' }}
                thumbColor={isTestApplicable ? '#06B6D4' : '#9CA3AF'}
              />
            </View>
          </View>

          {isTestApplicable && (
            <View style={styles.testBody}>
              <View style={styles.resultToggleRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.resultButton,
                    isTestOk && styles.resultButtonOkActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => onStatusChange(testResultId, true)}>
                  <Text
                    style={[
                      styles.resultButtonText,
                      isTestOk && styles.resultButtonTextActive,
                    ]}>
                    OK
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.resultButton,
                    !isTestOk && styles.resultButtonObsActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => onStatusChange(testResultId, false)}>
                  <Text
                    style={[
                      styles.resultButtonText,
                      !isTestOk && styles.resultButtonTextActive,
                    ]}>
                    OBS
                  </Text>
                </Pressable>
              </View>

              {!isTestOk &&
                renderObservationCard(
                  testId,
                  'Observación',
                  DEFAULT_OBSERVATIONS.test,
                )}
            </View>
          )}
        </View>

        <View style={styles.testSection}>
          <View style={styles.testHeaderRow}>
            <Text style={styles.testTitle}>Circuito independiente</Text>
            <View style={styles.testSwitchWrap}>
              <Text style={styles.testSwitchLabel}>
                {isCircuitIndependentOk ? 'OK' : 'Observado'}
              </Text>
              <Switch
                value={isCircuitIndependentOk}
                onValueChange={value =>
                  onStatusChange(circuitIndependentId, value)
                }
                trackColor={{ false: '#D1D5DB', true: '#A5F3FC' }}
                thumbColor={isCircuitIndependentOk ? '#06B6D4' : '#9CA3AF'}
              />
            </View>
          </View>

          {!isCircuitIndependentOk &&
            renderObservationCard(
              circuitIndependentObsId,
              'Observación circuito independiente',
              DEFAULT_OBSERVATIONS.circuitIndependent,
            )}
        </View>

        <View style={styles.divider} />
      </View>
    );
  },
  (prevProps, nextProps) => {
    const itemId = `itg_${nextProps.currentItgId}_${nextProps.itm.id}`;
    const hasValidationChanged =
      prevProps.validationErrors?.[itemId] !==
      nextProps.validationErrors?.[itemId];
    const hasMeasureChanged =
      prevProps.measurements?.[itemId] !== nextProps.measurements?.[itemId];

    // Custom deep comparison for specific checklist IDs we care about to avoid full re-render
    // Not strictly necessary since we can just check if checklist reference changed, but this is much faster
    // However, simpler is checking if ANY relevant value changed.
    // Given we update parent Session constantly, React.memo prevents re-render if props are identical.
    // Actually, we must manually check the checklist fields we care about.
    const checks = [
      `circuit_independent_itg_${nextProps.currentItgId}_${nextProps.itm.id}`,
      `test_id_itg_${nextProps.currentItgId}_${nextProps.itm.id}`,
      `test_itg_${nextProps.currentItgId}_${nextProps.itm.id}_applies`,
      `test_itg_${nextProps.currentItgId}_${nextProps.itm.id}_result`,
    ];

    const hasChecklistChanged = checks.some(
      key => prevProps.checklist[key] !== nextProps.checklist[key],
    );

    return (
      prevProps.itm.id === nextProps.itm.id &&
      !hasValidationChanged &&
      !hasMeasureChanged &&
      !hasChecklistChanged
    );
  },
);

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
          <Pressable
            key={`tab_${index}`}
            style={({ pressed }) => [
              styles.tab,
              activeTab === index && styles.activeTab,
              pressed && styles.pressed,
            ]}
            onPress={() => setActiveTab(index)}>
            <Text
              style={[
                styles.tabText,
                activeTab === index && styles.activeTabText,
              ]}>
              {itg.id ? `ITG-${itg.id}` : `ITG-${index + 1}`}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      <View style={styles.content}>
        {currentItg.itms.map((itm: ITM) => (
          <ITMCard
            key={`itg_${currentItg.id}_${itm.id}`}
            itm={itm}
            currentItgId={currentItg.id}
            checklist={checklist}
            measurements={measurements}
            itemObservations={itemObservations}
            validationErrors={validationErrors}
            configuredVoltage={configuredVoltage}
            onStatusChange={onStatusChange}
            onMeasurementChange={onMeasurementChange}
            onMeasurementStatusChange={onMeasurementStatusChange}
            onCableChange={onCableChange}
            onObservationChange={onObservationChange}
            onPhotoPress={onPhotoPress}
          />
        ))}
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
  testSection: {
    marginTop: 16,
    gap: 12,
  },
  testHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11181C',
  },
  testSwitchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testSwitchLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  testBody: {
    gap: 10,
  },
  resultToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  resultButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    alignItems: 'center',
  },
  resultButtonOkActive: {
    backgroundColor: '#ECFEFF',
    borderColor: '#06B6D4',
  },
  resultButtonObsActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  resultButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  resultButtonTextActive: {
    color: '#11181C',
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
  observationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
  },
  reportTextBox: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  reportTextLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  reportText: {
    fontSize: 14,
    color: '#11181C',
    fontWeight: '500',
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
  pressed: {
    opacity: 0.84,
  },
});
