import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

import MaintenanceHeader from '@/components/maintenance-header';
import {
  SaveFeedbackModal,
  SaveFeedbackStatus,
} from '@/components/SaveFeedbackModal';
import { useMaintenanceSession } from '@/hooks/use-maintenance-session';
import { PhotoItem } from '@/types/maintenance-session';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';
import { saveSessionNotes } from '@/services/supabase-session-notes.service';

const PROTOCOL_ITEMS = [
  {
    key: 'tablero_sin_oxido',
    label: '1. Tablero sin óxido y pintura buen estado',
  },
  { key: 'puerta_mandil_aterrados', label: '2. Puerta y mandil aterrados' },
  { key: 'cables_libres_halogenos', label: '3. Cables libres de halógenos' },
  {
    key: 'identificacion_fases',
    label: '4. Identificación de fases (L1 - L2 - L3 - N)',
  },
  {
    key: 'interruptores_terminales',
    label: '5. Interruptores con terminales (No cable directo)',
  },
  { key: 'linea_tierra_correcta', label: '6. Línea de tierra correcta' },
  {
    key: 'diagrama_unifilar_actualizado',
    label: '7. Diagrama unifilar actualizado',
  },
  { key: 'luz_emergencia', label: '8. Luz de emergencia operativa' },
  { key: 'rotulado_circuitos', label: '9. Rotulado de circuitos' },
  {
    key: 'interruptores_riel_din',
    label: '10. Interruptores fijados en riel din',
  },
];

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

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalStatus, setModalStatus] = useState<SaveFeedbackStatus>('loading');
  const [modalMessage, setModalMessage] = useState<string | undefined>();

  if (!session) return <ActivityIndicator />;

  // Determine if this is the last equipment in the session
  const isLastEquipment = (() => {
    const total = session.sessionTotal ?? 1;
    const completed = session.sessionCompleted ?? 0;
    // We're completing this one, so if completed + 1 >= total, it's the last
    return completed + 1 >= total;
  })();

  const handleFinalize = async () => {
    setIsUploading(true);
    setUploadProgress('Guardando...');
    setModalVisible(true);
    setModalStatus('loading');
    setModalMessage('Guardando mantenimiento...');

    try {
      // 0. Get Current User
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) throw new Error('No user found');

      // 1. Prepare Data for Local Storage
      // We keep local URIs in the 'url' field for now, SyncService will replace them later.

      const prePhotosDetails = session.prePhotos.map(p => ({
        url: p.uri, // Local URI
        id: p.id,
        type: 'pre',
        category: p.category || 'visual',
      }));

      const postPhotosDetails = session.postPhotos.map(p => ({
        url: p.uri, // Local URI
        id: p.id,
        type: 'post',
        category: 'visual',
      }));

      const itemObservationsFinal: Record<string, any> = {};
      const observationKeys = Object.keys(session.itemObservations);

      for (const key of observationKeys) {
        const obs = session.itemObservations[key];
        itemObservationsFinal[key] = {
          note: obs.note,
          photoUrl: obs.photoUri, // Local URI
        };
      }

      // 2. Prepare Final Maintenance Object
      const detailMaintenance = {
        prePhotos: prePhotosDetails,
        postPhotos: postPhotosDetails,
        checklist: session.checklist,
        measurements: session.measurements,
        itemObservations: itemObservationsFinal,
        observations: session.observations,
        recommendations: session.recommendations || '',
        conclusions: session.conclusions || '',
        extraConditions: session.extraConditions,
        protocol: session.protocol,
        selectedInstruments: session.selectedInstruments,
        completedAt: new Date().toISOString(),
      };

      // 3. Extract Photos for separate tracking in DB
      const allPhotos = [
        ...session.prePhotos.map(p => ({
          uri: p.uri,
          type: 'pre',
          category: p.category,
        })),
        ...session.postPhotos.map(p => ({
          uri: p.uri,
          type: 'post',
          category: 'visual',
        })),
        ...observationKeys
          .filter(k => session.itemObservations[k].photoUri)
          .map(k => ({
            uri: session.itemObservations[k].photoUri!,
            type: 'observation',
            observationKey: k,
          })),
      ];

      // 4. Save to Local DB
      const cleanMaintenanceId =
        maintenanceId && maintenanceId !== 'null' ? maintenanceId : null;

      await DatabaseService.saveOfflineMaintenance(
        userId,
        cleanMaintenanceId,
        detailMaintenance,
        allPhotos,
        session.protocol,
      );

      console.log('SUCCESS: Saved locally');

      // 5. Check connectivity and sync
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable;

      if (isOnline) {
        // Try to sync immediately
        setModalMessage('Sincronizando con el servidor...');
        try {
          await syncService.pushData();

          // Save session notes if this is the last equipment
          if (isLastEquipment && session.propertyId && session.sessionDate) {
            try {
              await saveSessionNotes(
                session.propertyId,
                session.sessionDate,
                session.recommendations || '',
                session.conclusions || '',
              );
              console.log('Session notes saved to Supabase');
            } catch (notesError) {
              console.error('Error saving session notes:', notesError);
              // Don't fail the whole operation, just log
            }
          }

          // Sync succeeded!
          setModalStatus('success');
          setModalMessage(
            'El mantenimiento se ha guardado y sincronizado correctamente.',
          );
        } catch (syncError) {
          console.error('Sync failed:', syncError);
          // Saved locally but sync failed - show error
          setModalStatus('error');
          setModalMessage(
            'Los datos se guardaron localmente pero hubo un error al sincronizar. Se reintentará automáticamente.',
          );
        }
      } else {
        // No internet - show offline message
        setModalStatus('offline');
        setModalMessage(undefined); // Use default offline message
      }

      // 6. Clear Local Session
      //await clearSession();
    } catch (e) {
      console.error(e);
      setModalStatus('error');
      setModalMessage(
        'Hubo un error al guardar. Por favor intente nuevamente.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleModalClose = async () => {
    // Nota el async
    // 1. Si es error, solo cerramos el modal para que reintenten
    if (modalStatus === 'error') {
      setModalVisible(false);
      return;
    }

    if (modalStatus === 'success' || modalStatus === 'offline') {
      // 2. IMPORTANTE: Capturamos los datos de navegación ANTES de borrar la sesión
      // Usamos variables locales porque 'session' va a dejar de existir en un momento
      const nextRouteParams = {
        isScheduled: session?.maintenanceId && session.maintenanceId !== 'null',
        propertyId: session?.propertyId,
        propertyName: session?.propertyName,
        building: session?.building,
        maintenanceType: session?.maintenanceType,
      };

      // 3. AHORA SÍ borramos la sesión.
      // El modal sigue visible visualmente o el usuario ya pulsó el botón,
      // así que no importa si hay un micro-parpadeo, ya nos vamos.
      await clearSession();

      // 4. Navegamos usando las variables locales (nextRouteParams)
      // NO uses 'session.x' aquí abajo porque ya es null.

      // Eliminamos el stack actual para evitar volver a pantallas intermedias (como ExecutionRouter)
      router.dismissAll();

      if (nextRouteParams.isScheduled) {
        // Mantenimiento Agendado
        if (nextRouteParams.propertyId) {
          // Regresar a la lista de tareas programadas (Root) pero forzando la apertura de la sesión
          // Esto limpia el stack: ScheduledMaintenance -> MaintenanceSession
          router.push({
            pathname:
              '/maintenance/scheduled_maintenance/scheduled-maintenance',
            params: {
              autoOpenPropertyId: nextRouteParams.propertyId,
              autoOpenPropertyName: nextRouteParams.propertyName,
            },
          });
        } else {
          router.navigate(
            '/maintenance/scheduled_maintenance/scheduled-maintenance',
          );
        }
      } else if (nextRouteParams.building) {
        // Mantenimiento Correctivo / Ad-hoc
        router.navigate({
          pathname: '/maintenance/select-device',
          params: { building: JSON.stringify(nextRouteParams.building) },
        });
      } else {
        // Fallback
        router.navigate({
          pathname: '/maintenance',
          params: { type: nextRouteParams.maintenanceType || 'preventivo' },
        });
      }
    }
  };

  const handleRetry = () => {
    setModalVisible(false);
    handleFinalize();
  };

  const handleObservationsChange = (text: string) => {
    if (!session) return;
    saveSession({
      ...session,
      observations: text,
      lastUpdated: new Date().toISOString(),
    });
  };

  const handleRecommendationsChange = (text: string) => {
    if (!session) return;
    saveSession({
      ...session,
      recommendations: text,
      lastUpdated: new Date().toISOString(),
    });
  };

  const handleConclusionsChange = (text: string) => {
    if (!session) return;
    saveSession({
      ...session,
      conclusions: text,
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

    // Helper to format cable type
    const formatCableType = (value?: string) => {
      if (!value) return '-';
      if (value === 'libre_halogeno') return 'Libre de Halógeno';
      if (value === 'no_libre_halogeno') return 'No libre de Halógeno';
      return value;
    };

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

              {/* Measurements - Show all data */}
              {measure && (
                <View style={styles.measurementsBox}>
                  <View style={styles.measureColumn}>
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
                  <View style={styles.measureColumn}>
                    {measure.cableDiameter && (
                      <Text style={styles.measureText}>
                        Ø Cable: {measure.cableDiameter}
                      </Text>
                    )}
                    {measure.cableType && (
                      <Text style={styles.measureText}>
                        Tipo: {formatCableType(measure.cableType)}
                      </Text>
                    )}
                  </View>
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
      <MaintenanceHeader title="Resumen Final" iconName="description" />

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Instrumentos Utilizados</Text>
          {session.selectedInstruments &&
          session.selectedInstruments.length > 0 ? (
            <View style={styles.instrumentsList}>
              {session.selectedInstruments.map(inst => (
                <View key={inst.id} style={styles.instrumentItem}>
                  <View style={styles.instrumentIcon}>
                    <Ionicons name="build" size={20} color="#06B6D4" />
                  </View>
                  <View style={styles.instrumentInfo}>
                    <Text style={styles.instrumentName}>
                      {inst.instrumento}
                    </Text>
                    <Text style={styles.instrumentMeta}>
                      {inst.marca} {inst.modelo} • S/N: {inst.serie}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              No se seleccionaron instrumentos.
            </Text>
          )}
        </View>

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

        {/* Show recommendations and conclusions only for the last equipment */}
        {isLastEquipment && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recomendaciones</Text>
              <TextInput
                style={styles.observationsInput}
                placeholder="Ingrese las recomendaciones para el cliente..."
                value={session.recommendations}
                onChangeText={handleRecommendationsChange}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Conclusiones</Text>
              <TextInput
                style={styles.observationsInput}
                placeholder="Ingrese las conclusiones del mantenimiento..."
                value={session.conclusions}
                onChangeText={handleConclusionsChange}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </>
        )}

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
          <Text style={styles.cardTitle}>Protocolo de Tablero</Text>
          {session.protocol ? (
            <View style={styles.protocolList}>
              {PROTOCOL_ITEMS.map(item => (
                <View key={item.key} style={styles.protocolItem}>
                  <Text style={styles.protocolLabel}>{item.label}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      session.protocol?.[item.key]
                        ? styles.statusOk
                        : styles.statusIssue,
                    ]}>
                    <Text style={styles.statusText}>
                      {session.protocol?.[item.key] ? 'OK' : 'NO OK'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No se registró protocolo.</Text>
          )}
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

      {/* Save Feedback Modal */}
      <SaveFeedbackModal
        visible={modalVisible}
        status={modalStatus}
        message={modalMessage}
        onClose={handleModalClose}
        onRetry={handleRetry}
      />
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
    flexWrap: 'wrap',
  },
  measureColumn: {
    flex: 1,
    minWidth: 120,
    gap: 2,
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
  // Protocol Styles
  protocolList: {
    marginTop: 8,
  },
  protocolItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  protocolLabel: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
    paddingRight: 8,
  },
  instrumentsList: {
    gap: 12,
  },
  instrumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDFA',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  instrumentIcon: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  instrumentInfo: {
    flex: 1,
  },
  instrumentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  instrumentMeta: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});
