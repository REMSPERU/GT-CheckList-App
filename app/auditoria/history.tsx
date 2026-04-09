import { AppAlertModal } from '@/components/app-alert-modal';
import DefaultHeader from '@/components/default-header';
import PDFReportModal from '@/components/pdf-report-modal';
import { auditReportService } from '@/services/audit-report.service';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AuditQuestion {
  id: string;
  question_code: string;
  question_text: string;
  order_index: number;
  section_name: string | null;
  section_order_index: number | null;
}

interface StoredPhoto {
  url?: string;
  path?: string;
}

interface StoredAuditAnswer {
  question_id: string;
  question_code: string;
  question_text?: string;
  section_name?: string | null;
  status: 'OK' | 'OBS';
  observation?: string | null;
  comment?: string | null;
  photos?: StoredPhoto[];
}

interface StoredAuditPayload {
  version: number;
  answers: StoredAuditAnswer[];
}

interface StoredSummary {
  total_questions?: number;
  total_applies?: number;
  total_not_applicable?: number;
  total_ok?: number;
  total_obs?: number;
  total_photos?: number;
}

interface OfflineAuditSession {
  local_id: number;
  auditor_id: string;
  scheduled_for: string;
  started_at: string | null;
  submitted_at: string | null;
  audit_payload: string | null;
  summary: string | null;
  sync_status: 'pending' | 'syncing' | 'synced' | 'error';
  error_message: string | null;
  created_at: string;
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseJsonSafely<T>(rawValue: string | null): T | null {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Sin fecha';
  }

