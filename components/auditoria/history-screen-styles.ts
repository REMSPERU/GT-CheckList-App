import { StyleSheet } from 'react-native';

export const historyScreenStyles = StyleSheet.create({
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
  syncStatusText: {
    marginBottom: 10,
    fontSize: 12,
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
