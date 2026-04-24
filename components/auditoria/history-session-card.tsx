import {
  formatDateTime,
  getSyncStatusLabel,
  parseJsonSafely,
} from '@/lib/auditoria/history-utils';
import type { OfflineAuditSession, StoredSummary } from '@/types/auditoria';
import { Pressable, Text, View } from 'react-native';
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
  onGenerateReport: (session: OfflineAuditSession) => void;
}

export function HistorySessionCard({
  item,
  isGeneratingPdf,
  onGenerateReport,
}: HistorySessionCardProps) {
  const summary = parseJsonSafely<StoredSummary>(item.summary);
  const totalQuestions = summary?.total_questions ?? 0;
  const totalOk = summary?.total_ok ?? 0;
  const totalObs = summary?.total_obs ?? 0;

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
    </View>
  );
}
