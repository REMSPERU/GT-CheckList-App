import {
  formatDateTime,
  getSyncStatusLabel,
  parseJsonSafely,
} from '@/lib/auditoria/history-utils';
import type { OfflineAuditSession, StoredSummary } from '@/types/auditoria';
import { Pressable, Text, View } from 'react-native';
import type { DimensionValue } from 'react-native';
import { historyScreenStyles } from './history-screen-styles';

function getSyncStatusStyle(syncStatus: OfflineAuditSession['sync_status']) {
  if (syncStatus === 'synced') return historyScreenStyles.badgeSynced;
  if (syncStatus === 'syncing') return historyScreenStyles.badgeSyncing;
  if (syncStatus === 'error') return historyScreenStyles.badgeError;
  return historyScreenStyles.badgePending;
}

interface HistorySessionCardProps {
  item: OfflineAuditSession;
  isGeneratingPdf: boolean;
  isRetryingUpload: boolean;
  onGenerateReport: (session: OfflineAuditSession) => void;
  onRetryUpload: (session: OfflineAuditSession) => void;
}

export function HistorySessionCard({
  item,
  isGeneratingPdf,
  isRetryingUpload,
  onGenerateReport,
  onRetryUpload,
}: HistorySessionCardProps) {
  const summary = parseJsonSafely<StoredSummary>(item.summary);
  const totalQuestions = summary?.total_questions ?? 0;
  const totalOk = summary?.total_ok ?? 0;
  const totalObs = summary?.total_obs ?? 0;
  const canRetryUpload = item.sync_status !== 'synced';
  const uploadTotal = item.upload_total_photos ?? 0;
  const uploadCompleted = Math.min(
    item.upload_completed_photos ?? 0,
    uploadTotal,
  );
  const shouldShowUploadProgress =
    item.sync_status !== 'synced' && uploadTotal > 0;
  const uploadProgressPercent = uploadTotal
    ? Math.round((uploadCompleted / uploadTotal) * 100)
    : 0;
  const uploadProgressWidth = `${uploadProgressPercent}%` as DimensionValue;

  return (
    <View style={historyScreenStyles.sessionCard}>
      <View style={historyScreenStyles.sessionHeader}>
        <Text style={historyScreenStyles.sessionDate}>
          {formatDateTime(item.submitted_at || item.created_at)}
        </Text>
        <View
          style={[
            historyScreenStyles.statusBadge,
            getSyncStatusStyle(item.sync_status),
          ]}>
          <Text style={historyScreenStyles.statusBadgeText}>
            {getSyncStatusLabel(item.sync_status)}
          </Text>
        </View>
      </View>

      <Text style={historyScreenStyles.sessionSummaryText}>
        Actividades: {totalQuestions} | OK: {totalOk} | OBS: {totalObs}
      </Text>

      {item.sync_status === 'error' && item.error_message ? (
        <Text style={historyScreenStyles.errorMessage}>
          {item.error_message}
        </Text>
      ) : null}

      {shouldShowUploadProgress ? (
        <View style={historyScreenStyles.progressContainer}>
          <View style={historyScreenStyles.progressHeaderRow}>
            <Text style={historyScreenStyles.progressLabel}>
              Evidencias subidas
            </Text>
            <Text style={historyScreenStyles.progressCount}>
              {uploadCompleted}/{uploadTotal}
            </Text>
          </View>
          <View style={historyScreenStyles.progressTrack}>
            <View
              style={[
                historyScreenStyles.progressFill,
                { width: uploadProgressWidth },
              ]}
            />
          </View>
          {item.upload_progress_message ? (
            <Text style={historyScreenStyles.progressMessage}>
              {item.upload_progress_message}
            </Text>
          ) : null}
        </View>
      ) : null}

      {item.sync_status === 'syncing' ? (
        <Text style={historyScreenStyles.warningMessage}>
          Si permanece en Subiendo, use Reintentar subida. La auditoria sigue
          guardada localmente.
        </Text>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          historyScreenStyles.reportButton,
          item.sync_status !== 'synced' &&
            historyScreenStyles.reportButtonDisabled,
          pressed && historyScreenStyles.pressed,
        ]}
        onPress={() => onGenerateReport(item)}
        disabled={item.sync_status !== 'synced' || isGeneratingPdf}>
        <Text style={historyScreenStyles.reportButtonText}>
          Generar informe
        </Text>
      </Pressable>

      {canRetryUpload ? (
        <Pressable
          style={({ pressed }) => [
            historyScreenStyles.retryButton,
            isRetryingUpload && historyScreenStyles.reportButtonDisabled,
            pressed && historyScreenStyles.pressed,
          ]}
          onPress={() => onRetryUpload(item)}
          disabled={isRetryingUpload}>
          <Text style={historyScreenStyles.retryButtonText}>
            {isRetryingUpload ? 'Reintentando...' : 'Reintentar subida'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
