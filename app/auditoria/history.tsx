import { AppAlertModal } from '@/components/app-alert-modal';
import { historyScreenStyles as styles } from '@/components/auditoria/history-screen-styles';
import { HistorySessionCard } from '@/components/auditoria/history-session-card';
import DefaultHeader from '@/components/default-header';
import PDFReportModal from '@/components/pdf-report-modal';
import { useAuth } from '@/contexts/AuthContext';
import {
  extractPhotoUris,
  formatDateTime,
  getAuditorDisplayLabel,
  getSingleParam,
  normalizeAuditStatus,
  parseJsonSafely,
} from '@/lib/auditoria/history-utils';
import { supabase } from '@/lib/supabase';
import { auditReportService } from '@/services/audit-report.service';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';
import type {
  AuditQuestion,
  LocalUserRecord,
  OfflineAuditSession,
  StoredAuditAnswer,
  StoredAuditPayload,
  StoredSummary,
} from '@/types/auditoria';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuditoriaHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
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
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
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

  const loadLocalHistory = useCallback(async () => {
    if (!buildingId) {
      setSessions([]);
      setQuestions([]);
      return;
    }

    const [localSessions, localQuestions] = await Promise.all([
      DatabaseService.getAuditSessionsByProperty(buildingId),
      DatabaseService.getAuditQuestions(),
    ]);

    setSessions((localSessions || []) as OfflineAuditSession[]);
    setQuestions((localQuestions || []) as AuditQuestion[]);
  }, [buildingId]);

  const syncHistoryInBackground = useCallback(async () => {
    if (!buildingId) {
      return;
    }

    setIsBackgroundSyncing(true);
    try {
      await syncService.pullData();
      await loadLocalHistory();
    } catch (error) {
      console.error('Failed to sync audit history in background:', error);
    } finally {
      setIsBackgroundSyncing(false);
    }
  }, [buildingId, loadLocalHistory]);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.race([
        loadLocalHistory(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('AUDIT_HISTORY_LOCAL_LOAD_TIMEOUT')),
            4000,
          ),
        ),
      ]);
      void syncHistoryInBackground();
    } catch (error) {
      console.error('Failed to load audit history:', error);
      showAlert(
        'Error',
        'La base local tardo demasiado en responder. Intente actualizar.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadLocalHistory, showAlert, syncHistoryInBackground]);

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
      await syncService.pullData(true);
      await loadLocalHistory();
    } catch (error) {
      console.error('Failed to refresh audit history:', error);
      showAlert('Error', 'No se pudo actualizar el estado de sincronizacion.');
    } finally {
      setIsRefreshing(false);
    }
  }, [buildingId, loadLocalHistory, showAlert]);

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

        let localAuditor = (await DatabaseService.getLocalUserById(
          session.auditor_id,
        )) as LocalUserRecord | null;

        const hasLocalFullName = Boolean(
          `${localAuditor?.first_name?.trim() || ''} ${localAuditor?.last_name?.trim() || ''}`.trim(),
        );

        if (!hasLocalFullName) {
          try {
            const { data: remoteAuditor, error } = await supabase
              .from('users')
              .select('id, email, username, first_name, last_name')
              .eq('id', session.auditor_id)
              .maybeSingle();

            if (error) {
              throw error;
            }

            if (remoteAuditor) {
              localAuditor = {
                ...localAuditor,
                ...(remoteAuditor as LocalUserRecord),
              };

              if (remoteAuditor.email) {
                await DatabaseService.saveCurrentUser({
                  id: remoteAuditor.id,
                  email: remoteAuditor.email,
                  username: remoteAuditor.username ?? undefined,
                  first_name: remoteAuditor.first_name ?? undefined,
                  last_name: remoteAuditor.last_name ?? undefined,
                });
              }
            }
          } catch (error) {
            console.error(
              'Failed to resolve auditor profile for report:',
              error,
            );
          }
        }

        const resolvedAuditor =
          session.auditor_id === user?.id
            ? {
                ...localAuditor,
                first_name:
                  localAuditor?.first_name ?? user.user_metadata?.first_name,
                last_name:
                  localAuditor?.last_name ?? user.user_metadata?.last_name,
                username: localAuditor?.username,
                email: localAuditor?.email ?? user.email,
              }
            : localAuditor;

        const auditorLabel = getAuditorDisplayLabel(
          resolvedAuditor,
          session.auditor_id,
        );

        const questionsSorted = [...questions].sort((a, b) => {
          const sectionA = a.section_order_index ?? 999999;
          const sectionB = b.section_order_index ?? 999999;
          if (sectionA !== sectionB) {
            return sectionA - sectionB;
          }

          const equipmentA = a.equipment_name ?? '';
          const equipmentB = b.equipment_name ?? '';
          const equipmentCompare = equipmentA.localeCompare(equipmentB);
          if (equipmentCompare !== 0) {
            return equipmentCompare;
          }

          const textCompare = a.question_text.localeCompare(b.question_text);
          if (textCompare !== 0) {
            return textCompare;
          }

          return a.id.localeCompare(b.id);
        });

        const answersByQuestionId = new Map<string, StoredAuditAnswer>();
        payload.answers.forEach(answer => {
          answersByQuestionId.set(answer.question_id, answer);
        });

        const allItems = questionsSorted.map((question, index) => {
          const answer = answersByQuestionId.get(question.id);
          const photos = extractPhotoUris(answer?.photos);

          return {
            order: index + 1,
            questionText: question.question_text,
            sectionName: question.section_name,
            equipmentName: question.equipment_name,
            status: normalizeAuditStatus(answer?.status),
            observation: answer?.comment || null,
            photosCount: photos.length,
            photoUris: photos,
          };
        });

        const items = allItems
          .filter(item => item.status !== 'N/A')
          .map((item, index) => ({
            ...item,
            order: index + 1,
          }));

        const evidencePhotos = items.flatMap(item => {
          if (!item.photoUris.length) {
            return [];
          }

          return item.photoUris.map(url => ({
            order: item.order,
            questionText: item.questionText,
            sectionName: item.sectionName,
            equipmentName: item.equipmentName,
            observation: item.observation,
            url,
          }));
        });

        const parsedSummary = parseJsonSafely<StoredSummary>(session.summary);
        const totalQuestions =
          parsedSummary?.total_questions ?? allItems.length;
        const totalNotApplicable =
          parsedSummary?.total_not_applicable ??
          allItems.filter(item => item.status === 'N/A').length;
        const totalOk =
          parsedSummary?.total_ok ??
          allItems.filter(item => item.status === 'OK').length;
        const totalObs =
          parsedSummary?.total_obs ??
          allItems.filter(item => item.status === 'OBS').length;
        const totalPhotos =
          parsedSummary?.total_photos ??
          allItems.reduce((acc, item) => acc + item.photosCount, 0);
        const totalApplicable =
          parsedSummary?.total_applies ?? totalQuestions - totalNotApplicable;

        setGenerationProgress('Generando archivo PDF...');

        const reportUri = await auditReportService.generatePDF({
          propertyName: buildingName,
          propertyAddress: buildingAddress || null,
          auditorLabel,
          scheduledFor: formatDateTime(session.scheduled_for),
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
          items: items.map(item => ({
            order: item.order,
            questionText: item.questionText,
            sectionName: item.sectionName,
            equipmentName: item.equipmentName,
            status: item.status,
            observation: item.observation,
            photosCount: item.photosCount,
          })),
          evidencePhotos,
        });

        setPdfUri(reportUri);
      } catch (error) {
        console.error('Failed to generate audit report:', error);
        showAlert('Error', 'No se pudo generar el informe de auditoria.');
      } finally {
        setIsGeneratingPdf(false);
      }
    },
    [
      buildingAddress,
      buildingName,
      questions,
      showAlert,
      user?.email,
      user?.id,
      user?.user_metadata?.first_name,
      user?.user_metadata?.last_name,
    ],
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

  const renderSessionItem = useCallback(
    ({ item }: { item: OfflineAuditSession }) => {
      return (
        <HistorySessionCard
          item={item}
          isGeneratingPdf={isGeneratingPdf}
          onGenerateReport={handleGenerateReport}
        />
      );
    },
    [handleGenerateReport, isGeneratingPdf],
  );

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

        {isBackgroundSyncing && !isLoading ? (
          <Text style={styles.syncStatusText}>
            Sincronizando en segundo plano...
          </Text>
        ) : null}

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" />
            <Text style={styles.statusText}>Cargando historial...</Text>
          </View>
        ) : (
          <FlatList
            data={sortedSessions}
            keyExtractor={item => String(item.local_id)}
            renderItem={renderSessionItem}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
              />
            }
            contentContainerStyle={styles.listContent}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Aun no hay auditorias registradas para este inmueble.
                </Text>
              </View>
            }
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
