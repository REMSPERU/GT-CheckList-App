import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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

  const handleShowReportOptions = (session: SessionHistoryItem) => {
    setSelectedSession(session);
    setReportTypeModalVisible(true);
  };

  const handleReportTypeSelect = async (type: ReportType) => {
    if (!selectedSession) return;

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
      const maintenanceIds = selectedSession.maintenances
        .filter((m: any) => m.estatus === MaintenanceStatusEnum.FINALIZADO)
        .map((m: any) => m.id);

      if (maintenanceIds.length === 0) {
        Alert.alert(
          'Sin datos',
          'No hay mantenimientos finalizados para generar el informe.',
        );
        setPdfModalVisible(false);
        setIsGeneratingPdf(false);
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

      // Build report data
      const reportData: MaintenanceSessionReport = {
        clientName: 'CORPORACION MG SAC',
        address: 'Av. Del Pinar 180, Surco',
        locationName: propertyName || 'Propiedad',
        serviceDescription: 'MANTENIMIENTO PREVENTIVO DE TABLEROS ELÉCTRICOS',
        serviceDate: selectedSession.date,
        generatedAt: new Date().toISOString(),
        sessionCode: selectedSession.codigo,
        equipments,
        measurementInstrument: {
          name: 'PINZA MULTIMÉTRICA',
          brand: 'FLUKE',
          model: '376FC',
          serial: 'VERIFICAR',
        },
      };

      setGenerationProgress('Generando archivo PDF...');
      const uri = await newPdfReportService.generateReport(type, reportData);
      setPdfUri(uri);

      setReportSummary({
        propertyName: propertyName || 'Propiedad',
        sessionDate: selectedSession.displayDate,
        totalEquipments: equipments.length,
        totalOk: totalOkItems,
        totalIssues: totalIssueItems,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert(
        'Error',
        'No se pudo generar el informe. Intente nuevamente.',
      );
      setPdfModalVisible(false);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleClosePdfModal = () => {
    setPdfModalVisible(false);
    setPdfUri(null);
    setReportSummary(null);
  };

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
          <ScrollView
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }>
            {sessions.map(session => {
              const isComplete =
                session.completed === session.total && session.total > 0;

              return (
                <View key={session.date} style={styles.sessionCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.dateRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color="#06B6D4"
                      />
                      <Text style={styles.dateText}>{session.displayDate}</Text>
                    </View>
                    {session.codigo && (
                      <Text style={styles.codigoMainText}>
                        {session.codigo}
                      </Text>
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
                    <TouchableOpacity
                      style={styles.reportButton}
                      onPress={() => handleShowReportOptions(session)}
                      activeOpacity={0.8}>
                      <Ionicons
                        name="document-text-outline"
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.reportButtonText}>
                        Generar Informe
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>
                        Mantenimiento en Progreso
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
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
});
