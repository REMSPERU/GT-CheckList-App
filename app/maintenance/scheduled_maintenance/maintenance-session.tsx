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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import MaintenanceHeader from '@/components/maintenance-header';
import PDFReportModal from '@/components/pdf-report-modal';
import { useMaintenanceByProperty } from '@/hooks/use-maintenance';
import { MaintenanceStatusEnum } from '@/types/api';
import { supabase } from '@/lib/supabase';
import { pdfReportService } from '@/services/pdf-report.service';

interface MaintenanceSession {
  date: string;
  displayDate: string;
  total: number;
  completed: number;
  inProgress: number;
  maintenances: any[];
}

export default function MaintenanceSessionScreen() {
  const router = useRouter();
  const { propertyId, propertyName } = useLocalSearchParams<{
    propertyId: string;
    propertyName?: string;
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

  // Fetch Data
  const {
    data: maintenanceData = [],
    isLoading,
    refetch,
    isRefetching,
  } = useMaintenanceByProperty(propertyId);

  // Group maintenances by date
  const sessions = useMemo(() => {
    const grouped: Record<string, MaintenanceSession> = {};

    maintenanceData.forEach((item: any) => {
      const dateKey = item.dia_programado;
      if (!dateKey) return;

      if (!grouped[dateKey]) {
        // Parse date - handle both "YYYY-MM-DD" and ISO formats
        let dateObj: Date;
        if (typeof dateKey === 'string' && dateKey.includes('T')) {
          // ISO format with time
          dateObj = new Date(dateKey);
        } else {
          // Date only format - add time to avoid timezone issues
          dateObj = new Date(dateKey + 'T12:00:00');
        }

        // Check if date is valid
        let displayDate: string;
        if (isNaN(dateObj.getTime())) {
          displayDate = dateKey; // fallback to raw string
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
          inProgress: 0,
          maintenances: [],
        };
      }

      grouped[dateKey].total++;
      grouped[dateKey].maintenances.push(item);

      if (item.estatus === MaintenanceStatusEnum.FINALIZADO) {
        grouped[dateKey].completed++;
      } else if (item.estatus === MaintenanceStatusEnum.EN_PROGRESO) {
        grouped[dateKey].inProgress++;
      }
    });

    // Sort by date ascending
    return Object.values(grouped).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [maintenanceData]);

  const getSessionStatus = (session: MaintenanceSession) => {
    if (session.completed === session.total) {
      return { label: 'COMPLETADO', color: '#10B981', bgColor: '#D1FAE5' };
    }
    if (session.completed > 0 || session.inProgress > 0) {
      return { label: 'EN PROGRESO', color: '#06B6D4', bgColor: '#CFFAFE' };
    }
    return { label: 'NO INICIADO', color: '#6B7280', bgColor: '#F3F4F6' };
  };

  const getProgressPercentage = (session: MaintenanceSession) => {
    if (session.total === 0) return 0;
    return (session.completed / session.total) * 100;
  };

  const handleSessionPress = (session: MaintenanceSession) => {
    router.push({
      pathname: '/maintenance/scheduled_maintenance/equipment-maintenance-list',
      params: {
        propertyId,
        scheduledDate: session.date,
        propertyName,
      },
    });
  };

  const handleGenerateReport = async (session: MaintenanceSession) => {
    setPdfModalVisible(true);
    setIsGeneratingPdf(true);
    setPdfUri(null);
    setGenerationProgress('Obteniendo datos de mantenimiento...');

    try {
      // Fetch maintenance responses for all completed maintenances in this session
      const maintenanceIds = session.maintenances
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

      // Fetch all maintenance_response records
      const { data: responses, error } = await supabase
        .from('maintenance_response')
        .select(
          `
          id,
          id_mantenimiento,
          detail_maintenance,
          date_created,
          user:user_created (
            first_name,
            last_name
          )
        `,
        )
        .in('id_mantenimiento', maintenanceIds);

      if (error) throw error;

      setGenerationProgress('Generando informe...');

      // Build report data in NEW format
      const equipments: any[] = [];
      let totalOkItems = 0;
      let totalIssueItems = 0;

      for (const maint of session.maintenances.filter(
        (m: any) => m.estatus === MaintenanceStatusEnum.FINALIZADO,
      )) {
        const response = responses?.find(
          (r: any) => r.id_mantenimiento === maint.id,
        );
        const detail = response?.detail_maintenance || {};

        const checklist = detail.checklist || {};
        totalOkItems += Object.values(checklist).filter(v => v === true).length;
        totalIssueItems += Object.values(checklist).filter(
          v => v === false,
        ).length;

        const firstMeasurement = detail.measurements
          ? (Object.values(detail.measurements)[0] as any)
          : null;

        // Map to new EquipmentMaintenanceData format
        const panelType =
          maint.equipos?.equipment_detail?.detalle_tecnico?.tipo_tablero ||
          maint.tipo_mantenimiento ||
          'Preventivo';

        equipments.push({
          code: maint.equipos?.codigo || 'N/A',
          label: maint.equipos?.nombre || maint.equipos?.codigo || 'N/A',
          type: panelType,
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
        });
      }

      const sessionReportData: any = {
        clientName: 'CORPORACION MG SAC', // Defaulting as per template
        address: 'Av. Del Pinar 180, Surco', // Defaulting as per template
        locationName: propertyName || 'Propiedad',
        serviceDescription: 'MANTENIMIENTO PREVENTIVO DE TABLEROS ELÉCTRICOS',
        serviceDate: session.date,
        generatedAt: new Date().toISOString(),
        equipments,
      };

      // Generate PDF using NEW method
      const uri = await pdfReportService.generateSessionPDF(sessionReportData);
      setPdfUri(uri);

      // Set summary for modal
      setReportSummary({
        propertyName: propertyName || 'Propiedad',
        sessionDate: session.displayDate,
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
          title="Sesiones de Mantenimiento"
          iconName="home-repair-service"
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
            <MaterialIcons name="event-busy" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              No hay mantenimientos programados
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }>
            {sessions.map(session => {
              const status = getSessionStatus(session);
              const progress = getProgressPercentage(session);
              const isComplete = session.completed === session.total;

              return (
                <TouchableOpacity
                  key={session.date}
                  style={styles.sessionCard}
                  onPress={() => handleSessionPress(session)}
                  activeOpacity={0.7}>
                  {/* Date Header */}
                  <View style={styles.dateRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#06B6D4"
                    />
                    <Text style={styles.dateText}>{session.displayDate}</Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progress}%`,
                            backgroundColor: status.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {session.completed}/{session.total} equipos
                    </Text>
                  </View>

                  {/* Status and Arrow */}
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: status.bgColor },
                      ]}>
                      <Text
                        style={[styles.statusText, { color: status.color }]}>
                        {status.label}
                      </Text>
                    </View>
                    {!isComplete && (
                      <Ionicons
                        name="chevron-forward"
                        size={24}
                        color="#9CA3AF"
                      />
                    )}
                  </View>

                  {/* Generate Report Button (only when complete) */}
                  {isComplete && (
                    <TouchableOpacity
                      style={styles.reportButton}
                      onPress={() => handleGenerateReport(session)}
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
                  )}
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>

      {/* PDF Report Modal */}
      <PDFReportModal
        visible={pdfModalVisible}
        onClose={handleClosePdfModal}
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
    gap: 8,
  },
  propertyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0891B2',
    flex: 1,
  },
  listContainer: {
    marginTop: 20,
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06B6D4',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
