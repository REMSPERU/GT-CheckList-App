import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import MaintenanceHeader from '@/components/maintenance-header';
import { Colors } from '@/constants/theme';
import { useMaintenanceSession } from '@/hooks/use-maintenance-session';
import { useElectricalPanelDetail } from '@/hooks/use-electrical-panel-detail';
import { DatabaseService } from '@/services/db';

interface Instrument {
  id: string;
  instrumento: string;
  marca: string;
  modelo: string;
  serie: string;
}

export default function SelectInstrumentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    panelId: string;
    maintenanceId: string;
  }>();
  const { panelId, maintenanceId } = params;

  const {
    session,
    saveSession,
    loading: isSessionLoading,
  } = useMaintenanceSession(panelId || '', maintenanceId);

  const { data: panel, isLoading: isPanelLoading } = useElectricalPanelDetail(
    panelId || '',
  );

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [isLoadingInstruments, setIsLoadingInstruments] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const instrumentById = useMemo(
    () => new Map(instruments.map(item => [item.id, item])),
    [instruments],
  );

  const loadInstruments = useCallback(async (equipmentTypeId: string) => {
    setIsLoadingInstruments(true);
    try {
      const data =
        await DatabaseService.getInstrumentsByEquipmentType(equipmentTypeId);
      setInstruments(data as Instrument[]);
    } catch (error) {
      console.error('Failed to load instruments:', error);
      Alert.alert('Error', 'No se pudieron cargar los instrumentos.');
    } finally {
      setIsLoadingInstruments(false);
    }
  }, []);

  useEffect(() => {
    if (panel?.id_equipamento) {
      loadInstruments(panel.id_equipamento);
    }
  }, [loadInstruments, panel?.id_equipamento]);

  useEffect(() => {
    const selectedFromSession =
      session?.selectedInstruments?.map(i => i.id) || [];
    setSelectedIds(selectedFromSession);
  }, [session?.selectedInstruments]);

  const handleSelect = useCallback(
    (instrument: Instrument) => {
      setSelectedIds(prev => {
        // Find instruments of DIFFERENT types
        const otherTypeIds = prev.filter(id => {
          const item = instruments.find(i => i.id === id);
          return item && item.instrumento !== instrument.instrumento;
        });

        // Toggling
        if (prev.includes(instrument.id)) {
          return otherTypeIds; // Remove if already selected
        }

        // Add (replacing same type)
        return [...otherTypeIds, instrument.id];
      });
    },
    [instruments],
  );

  const handleContinue = useCallback(async () => {
    if (selectedIds.length === 0) {
      Alert.alert(
        'Selección requerida',
        'Por favor seleccione al menos un instrumento.',
      );
      return;
    }

    if (session) {
      const selectedInstrumentsData = selectedIds
        .map(id => {
          const inst = instrumentById.get(id);
          return inst || null;
        })
        .filter((item): item is Instrument => item !== null);

      const updatedSession = {
        ...session,
        selectedInstruments: selectedInstrumentsData,
        lastUpdated: new Date().toISOString(),
      };
      await saveSession(updatedSession as any, { immediate: true });

      router.push({
        pathname: '/maintenance/execution/electrical-panel/checklist' as any,
        params: { panelId, maintenanceId },
      });
    }
  }, [
    instrumentById,
    maintenanceId,
    panelId,
    router,
    saveSession,
    selectedIds,
    session,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: Instrument }) => {
      const isSelected = selectedSet.has(item.id);

      return (
        <Pressable
          style={({ pressed }) => [
            styles.card,
            isSelected && styles.cardSelected,
            pressed && styles.pressed,
          ]}
          onPress={() => handleSelect(item)}
          accessibilityRole="button">
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.instrumentName,
                isSelected && styles.textSelected,
              ]}>
              {item.instrumento}
            </Text>
            {isSelected && (
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={Colors.light.tint}
              />
            )}
          </View>
          <Text
            style={[
              styles.instrumentDetail,
              isSelected && styles.textSelected,
            ]}>
            Marca: {item.marca}
          </Text>
          <Text
            style={[
              styles.instrumentDetail,
              isSelected && styles.textSelected,
            ]}>
            Modelo: {item.modelo}
          </Text>
          <Text
            style={[
              styles.instrumentDetail,
              isSelected && styles.textSelected,
            ]}>
            Serie: {item.serie}
          </Text>
        </Pressable>
      );
    },
    [handleSelect, selectedSet],
  );

  const isLoading = isSessionLoading || isPanelLoading || isLoadingInstruments;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Cargando instrumentos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MaintenanceHeader
        title="Seleccionar Instrumento"
        iconName="build" // or 'speedometer' if available in your icon set or similar
      />

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Seleccione el instrumento a utilizar para las mediciones:
        </Text>

        <FlatList
          data={instruments}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No hay instrumentos disponibles para este tipo de equipo.
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.continueBtn,
            selectedIds.length === 0 && styles.continueBtnDisabled,
          ]}
          onPress={handleContinue}
          disabled={selectedIds.length === 0}
          accessibilityRole="button">
          <Text style={styles.continueBtnText}>Continuar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    backgroundColor: '#F3F7FA',
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: '#E0F2FE', // Light cyan tint
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  instrumentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#11181C',
  },
  instrumentDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  textSelected: {
    color: '#0e7490', // Darker cyan text
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  continueBtn: {
    backgroundColor: Colors.light.tint,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.84,
  },
});
