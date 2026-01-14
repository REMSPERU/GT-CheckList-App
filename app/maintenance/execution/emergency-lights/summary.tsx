import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';

const STORAGE_KEY_PREFIX = 'emergency_light_session_';

interface ChecklistItemData {
  status: boolean;
  observation: string;
  photoUri?: string;
}

interface EmergencyLightSession {
  lumenes: string;
  lumenesItem: ChecklistItemData;
  tiempoDuracion: string;
  tiempoDuracionItem: ChecklistItemData;
  switchItem: ChecklistItemData;
  conectadoTomacorrienteItem: ChecklistItemData;
  conexionDirectaItem: ChecklistItemData;
  conectadoCircuitoIluminacionItem: ChecklistItemData;
}

const ITEM_LABELS: Record<string, string> = {
  lumenesItem: 'Lumenes',
  tiempoDuracionItem: 'Tiempo de duración',
  switchItem: 'Switch',
  conectadoTomacorrienteItem: 'Conectado a Tomacorriente',
  conexionDirectaItem: 'Conexión directa',
  conectadoCircuitoIluminacionItem: 'Conectado al circuito de iluminación',
};

export default function EmergencyLightsSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    panelId: string;
    maintenanceId?: string;
  }>();

  const { panelId, maintenanceId } = params;
  const sessionKey = `${STORAGE_KEY_PREFIX}${panelId}_${maintenanceId || 'adhoc'}`;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [data, setData] = useState<EmergencyLightSession | null>(null);
  const [generalComments, setGeneralComments] = useState('');

  useEffect(() => {
    const loadSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(sessionKey);
        if (stored) {
          setData(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Error loading emergency light session:', e);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, [sessionKey]);

  const handleSubmit = async () => {
    if (!data) return;

    setSubmitting(true);
    setUploadProgress('Guardando localmente...');

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) throw new Error('No user found');

      // Build checklist data matching the existing pattern
      const checklistData: Record<string, boolean | string> = {};
      const itemObservations: Record<string, any> = {};

      // Process each item
      const itemKeys = [
        'lumenesItem',
        'tiempoDuracionItem',
        'switchItem',
        'conectadoTomacorrienteItem',
        'conexionDirectaItem',
        'conectadoCircuitoIluminacionItem',
      ] as const;

      for (const key of itemKeys) {
        const item = data[key] as ChecklistItemData;
        checklistData[key] = item.status;

        if (!item.status && (item.observation || item.photoUri)) {
          itemObservations[key] = {
            note: item.observation,
            photoUrl: item.photoUri, // Local URI - will be synced later
          };
        }
      }

      // Collect photos for sync
      const allPhotos = itemKeys
        .filter(k => {
          const item = data[k] as ChecklistItemData;
          return !item.status && item.photoUri;
        })
        .map(k => ({
          uri: (data[k] as ChecklistItemData).photoUri!,
          type: 'observation',
          observationKey: k,
        }));

      // Build detail maintenance object
      const detailMaintenance = {
        equipmentType: 'Luces de Emergencia',
        measurements: {
          lumenes: data.lumenes,
          tiempoDuracion: data.tiempoDuracion,
        },
        checklist: checklistData,
        itemObservations,
        observations: generalComments,
        completedAt: new Date().toISOString(),
      };

      // Save to local database
      const cleanMaintenanceId =
        maintenanceId && maintenanceId !== 'null' ? maintenanceId : null;

      await DatabaseService.saveOfflineMaintenance(
        userId,
        cleanMaintenanceId,
        detailMaintenance,
        allPhotos,
      );

      console.log('SUCCESS: Saved locally');

      // Trigger background sync
      syncService
        .pushData()
        .catch(err => console.error('Background sync failed:', err));

      // Clear session
      await AsyncStorage.removeItem(sessionKey);

      Alert.alert(
        'Guardado',
        'Mantenimiento guardado en dispositivo. Se sincronizará cuando haya conexión.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.dismissAll();
              router.push('/maintenance');
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error submitting maintenance:', error);
      Alert.alert('Error', 'Hubo un error al guardar. Intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#6B7280' }}>No se encontraron datos</Text>
      </View>
    );
  }

  const renderChecklistItem = (
    key: string,
    item: ChecklistItemData,
    measureValue?: string,
  ) => {
    const label = ITEM_LABELS[key] || key;
    const isOk = item.status;

    return (
      <View key={key} style={[styles.itemRow, !isOk && styles.itemRowIssue]}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemLabel}>{label}</Text>
          <View
            style={[
              styles.statusBadge,
              isOk ? styles.statusOk : styles.statusIssue,
            ]}>
            <Text style={styles.statusText}>{isOk ? 'OK' : 'OBS'}</Text>
          </View>
        </View>

        {/* Measurement value if applicable */}
        {measureValue && (
          <View style={styles.measurementsBox}>
            <Text style={styles.measureText}>
              {label === 'Lumenes'
                ? `${measureValue} lm`
                : `${measureValue} min`}
            </Text>
          </View>
        )}

        {/* Observation */}
        {!isOk && item.observation && (
          <View style={styles.obsBox}>
            <Text style={styles.obsLabel}>Observación:</Text>
            <Text style={styles.obsText}>{item.observation}</Text>
            {item.photoUri && (
              <Image source={{ uri: item.photoUri }} style={styles.obsPhoto} />
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#11181C" />
        </TouchableOpacity>
        <View style={styles.headerIconContainer}>
          <MaterialIcons name="summarize" size={20} color="white" />
        </View>
        <Text style={styles.headerTitle}>Resumen Final</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Measurements Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mediciones</Text>
          <View style={styles.measureGrid}>
            <View style={styles.measureItem}>
              <MaterialCommunityIcons
                name="brightness-7"
                size={24}
                color="#0891B2"
              />
              <Text style={styles.measureLabel}>Lumenes</Text>
              <Text style={styles.measureValue}>{data.lumenes} lm</Text>
            </View>
            <View style={styles.measureItem}>
              <MaterialIcons name="timer" size={24} color="#0891B2" />
              <Text style={styles.measureLabel}>Duración</Text>
              <Text style={styles.measureValue}>{data.tiempoDuracion} min</Text>
            </View>
          </View>
        </View>

        {/* Checklist Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalle de Verificación</Text>
          <View style={styles.listContainer}>
            {renderChecklistItem('lumenesItem', data.lumenesItem, data.lumenes)}
            {renderChecklistItem(
              'tiempoDuracionItem',
              data.tiempoDuracionItem,
              data.tiempoDuracion,
            )}
            {renderChecklistItem('switchItem', data.switchItem)}
            {renderChecklistItem(
              'conectadoTomacorrienteItem',
              data.conectadoTomacorrienteItem,
            )}
            {renderChecklistItem(
              'conexionDirectaItem',
              data.conexionDirectaItem,
            )}
            {renderChecklistItem(
              'conectadoCircuitoIluminacionItem',
              data.conectadoCircuitoIluminacionItem,
            )}
          </View>
        </View>

        {/* General Comments */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Comentarios Generales</Text>
          <TextInput
            style={styles.commentsInput}
            placeholder="Ingrese comentarios sobre el mantenimiento..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={generalComments}
            onChangeText={setGeneralComments}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}>
          {submitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.submitBtnText}>{uploadProgress}</Text>
            </View>
          ) : (
            <Text style={styles.submitBtnText}>Finalizar y Guardar</Text>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  backBtn: {
    marginRight: 10,
  },
  headerIconContainer: {
    backgroundColor: '#06B6D4',
    padding: 6,
    borderRadius: 8,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#11181C',
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#F3F7FA',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#11181C',
  },
  measureGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  measureItem: {
    flex: 1,
    backgroundColor: '#F0FDFA',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    gap: 4,
  },
  measureLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  measureValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0891B2',
  },
  listContainer: {
    gap: 12,
  },
  itemRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
    marginBottom: 4,
  },
  itemRowIssue: {
    borderColor: '#EF4444',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusOk: {
    backgroundColor: '#ECFDF5',
  },
  statusIssue: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#11181C',
  },
  measurementsBox: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  measureText: {
    fontSize: 13,
    color: '#4B5563',
    fontFamily: 'monospace',
  },
  obsBox: {
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  obsLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 2,
  },
  obsText: {
    fontSize: 14,
    color: '#374151',
  },
  obsPhoto: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginTop: 8,
  },
  commentsInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#11181C',
    minHeight: 100,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  submitBtn: {
    backgroundColor: '#06B6D4',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#A5F3FC',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submittingRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
