import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import MaintenanceHeader from '@/components/maintenance-header';
import { useMaintenanceSession } from '@/hooks/use-maintenance-session';
import { useElectricalPanelDetail } from '@/hooks/use-electrical-panel-detail';

import { ITGChecklist } from '@/components/maintenance/checklist/itg-checklist';
import { AuxiliaryChecklist } from '@/components/maintenance/checklist/auxiliary-checklist';
import { ConditionsChecklist } from '@/components/maintenance/checklist/conditions-checklist';

export default function MaintenanceChecklistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    panelId: string;
    maintenanceId: string;
  }>();
  const { panelId, maintenanceId } = params;

  // Load Session
  const { session, updateSession } = useMaintenanceSession(
    panelId || '',
    maintenanceId,
  );

  // Load Equipment Data
  const { data: panel, isLoading: isPanelLoading } = useElectricalPanelDetail(
    panelId || '',
  );
  const detail = panel?.equipment_detail;
  const itgs = useMemo(() => detail?.itgs || [], [detail?.itgs]);
  const components = useMemo(
    () => detail?.componentes || [],
    [detail?.componentes],
  );
  const conditions = useMemo<Record<string, boolean>>(
    () =>
      (detail?.condiciones_especiales as Record<string, boolean> | undefined) ||
      {},
    [detail?.condiciones_especiales],
  );

  useEffect(() => {
    if (!session) return;

    const defaultChecklistValues: Record<string, boolean> = {};

    components.forEach((comp: any) => {
      comp.items.forEach((item: any) => {
        const itemId = `comp_${comp.tipo}_${item.codigo}`;
        if (session.checklist[itemId] === undefined) {
          defaultChecklistValues[itemId] = true;
        }
      });
    });

    Object.keys(conditions).forEach(key => {
      if (!conditions[key]) return;
      const itemId = `cond_${key}`;
      if (session.checklist[itemId] === undefined) {
        defaultChecklistValues[itemId] = true;
      }
    });

    const hasDefaults = Object.keys(defaultChecklistValues).length > 0;
    if (!hasDefaults) return;

    void updateSession(prevSession => ({
      ...prevSession,
      checklist: {
        ...prevSession.checklist,
        ...defaultChecklistValues,
      },
      lastUpdated: new Date().toISOString(),
    }));
  }, [components, conditions, session, updateSession]);

  // Validation errors state for inline validation
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string[]>
  >({});

  const handleStatusChange = useCallback(
    (itemId: string, status: boolean) => {
      const measurements = session?.measurements?.[itemId];
      if (measurements && status === true) {
        if (
          measurements.isVoltageInRange === false ||
          measurements.isAmperageInRange === false
        ) {
          Alert.alert(
            'Medición Fuera de Rango',
            'No se puede marcar como OK si las mediciones están fuera de rango. Debe registrar una observación y foto.',
          );
          return;
        }
      }

      void updateSession(prevSession => ({
        ...prevSession,
        checklist: {
          ...prevSession.checklist,
          [itemId]: status,
        },
        lastUpdated: new Date().toISOString(),
      }));
    },
    [session?.measurements, updateSession],
  );

  const handleMeasurementChange = useCallback(
    (
      itemId: string,
      field: 'voltage' | 'amperage',
      value: string,
      isValid: boolean,
    ) => {
      if (value) {
        setValidationErrors(prev => {
          const current = prev[itemId] || [];
          return {
            ...prev,
            [itemId]: current.filter(f => f !== field),
          };
        });
      }

      void updateSession(prevSession => {
        const currentMeasurement = prevSession.measurements?.[itemId] || {};
        const nextMeasurement = {
          ...currentMeasurement,
          [field]: value,
          ...(field === 'voltage'
            ? { isVoltageInRange: isValid }
            : { isAmperageInRange: isValid }),
        };

        return {
          ...prevSession,
          measurements: {
            ...(prevSession.measurements || {}),
            [itemId]: nextMeasurement,
          },
          checklist: !isValid
            ? {
                ...prevSession.checklist,
                [itemId]: false,
              }
            : prevSession.checklist,
          lastUpdated: new Date().toISOString(),
        };
      });
    },
    [updateSession],
  );

  const handleCableChange = useCallback(
    (
      itemId: string,
      field: 'cableDiameter' | 'cableType',
      value: string,
      originalValue: string,
    ) => {
      if (value) {
        setValidationErrors(prev => {
          const current = prev[itemId] || [];
          return {
            ...prev,
            [itemId]: current.filter(f => f !== field),
          };
        });
      }

      void updateSession(prevSession => {
        const currentMeasurement = prevSession.measurements?.[itemId] || {};
        const originalFieldKey =
          field === 'cableDiameter'
            ? 'originalCableDiameter'
            : 'originalCableType';
        const originalStored =
          currentMeasurement[originalFieldKey] || originalValue || '';

        const nextMeasurement = {
          ...currentMeasurement,
          [field]: value,
          [originalFieldKey]: originalStored,
        };

        const forceObservation =
          value.length > 0 &&
          originalStored.length > 0 &&
          value !== originalStored;

        return {
          ...prevSession,
          measurements: {
            ...(prevSession.measurements || {}),
            [itemId]: nextMeasurement,
          },
          checklist: forceObservation
            ? {
                ...prevSession.checklist,
                [itemId]: false,
              }
            : prevSession.checklist,
          lastUpdated: new Date().toISOString(),
        };
      });
    },
    [updateSession],
  );

  const handleObservationChange = useCallback(
    (itemId: string, text: string) => {
      void updateSession(prevSession => ({
        ...prevSession,
        itemObservations: {
          ...prevSession.itemObservations,
          [itemId]: {
            ...(prevSession.itemObservations[itemId] || { note: '' }),
            note: text,
          },
        },
        lastUpdated: new Date().toISOString(),
      }));
    },
    [updateSession],
  );

  const takePhoto = useCallback(
    async (itemId: string) => {
      try {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.5,
        });

        if (!result.canceled && result.assets.length > 0) {
          const photoUri = result.assets[0].uri;
          await updateSession(
            prevSession => ({
              ...prevSession,
              itemObservations: {
                ...prevSession.itemObservations,
                [itemId]: {
                  ...(prevSession.itemObservations[itemId] || { note: '' }),
                  photoUri,
                },
              },
              lastUpdated: new Date().toISOString(),
            }),
            { immediate: true },
          );
        }
      } catch {
        Alert.alert('Error', 'No se pudo abrir la cámara');
      }
    },
    [updateSession],
  );

  const handlePhotoPress = useCallback(
    async (itemId: string) => {
      // If photo exists, ask to remove? Or just overwrite.
      // ChecklistItem UI shows a remove button if photo exists, which calls this with same ID?
      // My ChecklistItem has `onPhotoPress`. If photoUri exists it shows X button which calls onPhotoPress.
      // If photoUri is null, it shows Camera button which calls onPhotoPress.
      // So I need to check if photo exists to decide whether to delete or add.

      const currentPhoto = session?.itemObservations[itemId]?.photoUri;

      if (currentPhoto) {
        Alert.alert('Eliminar foto', '¿Estás seguro de eliminar la foto?', [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              void updateSession(
                prevSession => ({
                  ...prevSession,
                  itemObservations: {
                    ...prevSession.itemObservations,
                    [itemId]: {
                      ...(prevSession.itemObservations[itemId] || { note: '' }),
                      photoUri: undefined,
                    },
                  },
                  lastUpdated: new Date().toISOString(),
                }),
                { immediate: true },
              );
            },
          },
        ]);
      } else {
        await takePhoto(itemId);
      }
    },
    [session?.itemObservations, takePhoto, updateSession],
  );

  const handleContinue = useCallback(() => {
    // Validate all items and collect errors for inline display
    const newErrors: Record<string, string[]> = {};
    // Check ITGs
    itgs.forEach((itg: any) => {
      itg.itms.forEach((itm: any) => {
        const id = `itg_${itg.id}_${itm.id}`;
        const errors: string[] = [];

        // Check Measurements (Voltage/Amperage/Cable required)
        const m = session?.measurements?.[id];
        if (!m?.voltage) errors.push('voltage');
        if (!m?.amperage) errors.push('amperage');

        // Cable fields - check if there's a value (either user-entered or use original)
        const cableDiameter = m?.cableDiameter ?? itm.diametro_cable;
        const cableType = m?.cableType ?? itm.tipo_cable;
        if (!cableDiameter) errors.push('cableDiameter');
        if (!cableType) errors.push('cableType');

        // If measurements invalid, check if Photo + Observation exists
        if (m) {
          const invalid =
            m.isVoltageInRange === false || m.isAmperageInRange === false;
          if (invalid) {
            const obs = session?.itemObservations[id];
            if (!obs?.photoUri) errors.push('photo');
            if (!obs?.note) errors.push('observation');
          }
        }

        if (errors.length > 0) {
          newErrors[id] = errors;
        }

        // Check Differential Switch if exists
        if (itm.diferencial && itm.diferencial.existe) {
          const diffId = `diff_itg_${itg.id}_${itm.id}`;
          const diffErrors: string[] = [];

          const diffM = session?.measurements?.[diffId];
          if (!diffM?.voltage) diffErrors.push('voltage');
          if (!diffM?.amperage) diffErrors.push('amperage');

          // Differential cable fields
          const diffCableDiameter =
            diffM?.cableDiameter ?? itm.diferencial.diametro_cable;
          const diffCableType = diffM?.cableType ?? itm.diferencial.tipo_cable;
          if (!diffCableDiameter) diffErrors.push('cableDiameter');
          if (!diffCableType) diffErrors.push('cableType');

          if (diffM) {
            const invalid =
              diffM.isVoltageInRange === false ||
              diffM.isAmperageInRange === false;
            if (invalid) {
              const obs = session?.itemObservations[diffId];
              if (!obs?.photoUri) diffErrors.push('photo');
              if (!obs?.note) diffErrors.push('observation');
            }
          }

          if (diffErrors.length > 0) {
            newErrors[diffId] = diffErrors;
          }
        }
      });
    });

    // Check Components - Skip validation since they default to OK in the UI
    // The AuxiliaryChecklist component shows them as OK by default

    // Update validation errors state
    setValidationErrors(newErrors);

    // If there are errors, don't proceed
    if (Object.keys(newErrors).length > 0) {
      // No Alert needed - errors are shown inline
      return;
    }

    router.push({
      pathname: '/maintenance/execution/electrical-panel/post-photos' as any,
      params: { panelId, maintenanceId },
    });
  }, [itgs, maintenanceId, panelId, router, session]);

  if (isPanelLoading || !session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MaintenanceHeader
        title="Verificación de Equipos"
        iconName="playlist-add-check"
      />

      <ScrollView style={styles.content}>
        <ITGChecklist
          itgs={itgs}
          checklist={session.checklist}
          measurements={session.measurements}
          itemObservations={session.itemObservations}
          onStatusChange={handleStatusChange}
          onMeasurementChange={handleMeasurementChange}
          onCableChange={handleCableChange}
          onObservationChange={handleObservationChange}
          onPhotoPress={handlePhotoPress}
          configuredVoltage={detail?.detalle_tecnico?.voltaje}
          validationErrors={validationErrors}
        />

        <AuxiliaryChecklist
          components={components}
          checklist={session.checklist}
          itemObservations={session.itemObservations}
          onStatusChange={handleStatusChange}
          onObservationChange={handleObservationChange}
          onPhotoPress={handlePhotoPress}
        />

        <ConditionsChecklist
          conditions={conditions}
          checklist={session.checklist}
          itemObservations={session.itemObservations}
          onStatusChange={handleStatusChange}
          onObservationChange={handleObservationChange}
          onPhotoPress={handlePhotoPress}
        />

        <View style={styles.footerSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueBtnText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    backgroundColor: '#F3F7FA',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  continueBtn: {
    backgroundColor: '#06B6D4',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerSpacer: {
    height: 40,
  },
});