  return new Date(value).toLocaleString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSyncStatusLabel(syncStatus: OfflineAuditSession['sync_status']) {
  if (syncStatus === 'synced') return 'Subida';
  if (syncStatus === 'syncing') return 'Subiendo';
  if (syncStatus === 'error') return 'Error';
  return 'Pendiente';
}

function getSyncStatusStyle(syncStatus: OfflineAuditSession['sync_status']) {
  if (syncStatus === 'synced') return styles.badgeSynced;
  if (syncStatus === 'syncing') return styles.badgeSyncing;
  if (syncStatus === 'error') return styles.badgeError;
  return styles.badgePending;
}

function normalizeAuditStatus(value: string | undefined): 'OK' | 'OBS' | 'N/A' {
  if (value === 'OK' || value === 'OBS') {
    return value;
  }

  return 'N/A';
}

export default function AuditoriaHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    buildingId?: string;
    buildingName?: string;
    buildingAddress?: string;
    buildingImageUrl?: string;
  }>();

  const buildingId = getSingleParam(params.buildingId);
  const buildingName = getSingleParam(params.buildingName) || 'Inmueble';
  const buildingAddress = getSingleParam(params.buildingAddress) || '';
  const buildingImageUrl = getSingleParam(params.buildingImageUrl) || '';

  const [sessions, setSessions] = useState<OfflineAuditSession[]>([]);
  const [questions, setQuestions] = useState<AuditQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState('');
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = useCallback((title: string, message: string) => {
    setAlert({ visible: true, title, message });
  }, []);

  const closeAlert = useCallback(() => {
    setAlert({ visible: false, title: '', message: '' });
  }, []);

  const loadHistory = useCallback(async () => {
    if (!buildingId) {
      setSessions([]);
      setQuestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [localSessions, localQuestions] = await Promise.all([
        DatabaseService.getAuditSessionsByProperty(buildingId),
        DatabaseService.getAuditQuestions(),
      ]);

      setSessions((localSessions || []) as OfflineAuditSession[]);
      setQuestions((localQuestions || []) as AuditQuestion[]);
    } catch (error) {
      console.error('Failed to load audit history:', error);
      showAlert('Error', 'No se pudo cargar el historial de auditoria.');
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, showAlert]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  const handleRefresh = useCallback(async () => {
    if (!buildingId) {
      return;
    }

    setIsRefreshing(true);
    try {
      await syncService.pushData();
      await syncService.pullData();
      await loadHistory();
    } catch (error) {
      console.error('Failed to refresh audit history:', error);
      showAlert('Error', 'No se pudo actualizar el estado de sincronizacion.');
    } finally {
      setIsRefreshing(false);
    }
  }, [buildingId, loadHistory, showAlert]);

  const handleCreateAudit = useCallback(() => {
    if (!buildingId) {
      showAlert('Error', 'No se encontro el inmueble para auditar.');
      return;
    }

    router.push({
      pathname: '/auditoria/session',
      params: {
        buildingId,
        buildingName,
        buildingAddress,
        buildingImageUrl,
      },
    });
  }, [
    buildingAddress,
    buildingId,
    buildingImageUrl,
    buildingName,
    router,
    showAlert,
  ]);

  const handleGenerateReport = useCallback(
    async (session: OfflineAuditSession) => {
      if (session.sync_status !== 'synced') {
        showAlert(
          'Sincronizacion pendiente',
          'Solo puede generar informe cuando la auditoria este subida.',
        );
        return;
      }

      const payload = parseJsonSafely<StoredAuditPayload>(
        session.audit_payload,
      );
      if (!payload || !Array.isArray(payload.answers)) {
        showAlert(
          'Error',
          'No se encontro informacion valida de la auditoria.',
        );
        return;
      }

      setPdfModalVisible(true);
      setPdfUri(null);
      setIsGeneratingPdf(true);

      try {
        setGenerationProgress('Preparando datos del informe...');

        const questionsSorted = [...questions].sort((a, b) => {
          const sectionA = a.section_order_index ?? 999999;
          const sectionB = b.section_order_index ?? 999999;
          if (sectionA !== sectionB) {
            return sectionA - sectionB;
          }

          return a.order_index - b.order_index;
        });

        const answersByQuestionId = new Map<string, StoredAuditAnswer>();
        payload.answers.forEach(answer => {
          answersByQuestionId.set(answer.question_id, answer);
        });

        const items = questionsSorted.map((question, index) => {
          const answer = answersByQuestionId.get(question.id);

          return {
            order: index + 1,
            questionCode: question.question_code,
            questionText: answer?.question_text || question.question_text,
            sectionName: answer?.section_name ?? question.section_name,
            status: normalizeAuditStatus(answer?.status),
            observation: answer?.observation || answer?.comment || null,
            photosCount: answer?.photos?.length || 0,
          };
        });

        const additionalAnswers = payload.answers.filter(answer => {
          return !questionsSorted.some(
            question => question.id === answer.question_id,
          );
        });

        additionalAnswers.forEach(answer => {
          items.push({
            order: items.length + 1,
            questionCode: answer.question_code,
            questionText: answer.question_text || answer.question_code,
            sectionName: answer.section_name || null,
            status: normalizeAuditStatus(answer.status),
            observation: answer.observation || answer.comment || null,
            photosCount: answer.photos?.length || 0,
          });
        });

        const parsedSummary = parseJsonSafely<StoredSummary>(session.summary);
        const totalQuestions = parsedSummary?.total_questions ?? items.length;
        const totalNotApplicable =
          parsedSummary?.total_not_applicable ??
          items.filter(item => item.status === 'N/A').length;
        const totalOk =
          parsedSummary?.total_ok ??
          items.filter(item => item.status === 'OK').length;
        const totalObs =
          parsedSummary?.total_obs ??
          items.filter(item => item.status === 'OBS').length;
        const totalPhotos =
          parsedSummary?.total_photos ??
          items.reduce((acc, item) => acc + item.photosCount, 0);
        const totalApplicable =
          parsedSummary?.total_applies ?? totalQuestions - totalNotApplicable;

        setGenerationProgress('Generando archivo PDF...');

        const reportUri = await auditReportService.generatePDF({
          propertyName: buildingName,
          propertyAddress: buildingAddress || null,
          auditorLabel: session.auditor_id,
          scheduledFor: session.scheduled_for,
          startedAt: formatDateTime(session.started_at),
          submittedAt: formatDateTime(session.submitted_at),
          generatedAt: formatDateTime(new Date().toISOString()),
          summary: {
            totalQuestions,
            totalApplicable,
            totalNotApplicable,
            totalOk,
            totalObs,
            totalPhotos,
          },
          items,
        });

        setPdfUri(reportUri);
      } catch (error) {
        console.error('Failed to generate audit report:', error);
        showAlert('Error', 'No se pudo generar el informe de auditoria.');
      } finally {
        setIsGeneratingPdf(false);
      }
    },
    [buildingAddress, buildingName, questions, showAlert],
  );

  const handleClosePdfModal = useCallback(() => {
    if (isGeneratingPdf) {
      return;
    }

    setPdfModalVisible(false);
    setPdfUri(null);
    setGenerationProgress('');
  }, [isGeneratingPdf]);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const dateA = a.submitted_at || a.created_at;
      const dateB = b.submitted_at || b.created_at;
      return dateB.localeCompare(dateA);
    });
  }, [sessions]);

  if (!buildingId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No se encontro el inmueble.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWrapper}>
        <DefaultHeader
          title="Historial de auditoria"
          shouldShowBackButton={true}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.buildingCard}>
          <Text style={styles.buildingName}>{buildingName}</Text>
          {!!buildingAddress && (
            <Text style={styles.buildingAddress}>{buildingAddress}</Text>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.pressed,
          ]}
          onPress={handleCreateAudit}>
          <Text style={styles.createButtonText}>Nueva auditoria</Text>
        </Pressable>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" />
            <Text style={styles.statusText}>Cargando historial...</Text>
          </View>
        ) : (
          <FlatList
            data={sortedSessions}
            keyExtractor={item => String(item.local_id)}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
              />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Aun no hay auditorias registradas para este inmueble.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const summary = parseJsonSafely<StoredSummary>(item.summary);
              const totalQuestions = summary?.total_questions ?? 0;
              const totalOk = summary?.total_ok ?? 0;
              const totalObs = summary?.total_obs ?? 0;

              return (
                <View style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionDate}>
                      {formatDateTime(item.submitted_at || item.created_at)}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        getSyncStatusStyle(item.sync_status),
                      ]}>
                      <Text style={styles.statusBadgeText}>
                        {getSyncStatusLabel(item.sync_status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.sessionSummaryText}>
                    Preguntas: {totalQuestions} | OK: {totalOk} | OBS:{' '}
                    {totalObs}
                  </Text>

                  {item.sync_status === 'error' && item.error_message ? (
                    <Text style={styles.errorMessage}>
                      {item.error_message}
                    </Text>
                  ) : null}

                  <Pressable
                    style={({ pressed }) => [
                      styles.reportButton,
                      item.sync_status !== 'synced' &&
                        styles.reportButtonDisabled,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleGenerateReport(item)}
                    disabled={item.sync_status !== 'synced' || isGeneratingPdf}>
                    <Text style={styles.reportButtonText}>Generar informe</Text>
                  </Pressable>
                </View>
              );
            }}
          />
        )}
      </View>

      <AppAlertModal
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={closeAlert}
      />

      <PDFReportModal
        visible={pdfModalVisible}
        onClose={handleClosePdfModal}
        title="Informe de Auditoria"
        pdfUri={pdfUri}
        isGenerating={isGeneratingPdf}
        generationProgress={generationProgress || 'Generando informe...'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerWrapper: {
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  buildingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  buildingName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  buildingAddress: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  createButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: '#0891B2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sessionDate: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeSyncing: {
    backgroundColor: '#DBEAFE',
  },
  badgeSynced: {
    backgroundColor: '#DCFCE7',
  },
  badgeError: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  sessionSummaryText: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 10,
  },
  reportButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0891B2',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportButtonDisabled: {
    opacity: 0.45,
  },
  reportButtonText: {
    color: '#0891B2',
    fontSize: 14,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    marginTop: 8,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 12,
    color: '#B91C1C',
    marginBottom: 10,
  },
  pressed: {
    opacity: 0.82,
  },
});
