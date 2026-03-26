import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaintenanceHeader from '@/components/maintenance-header';
import PDFReportModal from '@/components/pdf-report-modal';
import { ReportTypeModal } from '@/components/ReportTypeModal';
import { useMaintenanceByProperty } from '@/hooks/use-maintenance';
import { MaintenanceStatusEnum } from '@/types/api';
import { supabase } from '@/lib/supabase';
import {
  pdfReportService as newPdfReportService,
  ReportType,
  MaintenanceSessionReport,
} from '@/services/pdf-report';

interface SessionHistoryItem {
  date: string;
  displayDate: string;
  total: number;
  completed: number;
  maintenances: any[];
  codigo?: string;
  type?: string;
  equipmentType?: string;
}

export default function SessionHistoryScreen() {
  const { propertyId, propertyName, equipmentType } = useLocalSearchParams<{
    propertyId: string;
    propertyName?: string;
    equipmentType?: string;
  }>();

  // PDF Report State
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [reportSummary, setReportSummary] = useState<{
    propertyName: string;
    sessionDate: string;
    totalEquipments: number;
    totalOk: number;
    totalIssues: number;
  } | null>(null);
  const [pdfModalTitle, setPdfModalTitle] = useState('');

  // Report Type Selection State
  const [reportTypeModalVisible, setReportTypeModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<SessionHistoryItem | null>(null);
  const activeGenerationIdRef = useRef(0);

  // Fetch Data (reusing maintenance hook)
  const {
    data: maintenanceData = [],
    isLoading,
    refetch,
    isRefetching,
  } = useMaintenanceByProperty(propertyId);

  // Group maintenances by date - filtering ONLY COMPLETED sessions (or partially completed)
  const sessions = useMemo(() => {
    const grouped: Record<string, SessionHistoryItem> = {};

    maintenanceData.forEach((item: any) => {
      // 1. Filter by Equipment Type if provided
      const itemEquipType = item.equipos?.equipamentos?.nombre;
      if (equipmentType) {
        // Simple check: does the item's equipment type match the requested filter?
        // We'll use startWith or includes for safety.
        // e.g. "Tableros Eléctricos" vs "Luces de Emergencia"
        if (
          !itemEquipType ||
          !itemEquipType.toLowerCase().includes(equipmentType.toLowerCase())
        ) {
          return;
        }
      }

      // Only interested in items that are part of a history (usually means they are done or started)
      // But user asked for "completed" sessions mainly. Let's include everything for history,
      // but only allow report generation if completed.
      const dateKey = item.dia_programado;
      if (!dateKey) return;

      if (!grouped[dateKey]) {
        let dateObj: Date;
        if (typeof dateKey === 'string' && dateKey.includes('T')) {
          dateObj = new Date(dateKey);
        } else {
          dateObj = new Date(dateKey + 'T12:00:00');
        }

        let displayDate: string;
        if (isNaN(dateObj.getTime())) {
          displayDate = dateKey;
        } else {
          const formatted = dateObj.toLocaleDateString('es-PE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
          displayDate = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }

        grouped[dateKey] = {
          date: dateKey,
          displayDate,
          total: 0,
          completed: 0,
          maintenances: [],
          codigo: item.codigo,
          type: item.tipo_mantenimiento || 'Preventivo',
          equipmentType: itemEquipType || 'Desconocido',
        };
      }

      grouped[dateKey].total++;
      grouped[dateKey].maintenances.push(item);

      if (item.estatus === MaintenanceStatusEnum.FINALIZADO) {
        grouped[dateKey].completed++;
      }
    });

    // Filter to show only sessions that have at least one completed item or are fully done?
    // User requested: "donde esten los mantenimientos ya realizados" (maintenances already done).
    // Let's filter sessions where at least one item is completed, or maybe where ALL are completed?
    // "para lo de informe deben estar todos completados" -> For report, ALL MUST BE COMPLETED.
    // So for the LIST, I'll show all, but disable report button if not complete.

    return Object.values(grouped).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(), // Descending order for history
    );
  }, [maintenanceData, equipmentType]);

  const handleShowReportOptions = useCallback((session: SessionHistoryItem) => {
    setSelectedSession(session);
    setReportTypeModalVisible(true);
  }, []);

  const handleReportTypeSelect = async (type: ReportType) => {
    if (!selectedSession) return;

    const generationId = activeGenerationIdRef.current + 1;
    activeGenerationIdRef.current = generationId;
    const isActiveGeneration = () =>
      activeGenerationIdRef.current === generationId;

    setReportTypeModalVisible(false);
    setPdfModalVisible(true);
    setIsGeneratingPdf(true);
    setPdfUri(null);

    let title = '';
    let progress = '';

    switch (type) {
      case ReportType.TECHNICAL:
        title = 'Informe Técnico';
        progress = 'Generando informe técnico...';
        break;
      case ReportType.PAT:
        title = 'Informe Técnico SPAT';
        progress = 'Generando informe técnico de pozo a tierra...';
        break;
      case ReportType.PROTOCOL:
        title = 'Protocolo de Mantenimiento';
        progress = 'Generando protocolo...';
        break;
      case ReportType.OPERABILITY:
        title = 'Certificado de Operatividad';
        progress = 'Generando certificado...';
        break;
    }

    setPdfModalTitle(title);
    setGenerationProgress(progress);

    try {
      const isPATReport = type === ReportType.PAT;
      const normalizePhotoUrl = (photo: any): string | undefined => {
        if (!photo) return undefined;
        if (typeof photo === 'string') return photo;
        if (typeof photo === 'object') {
          return photo.url || photo.uri || photo.remote_url || undefined;
        }
        return undefined;
      };

      const maintenanceIds = selectedSession.maintenances
        .filter((m: any) => m.estatus === MaintenanceStatusEnum.FINALIZADO)
        .map((m: any) => m.id);

      if (maintenanceIds.length === 0) {
        Alert.alert(
          'Sin datos',
          'No hay mantenimientos finalizados para generar el informe.',
        );
        if (isActiveGeneration()) {
          setPdfModalVisible(false);
          setIsGeneratingPdf(false);
        }
        return;
      }

      setGenerationProgress('Cargando detalles de mantenimiento...');

      const { data: responses, error } = await supabase
        .from('maintenance_response')
        .select(
          `
          id,
          id_mantenimiento,
          detail_maintenance,
          protocol,
          date_created,
          user:user_created (
            first_name,
            last_name
          )
        `,
        )
        .in('id_mantenimiento', maintenanceIds);

      if (error) throw error;

      if (!isActiveGeneration()) {
        return;
      }

      setGenerationProgress('Procesando datos del informe...');

      const equipments: any[] = [];
      let totalOkItems = 0;
      let totalIssueItems = 0;

      for (const maint of selectedSession.maintenances.filter(
        (m: any) => m.estatus === MaintenanceStatusEnum.FINALIZADO,
      )) {
        const response = responses?.find(
          (r: any) => r.id_mantenimiento === maint.id,
        );
        const detail = response?.detail_maintenance || {};

        if (
          isPATReport &&
          (detail.type === 'grounding_well_checklist' ||
            detail.preMeasurement !== undefined ||
            detail.postMeasurement !== undefined)
        ) {
          const executionStatus =
            detail.executionStatus === 'reprogrammed'
              ? 'reprogrammed'
              : 'completed';
          const reprogramComment =
            typeof detail.reprogramComment === 'string'
              ? detail.reprogramComment
              : '';
          const isReprogrammed = executionStatus === 'reprogrammed';

          const checklistKeys = ['hasSignage', 'connectorsOk', 'hasAccess'];
          const checklistItems = checklistKeys.map(key => ({
            key,
            item: detail[key] || { value: true, observation: '', photo: null },
          }));

          if (!isReprogrammed) {
            totalOkItems += checklistItems.filter(
              entry => entry.item.value,
            ).length;
            totalIssueItems += checklistItems.filter(
              entry => !entry.item.value,
            ).length;
          }

          const prePhotos: { url: string; caption?: string }[] = [];
          const thermoPhotos: { url: string; caption?: string }[] = [];
          const postPhotos: { url: string; caption?: string }[] = [];

          const preMeasurementPhoto = normalizePhotoUrl(
            detail.preMeasurementPhoto,
          );
          const greasePhoto = normalizePhotoUrl(detail.greaseApplicationPhoto);
          const thorGelPhoto = normalizePhotoUrl(detail.thorGelPhoto);
          const postMeasurementPhoto = normalizePhotoUrl(
            detail.postMeasurementPhoto,
          );
          const lidStatusPhoto = normalizePhotoUrl(detail.lidStatusPhoto);

          if (preMeasurementPhoto) {
            thermoPhotos.push({
              url: preMeasurementPhoto,
              caption: 'preMeasurement',
            });
          }
          if (greasePhoto) {
            postPhotos.push({ url: greasePhoto, caption: 'greaseApplication' });
          }
          if (thorGelPhoto) {
            postPhotos.push({ url: thorGelPhoto, caption: 'thorGel' });
          }
          if (postMeasurementPhoto) {
            thermoPhotos.push({
              url: postMeasurementPhoto,
              caption: 'postMeasurement',
            });
          }
          if (lidStatusPhoto) {
            prePhotos.push({ url: lidStatusPhoto, caption: 'lidStatus' });
          }

          checklistItems.forEach(({ key, item }) => {
            const photoUrl = normalizePhotoUrl(item.photo);
            if (photoUrl) {
              prePhotos.push({ url: photoUrl, caption: key });
            }
          });

          equipments.push({
            code: maint.equipos?.codigo || 'N/A',
            label: maint.equipos?.nombre || maint.equipos?.codigo || 'N/A',
            type: 'POZO A TIERRA',
            model: 'N/A',
            location: maint.equipos?.ubicacion || 'N/A',
            detalle_ubicacion: maint.equipos?.detalle_ubicacion || '',
            voltage: detail.preMeasurement || undefined,
            amperage: detail.postMeasurement || undefined,
            cableSize: undefined,
            circuits: checklistItems.length,
            prePhotos,
            thermoPhotos,
            postPhotos,
            observations: detail.generalObservation || '',
            itemObservations: {
              lidStatus: {
                note:
                  detail.lidStatus === 'bad'
                    ? detail.lidStatusObservation || 'Tapa en mal estado'
                    : 'Tapa en buen estado',
                photoUrl: lidStatusPhoto,
              },
              hasSignage: {
                note:
                  detail.hasSignage?.observation ||
                  (detail.hasSignage?.value
                    ? 'Conforme'
                    : 'Sin observación registrada'),
                photoUrl: normalizePhotoUrl(detail.hasSignage?.photo),
              },
              connectorsOk: {
                note:
                  detail.connectorsOk?.observation ||
                  (detail.connectorsOk?.value
                    ? 'Conforme'
                    : 'Sin observación registrada'),
                photoUrl: normalizePhotoUrl(detail.connectorsOk?.photo),
              },
              hasAccess: {
                note:
                  detail.hasAccess?.observation ||
                  (detail.hasAccess?.value
                    ? 'Conforme'
                    : 'Sin observación registrada'),
                photoUrl: normalizePhotoUrl(detail.hasAccess?.photo),
              },
            },
            protocol: {
              hasSignage: detail.hasSignage?.value ?? true,
              connectorsOk: detail.connectorsOk?.value ?? true,
              hasAccess: detail.hasAccess?.value ?? true,
            },
            patData: {
              executionStatus,
              reprogramComment,
              maintenanceType: detail.maintenanceType || null,
              preMeasurement: detail.preMeasurement || '',
              preMeasurementPhoto,
              greaseApplicationPhoto: greasePhoto,
              thorGelPhoto,
              postMeasurement: detail.postMeasurement || '',
              postMeasurementPhoto,
              generalObservation: detail.generalObservation || '',
              lidStatus: detail.lidStatus || null,
              lidStatusObservation: detail.lidStatusObservation || '',
              lidStatusPhoto,
              hasSignage: detail.hasSignage || {
                value: true,
                observation: '',
                photo: null,
              },
              connectorsOk: detail.connectorsOk || {
                value: true,
                observation: '',
                photo: null,
              },
              hasAccess: detail.hasAccess || {
                value: true,
                observation: '',
                photo: null,
              },
            },
          });

          continue;
        }

        const checklist = detail.checklist || {};
        totalOkItems += Object.values(checklist).filter(
          (v: any) => v === true,
        ).length;
        totalIssueItems += Object.values(checklist).filter(
          (v: any) => v === false,
        ).length;

        const firstMeasurement = detail.measurements
          ? (Object.values(detail.measurements)[0] as any)
          : null;

        const panelType =
          maint.equipos?.equipment_detail?.detalle_tecnico?.tipo_tablero ||
          maint.tipo_mantenimiento ||
          'Preventivo';

        equipments.push({
          code: maint.equipos?.codigo || 'N/A',
          label: maint.equipos?.nombre || maint.equipos?.codigo || 'N/A',
          type: panelType,
          model:
            maint.equipos?.equipment_detail?.detalle_tecnico?.modelo ||
            'ADOSADO',
          location: maint.equipos?.ubicacion || 'N/A',
          detalle_ubicacion: maint.equipos?.detalle_ubicacion || '',
          voltage: firstMeasurement?.voltage,
          amperage: firstMeasurement?.amperage,
          cableSize: firstMeasurement?.cableDiameter,
          circuits: detail.checklist ? Object.keys(detail.checklist).length : 0,
          prePhotos: (detail.prePhotos || [])
            .filter((p: any) => p.category !== 'thermo')
            .map((p: any) => ({ url: p.url || p.uri })),
          thermoPhotos: (detail.prePhotos || [])
            .filter((p: any) => p.category === 'thermo')
            .map((p: any) => ({ url: p.url || p.uri })),
          postPhotos: (detail.postPhotos || []).map((p: any) => ({
            url: p.url || p.uri,
          })),
          observations: detail.observations,
          itemObservations: detail.itemObservations,
          protocol: response?.protocol || detail.protocol,
        });
      }

      if (!isActiveGeneration()) {
        return;
      }

      // Build report data
      const reportData: MaintenanceSessionReport = {
        clientName: 'CORPORACION MG SAC',
        address: 'Av. Del Pinar 180, Surco',
        locationName: propertyName || 'Propiedad',
        serviceDescription: isPATReport
          ? 'MANTENIMIENTO PREVENTIVO DE SISTEMA DE PUESTA A TIERRA'
          : 'MANTENIMIENTO PREVENTIVO DE TABLEROS ELÉCTRICOS',
        serviceDate: selectedSession.date,
        generatedAt: new Date().toISOString(),
        sessionCode: selectedSession.codigo,
        equipments,
        measurementInstrument: isPATReport
          ? {
              name: 'TELURÓMETRO',
              brand: 'HIOKI',
              model: 'N/A',
              serial: 'N/A',
            }
          : {
              name: 'PINZA MULTIMÉTRICA',
              brand: 'FLUKE',
              model: '376FC',
              serial: 'VERIFICAR',
            },
      };

      setGenerationProgress('Generando archivo PDF...');
      const uri = await newPdfReportService.generateReport(type, reportData);

      if (!isActiveGeneration()) {
        return;
      }

      setPdfUri(uri);

      setReportSummary({
        propertyName: propertyName || 'Propiedad',
        sessionDate: selectedSession.displayDate,
        totalEquipments: equipments.length,
        totalOk: totalOkItems,
        totalIssues: totalIssueItems,
      });
    } catch (error) {
      if (!isActiveGeneration()) {
        return;
      }

      console.error('Error generating report:', error);
      Alert.alert(
        'Error',
        'No se pudo generar el informe. Intente nuevamente.',
      );
      setPdfModalVisible(false);
    } finally {
      if (isActiveGeneration()) {
        setIsGeneratingPdf(false);
      }
    }
  };

  const handleClosePdfModal = () => {
    activeGenerationIdRef.current += 1;
    setIsGeneratingPdf(false);
    setGenerationProgress('');
    setPdfModalVisible(false);
    setPdfUri(null);
    setReportSummary(null);
  };

  const renderSessionItem = useCallback(
    ({ item: session }: { item: SessionHistoryItem }) => {
      const isComplete =
        session.completed === session.total && session.total > 0;

      return (
        <View style={styles.sessionCard}>
          <View style={styles.cardHeader}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={20} color="#06B6D4" />
              <Text style={styles.dateText}>{session.displayDate}</Text>
            </View>
            {session.codigo && (
              <Text style={styles.codigoMainText}>{session.codigo}</Text>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Equipos</Text>
              <Text style={styles.statValue}>{session.total}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Completados</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: isComplete ? '#10B981' : '#F59E0B' },
                ]}>
                {session.completed}
              </Text>
            </View>
          </View>

          {isComplete ? (
            <Pressable
              style={({ pressed }) => [
                styles.reportButton,
                pressed && styles.pressed,
              ]}
              onPress={() => handleShowReportOptions(session)}
              accessibilityRole="button">
              <Ionicons name="document-text-outline" size={20} color="#fff" />
              <Text style={styles.reportButtonText}>Generar Informe</Text>
            </Pressable>
          ) : (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Mantenimiento en Progreso</Text>
            </View>
          )}
        </View>
      );
    },
    [handleShowReportOptions],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <MaintenanceHeader
          title="Historial de Mantenimientos"
          iconName="history"
        />

        {propertyName && (
          <View style={styles.propertyBadge}>
            <Ionicons name="business-outline" size={18} color="#06B6D4" />
            <Text style={styles.propertyName}>{propertyName}</Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#06B6D4" />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.centerContainer}>
            <MaterialIcons
              name="history-toggle-off"
              size={64}
              color="#D1D5DB"
            />
            <Text style={styles.emptyText}>No hay historial disponible</Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={item => item.date}
            renderItem={renderSessionItem}
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews
          />
        )}
      </View>

      <ReportTypeModal
        visible={reportTypeModalVisible}
        onClose={() => setReportTypeModalVisible(false)}
        onSelectType={handleReportTypeSelect}
        isGenerating={isGeneratingPdf}
        equipmentType={selectedSession?.equipmentType}
      />

      <PDFReportModal
        visible={pdfModalVisible}
        onClose={handleClosePdfModal}
        title={pdfModalTitle}
        pdfUri={pdfUri}
        isGenerating={isGeneratingPdf}
        generationProgress={generationProgress}
        reportSummary={reportSummary ?? undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7FA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  propertyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0891B2',
    flex: 1,
  },
  listContainer: {
    marginTop: 12,
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  codigoMainText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 28,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06B6D4',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  pendingText: {
    color: '#D97706',
    fontWeight: '600',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.82,
  },
});
