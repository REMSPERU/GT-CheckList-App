import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

import MaintenanceHeader from '@/components/maintenance-header';
import { useMaintenanceSession } from '@/hooks/use-maintenance-session';
import { PhotoItem } from '@/types/maintenance-session';
import { supabaseMaintenanceService } from '@/services/supabase-maintenance.service';
import { supabase } from '@/lib/supabase'; // To get current user

export default function SummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    panelId: string;
    maintenanceId: string;
  }>();
  const { panelId, maintenanceId } = params;

  const { session, clearSession, saveSession } = useMaintenanceSession(
    panelId || '',
    maintenanceId,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  if (!session) return <ActivityIndicator />;

  const handleFinalize = async () => {
    setIsUploading(true);
    setUploadProgress('Iniciando carga...');

    try {
      // 0. Get Current User
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;

      // 1. Upload Pre-Photos
      const prePhotosDetails = [];
      for (const p of session.prePhotos) {
        setUploadProgress(`Subiendo foto previa ${p.id.slice(-4)}...`);
        const url = await supabaseMaintenanceService.uploadPhoto(p.uri, 'pre');
        prePhotosDetails.push({
          url,
          id: p.id,
          type: 'pre',
          category: p.category || 'visual', // Default to visual if undefined
        });
      }

      // 2. Upload Post-Photos
      const postPhotosDetails = [];
      for (const p of session.postPhotos) {
        setUploadProgress(`Subiendo foto final ${p.id.slice(-4)}...`);
        const url = await supabaseMaintenanceService.uploadPhoto(p.uri, 'post');
        postPhotosDetails.push({
          url,
          id: p.id,
          type: 'post',
          category: 'visual',
        });
      }

      // 3. Upload Observation Photos
      const itemObservationsFinal: Record<string, any> = {};
      const observationKeys = Object.keys(session.itemObservations);

      for (const key of observationKeys) {
        const obs = session.itemObservations[key];
        let photoUrl = undefined;

        if (obs.photoUri) {
          setUploadProgress(`Subiendo foto de observación...`);
          // Determine if it's a local file needed upload? Yes.
          photoUrl = await supabaseMaintenanceService.uploadPhoto(
            obs.photoUri,
            'observations',
          );
        }

        itemObservationsFinal[key] = {
          note: obs.note,
          photoUrl: photoUrl, // Only URL string
        };
      }

      setUploadProgress('Guardando reporte...');

      // 4. Prepare final data
      const detailMaintenance = {
        prePhotos: prePhotosDetails,
        postPhotos: postPhotosDetails,
        checklist: session.checklist,
        measurements: session.measurements,
        itemObservations: itemObservationsFinal,
        observations: session.observations,
        completedAt: new Date().toISOString(),
      };

      // 5. Save to DB
      // Ensure maintenanceId is null if it's the string "null" or empty
      const cleanMaintenanceId =
        maintenanceId && maintenanceId !== 'null' ? maintenanceId : null;

      if (!cleanMaintenanceId) {
        console.warn('No maintenanceId provided, saving as adhoc/null');
      }

      const payload = {
        id_mantenimiento: cleanMaintenanceId,
        user_created: userId,
        detail_maintenance: detailMaintenance,
      };

      console.log('--- SUBMITTING MAINTENANCE ---');
      console.log('Payload:', JSON.stringify(payload, null, 2));

      await supabaseMaintenanceService.saveMaintenanceResponse(payload);

      console.log('SUCCESS: Maintenance Saved to DB');

      // 6. Clear Local Session
      await clearSession();

      Alert.alert(
        'Éxito',
        'Mantenimiento finalizado y guardado correctamente.',
        [
          {
            text: 'OK',
            onPress: () =>
              router.push({
                pathname: '/(tabs)/maintenance',
              }),
          },
        ],
      );
    } catch (e) {
      console.error(e);
      Alert.alert(
        'Error',
        'Hubo un error al subir la información. Verifique su conexión.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleObservationsChange = (text: string) => {
    if (!session) return;
    saveSession({
      ...session,
      observations: text,
      lastUpdated: new Date().toISOString(),
    });
  };

  const renderPhotoGrid = (photos: PhotoItem[]) => {
    if (photos.length === 0)
      return <Text style={styles.emptyText}>No hay fotos</Text>;
    return (
      <View style={styles.photoGrid}>
        {photos.map((photo, index) => (
          <Image
            key={photo.id || index}
            source={{ uri: photo.uri }}
            style={styles.photoThumbnail}
          />
        ))}
      </View>
    );
  };

  const renderChecklistDetails = () => {
    const keys = Object.keys(session.checklist);
    if (keys.length === 0)
      return <Text style={styles.emptyText}>No hay items verificados.</Text>;

    return (
      <View style={styles.listContainer}>
        {keys.map(key => {
          const status = session.checklist[key];
          const obs = session.itemObservations[key];
          const measure = session.measurements?.[key];
          const isOk = status === true;

          // Parse Key for display label? "itg_1_1" -> "ITG 1 - Item 1" ?
          // We don't have the labels easily here without the metadata source.
          // We'll display the raw key or try to format it slightly.
          const label = key.replace(/_/g, ' ').toUpperCase();

          return (
            <View
              key={key}
              style={[styles.itemRow, !isOk && styles.itemRowIssue]}>
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

              {/* Measurements */}
              {measure && (
                <View style={styles.measurementsBox}>
                  {measure.voltage && (
                    <Text style={styles.measureText}>
                      Voltaje: {measure.voltage} V
                    </Text>
                  )}
                  {measure.amperage && (
                    <Text style={styles.measureText}>
                      Amperaje: {measure.amperage} A
                    </Text>
                  )}
                </View>
              )}

              {/* Observation */}
              {!isOk && obs && (
                <View style={styles.obsBox}>
                  <Text style={styles.obsLabel}>Observación:</Text>
                  <Text style={styles.obsText}>{obs.note}</Text>
                  {obs.photoUri && (
                    <Image
                      source={{ uri: obs.photoUri }}
                      style={styles.obsPhoto}
                    />
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <MaintenanceHeader title="Resumen Final" iconName="document-text" />

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fotos Previas (Visual)</Text>
          {renderPhotoGrid(
            session.prePhotos.filter(
              p => !p.category || p.category === 'visual',
            ),
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fotos Termográficas</Text>
          {renderPhotoGrid(
            session.prePhotos.filter(p => p.category === 'thermo'),
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalle de Verificación</Text>
          {renderChecklistDetails()}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Comentarios Generales</Text>
          <TextInput
            style={styles.observationsInput}
            placeholder="Ingrese comentarios sobre el mantenimiento..."
            value={session.observations}
            onChangeText={handleObservationsChange}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Fotos Finales ({session.postPhotos.length})
          </Text>
          {renderPhotoGrid(session.postPhotos)}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, isUploading && styles.disabledBtn]}
          onPress={handleFinalize}
          disabled={isUploading}>
          {isUploading ? (
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.continueBtnText}>{uploadProgress}</Text>
            </View>
          ) : (
            <Text style={styles.continueBtnText}>Finalizar y Guardar</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, backgroundColor: '#F3F7FA', padding: 16 },
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
  emptyText: { color: '#9CA3AF', fontStyle: 'italic', fontSize: 14 },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },

  // List Styles
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
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
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
  observationsInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#11181C',
    minHeight: 100,
  },
  obsPhoto: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginTop: 8,
  },

  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  continueBtn: {
    backgroundColor: '#06B6D4',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledBtn: { backgroundColor: '#A5F3FC' },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
