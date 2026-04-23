import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image } from 'expo-image';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
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
import { ELECTRICAL_PANEL_PROTOCOL_ITEMS } from '@/constants/maintenance/protocol-items';
import { useMaintenanceSession } from '@/hooks/use-maintenance-session';
import { PhotoItem } from '@/types/maintenance-session';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';
import { saveSessionNotes } from '@/services/supabase-session-notes.service';

const SYNC_TIMEOUT_MS = 15000;

export default function SummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    panelId: string;
    maintenanceId: string;
  }>();
  const { panelId, maintenanceId } = params;

  const { session, clearSession, saveSession, updateSession, flushSession } =
    useMaintenanceSession(panelId || '', maintenanceId);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalStatus, setModalStatus] = useState<SaveFeedbackStatus>('loading');
  const [modalMessage, setModalMessage] = useState<string | undefined>();

  const [observationsInput, setObservationsInput] = useState('');
  const [recommendationsInput, setRecommendationsInput] = useState('');
  const [conclusionsInput, setConclusionsInput] = useState('');
  const initializedSessionIdRef = useRef<string | null>(null);

  const sessionObservations = session?.observations || '';
  const sessionRecommendations = session?.recommendations || '';
  const sessionConclusions = session?.conclusions || '';

  useEffect(() => {
    if (!session) return;
    if (initializedSessionIdRef.current === session.sessionId) return;

    initializedSessionIdRef.current = session.sessionId;
    setObservationsInput(session.observations || '');
    setRecommendationsInput(session.recommendations || '');
    setConclusionsInput(session.conclusions || '');
  }, [session]);

  useEffect(() => {
    if (!session || observationsInput === sessionObservations) return;
    const timeoutId = setTimeout(() => {
      void updateSession(prevSession => ({
        ...prevSession,
        observations: observationsInput,
        lastUpdated: new Date().toISOString(),
      }));
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [observationsInput, session, sessionObservations, updateSession]);

  useEffect(() => {
    if (!session || recommendationsInput === sessionRecommendations) return;
    const timeoutId = setTimeout(() => {
      void updateSession(prevSession => ({
        ...prevSession,
        recommendations: recommendationsInput,
        lastUpdated: new Date().toISOString(),
      }));
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [recommendationsInput, session, sessionRecommendations, updateSession]);

  useEffect(() => {
    if (!session || conclusionsInput === sessionConclusions) return;
    const timeoutId = setTimeout(() => {
      void updateSession(prevSession => ({
        ...prevSession,
        conclusions: conclusionsInput,
        lastUpdated: new Date().toISOString(),
      }));
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [conclusionsInput, session, sessionConclusions, updateSession]);

  // Determine if this is the last equipment in the session
  const isLastEquipment = useMemo(() => {
    if (!session) return false;
    const total = session.sessionTotal ?? 1;
    const completed = session.sessionCompleted ?? 0;
    // We're completing this one, so if completed + 1 >= total, it's the last
    return completed + 1 >= total;
  }, [session]);

  const preVisualPhotos = useMemo(
    () =>
      session?.prePhotos.filter(p => !p.category || p.category === 'visual') ||
      [],
    [session?.prePhotos],
  );
  const preThermoPhotos = useMemo(
    () => session?.prePhotos.filter(p => p.category === 'thermo') || [],
    [session?.prePhotos],
  );

  const withTimeout = useCallback(
    <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('SYNC_TIMEOUT'));
        }, timeoutMs);

        promise
          .then(result => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch(error => {
            clearTimeout(timeout);
            reject(error);
          });
      });
    },
    [],
  );

  const handleFinalize = useCallback(async () => {
    if (!session) return;
    setIsUploading(true);
    setUploadProgress('Guardando...');
    setModalVisible(true);
    setModalStatus('loading');
    setModalMessage('Guardando mantenimiento...');

    try {
      const effectiveSession = {
        ...session,
        observations: observationsInput,
        recommendations: recommendationsInput,
        conclusions: conclusionsInput,
      };

      await saveSession(
        {
          ...effectiveSession,
          lastUpdated: new Date().toISOString(),
        },
        { immediate: true },
      );
      await flushSession();

      // 0. Get Current User
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) throw new Error('No user found');

      // 1. Prepare Data for Local Storage
      // We keep local URIs in the 'url' field for now, SyncService will replace them later.

      const prePhotosDetails = effectiveSession.prePhotos.map(p => ({
        url: p.uri, // Local URI
        id: p.id,
        type: 'pre',
        category: p.category || 'visual',
      }));

      const postPhotosDetails = effectiveSession.postPhotos.map(p => ({
        url: p.uri, // Local URI
        id: p.id,
        type: 'post',
        category: 'visual',
      }));

      const itemObservationsFinal: Record<string, any> = {};
      const observationKeys = Object.keys(effectiveSession.itemObservations);

      for (const key of observationKeys) {
        const obs = effectiveSession.itemObservations[key];
        itemObservationsFinal[key] = {
          note: obs.note,
          photoUrl: obs.photoUri, // Local URI
        };
      }

      // 2. Prepare Final Maintenance Object
      const detailMaintenance = {
        prePhotos: prePhotosDetails,
        postPhotos: postPhotosDetails,
        checklist: effectiveSession.checklist,
        measurements: effectiveSession.measurements,
        itemObservations: itemObservationsFinal,
        observations: effectiveSession.observations,
        recommendations: effectiveSession.recommendations || '',
        conclusions: effectiveSession.conclusions || '',
        extraConditions: effectiveSession.extraConditions,
        protocol: effectiveSession.protocol,
        selectedInstruments: effectiveSession.selectedInstruments,
        completedAt: new Date().toISOString(),
      };

      // 3. Extract Photos for separate tracking in DB
      const allPhotos = [
        ...effectiveSession.prePhotos.map(p => ({
          uri: p.uri,
          type: 'pre',
          category: p.category,
        })),
        ...effectiveSession.postPhotos.map(p => ({
          uri: p.uri,
          type: 'post',
          category: 'visual',
        })),
        ...observationKeys
          .filter(k => effectiveSession.itemObservations[k].photoUri)
          .map(k => ({
            uri: effectiveSession.itemObservations[k].photoUri!,
            type: 'observation',
            observationKey: k,
          })),
      ];

      // 4. Save to Local DB
      const cleanMaintenanceId =
        maintenanceId && maintenanceId !== 'null' ? maintenanceId : null;

      const localMaintenanceId = await DatabaseService.saveOfflineMaintenance(
        userId,
        cleanMaintenanceId,
        detailMaintenance,
        allPhotos,
        effectiveSession.protocol,
      );

      if (cleanMaintenanceId) {
        await DatabaseService.updateLocalScheduledMaintenanceStatus(
          cleanMaintenanceId,
          'FINALIZADO',
        );
      }

      console.log('SUCCESS: Saved locally');

      // 5. Check connectivity and sync
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable;

      if (isOnline) {
        // Try to sync immediately
        setModalMessage('Sincronizando con el servidor...');
        try {
          await withTimeout(syncService.pushData(), SYNC_TIMEOUT_MS);

          if (localMaintenanceId == null) {
            throw new Error('No se pudo identificar el mantenimiento local.');
          }

          const syncResult =
            (await DatabaseService.getOfflineMaintenanceByLocalId(
              localMaintenanceId,
            )) as {
              status?: string | null;
              error_message?: string | null;
            } | null;

          if (!syncResult || syncResult.status !== 'synced') {
            console.warn(
              `[SYNC] Maintenance ${localMaintenanceId} not synced after pushData. status=${syncResult?.status || 'unknown'}`,
            );

            setModalStatus('offline');
            setModalMessage(
              syncResult?.error_message ||
                'Guardado local. Se reintentará la sincronización automáticamente.',
            );
            return;
          }

          // Save session notes if this is the last equipment
          if (
            isLastEquipment &&
            effectiveSession.propertyId &&
            effectiveSession.sessionDate
          ) {
            try {
              await saveSessionNotes(
                effectiveSession.propertyId,
                effectiveSession.sessionDate,
                effectiveSession.recommendations || '',
                effectiveSession.conclusions || '',
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
          // Saved locally but sync failed - continue flow with offline status
          setModalStatus('offline');
          setModalMessage(
            'Guardado local. La sincronización está tardando o falló temporalmente; se reintentará automáticamente.',
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
  }, [
    conclusionsInput,
    flushSession,
    isLastEquipment,
    maintenanceId,
    observationsInput,
    recommendationsInput,
    saveSession,
    session,
    withTimeout,
  ]);

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
        const building = nextRouteParams.building as
          | {
              id?: string;
              name?: string;
              address?: string;
              image_url?: string;
            }
          | undefined;

        router.navigate({
          pathname: '/maintenance/select-device',
          params: {
            type: nextRouteParams.maintenanceType || 'preventivo',
            buildingId: building?.id || '',
            buildingName: building?.name || '',
            buildingAddress: building?.address || '',
            buildingImageUrl: building?.image_url || '',
          },
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

  const handleObservationsChange = useCallback((text: string) => {
    setObservationsInput(text);
  }, []);

  const handleRecommendationsChange = useCallback((text: string) => {
    setRecommendationsInput(text);
  }, []);

  const handleConclusionsChange = useCallback((text: string) => {
    setConclusionsInput(text);
  }, []);

  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

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
            contentFit="cover"
            transition={100}
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
                      contentFit="cover"
                      transition={100}
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
          {renderPhotoGrid(preVisualPhotos)}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fotos Termográficas</Text>
          {renderPhotoGrid(preThermoPhotos)}
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
                value={recommendationsInput}
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
                value={conclusionsInput}
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
            value={observationsInput}
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
              {ELECTRICAL_PANEL_PROTOCOL_ITEMS.map(item => (
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
        <Pressable
          style={[styles.continueBtn, isUploading && styles.disabledBtn]}
          onPress={handleFinalize}
          disabled={isUploading}
          accessibilityRole="button">
          {isUploading ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.continueBtnText}>{uploadProgress}</Text>
            </View>
          ) : (
            <Text style={styles.continueBtnText}>Finalizar y Guardar</Text>
          )}
        </Pressable>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  submittingRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
