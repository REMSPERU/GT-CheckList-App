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
import type { ItemMeasurement } from '@/types/maintenance-session';
import type { Componente, ITG, ITM } from '@/types/api';

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
  const itgs = useMemo<ITG[]>(() => detail?.itgs || [], [detail?.itgs]);
  const components = useMemo(
    (): Componente[] => detail?.componentes || [],
    [detail?.componentes],
  );
  const conditions = useMemo<Record<string, boolean>>(
    () =>
      (detail?.condiciones_especiales as Record<string, boolean> | undefined) ||
      {},
    [detail?.condiciones_especiales],
  );
  const configuredVoltage = detail?.detalle_tecnico?.voltaje;
  const normalizeCableType = useCallback(
    (value: unknown): string | undefined => {
      if (typeof value !== 'string') return undefined;

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
      if (
        normalized === 'libre_halogeno' ||
        normalized === 'no_libre_halogeno'
      ) {
        return normalized;
      }

      return undefined;
    },
    [],
  );

  const buildDefaultMeasurement = useCallback(
    (
      amperage: unknown,
      cableDiameter: unknown,
      cableType: unknown,
    ): ItemMeasurement => {
      const parsedAmperage =
        typeof amperage === 'number' || typeof amperage === 'string'
          ? String(amperage)
          : undefined;
      const parsedCableDiameter =
        typeof cableDiameter === 'string' && cableDiameter.trim().length > 0
          ? cableDiameter
          : undefined;
      const parsedCableType =
        normalizeCableType(cableType) ||
        (typeof cableType === 'string' && cableType.trim().length > 0
          ? cableType
          : undefined);
      const parsedVoltage =
        typeof configuredVoltage === 'number'
          ? String(configuredVoltage)
          : undefined;

      return {
        ...(parsedVoltage
          ? { voltage: parsedVoltage, isVoltageInRange: true }
          : {}),
        ...(parsedAmperage
          ? { amperage: parsedAmperage, isAmperageInRange: true }
          : {}),
        ...(parsedCableDiameter
          ? {
              cableDiameter: parsedCableDiameter,
              originalCableDiameter: parsedCableDiameter,
              isCableDiameterInRange: true,
            }
          : {}),
        ...(parsedCableType
          ? { cableType: parsedCableType, originalCableType: parsedCableType }
          : {}),
      };
    },
    [configuredVoltage, normalizeCableType],
  );

  useEffect(() => {
    if (!session) return;

    const defaultChecklistValues: Record<string, boolean> = {};
    const defaultMeasurementValues: Record<string, ItemMeasurement> = {};

    const mergeMissingMeasurementFields = (
      itemId: string,
      fallbackMeasurement: ItemMeasurement,
    ) => {
      const currentMeasurement = session.measurements?.[itemId];

      if (currentMeasurement === undefined) {
        defaultMeasurementValues[itemId] = fallbackMeasurement;
        return;
      }

      let hasChanges = false;
      const mergedMeasurement: ItemMeasurement = { ...currentMeasurement };

      (Object.keys(fallbackMeasurement) as (keyof ItemMeasurement)[]).forEach(
        key => {
          if (mergedMeasurement[key] === undefined) {
            (mergedMeasurement as Record<string, unknown>)[key] =
              fallbackMeasurement[key];
            hasChanges = true;
          }
        },
      );

      if (hasChanges) {
        defaultMeasurementValues[itemId] = mergedMeasurement;
      }
    };

    itgs.forEach(itg => {
      itg.itms.forEach((itm: ITM) => {
        const itemId = `itg_${itg.id}_${itm.id}`;

        mergeMissingMeasurementFields(
          itemId,
          buildDefaultMeasurement(
            itm.amperaje,
            itm.diametro_cable,
            itm.tipo_cable,
          ),
        );

        if (itm.diferencial?.existe) {
          const diffId = `diff_itg_${itg.id}_${itm.id}`;
          mergeMissingMeasurementFields(
            diffId,
            buildDefaultMeasurement(
              itm.diferencial.amperaje,
              itm.diferencial.diametro_cable,
              itm.diferencial.tipo_cable,
            ),
          );
        }

        const testId = `test_itg_${itg.id}_${itm.id}`;
        const testApplyId = `${testId}_applies`;
        const testResultId = `${testId}_result`;

        if (session.checklist[testApplyId] === undefined) {
          defaultChecklistValues[testApplyId] = false;
        }

        if (session.checklist[testResultId] === undefined) {
          defaultChecklistValues[testResultId] = true;
        }
      });
    });

    components.forEach(comp => {
      comp.items.forEach(item => {
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

    const hasChecklistDefaults = Object.keys(defaultChecklistValues).length > 0;
    const hasMeasurementDefaults =
      Object.keys(defaultMeasurementValues).length > 0;
    if (!hasChecklistDefaults && !hasMeasurementDefaults) return;

    void updateSession(prevSession => ({
      ...prevSession,
      checklist: {
        ...prevSession.checklist,
        ...defaultChecklistValues,
      },
      measurements: {
        ...(prevSession.measurements || {}),
        ...defaultMeasurementValues,
      },
      lastUpdated: new Date().toISOString(),
    }));
  }, [
    buildDefaultMeasurement,
    components,
    conditions,
    itgs,
    session,
    updateSession,
  ]);

  // Validation errors state for inline validation
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string[]>
  >({});

  const handleStatusChange = useCallback(
    (itemId: string, status: boolean) => {
      void updateSession(prevSession => ({
        ...prevSession,
        checklist: {
          ...prevSession.checklist,
          [itemId]: status,
        },
        lastUpdated: new Date().toISOString(),
      }));
    },
    [updateSession],
  );

  const handleMeasurementChange = useCallback(
    (itemId: string, field: 'voltage' | 'amperage', value: string) => {
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
        };

        return {
          ...prevSession,
          measurements: {
            ...(prevSession.measurements || {}),
            [itemId]: nextMeasurement,
          },
          lastUpdated: new Date().toISOString(),
        };
      });
    },
    [updateSession],
  );

  const handleMeasurementStatusChange = useCallback(
    (
      itemId: string,
      field: 'voltage' | 'amperage' | 'cableDiameter',
      status: boolean,
    ) => {
      void updateSession(prevSession => {
        const currentMeasurement = prevSession.measurements?.[itemId] || {};
        const nextMeasurement = {
          ...currentMeasurement,
          ...(field === 'voltage'
            ? { isVoltageInRange: status }
            : field === 'amperage'
              ? { isAmperageInRange: status }
              : { isCableDiameterInRange: status }),
        };

        return {
          ...prevSession,
          measurements: {
            ...(prevSession.measurements || {}),
            [itemId]: nextMeasurement,
          },
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
        const normalizedValue =
          field === 'cableType' ? normalizeCableType(value) || value : value;
        const normalizedOriginalValue =
          field === 'cableType'
            ? normalizeCableType(originalValue) || originalValue
            : originalValue;

        const originalFieldKey =
          field === 'cableDiameter'
            ? 'originalCableDiameter'
            : 'originalCableType';
        const originalStored =
          currentMeasurement[originalFieldKey] || normalizedOriginalValue || '';

        const nextMeasurement = {
          ...currentMeasurement,
          [field]: normalizedValue,
          [originalFieldKey]: originalStored,
        };

        return {
          ...prevSession,
          measurements: {
            ...(prevSession.measurements || {}),
            [itemId]: nextMeasurement,
          },
          lastUpdated: new Date().toISOString(),
        };
      });
    },
    [normalizeCableType, updateSession],
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
    itgs.forEach(itg => {
      itg.itms.forEach((itm: ITM) => {
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

          if (diffErrors.length > 0) {
            newErrors[diffId] = diffErrors;
          }
        }

        if (errors.length > 0) {
          newErrors[id] = errors;
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
          onMeasurementStatusChange={handleMeasurementStatusChange}
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
