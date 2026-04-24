import { StyleSheet } from 'react-native';

export const sessionScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF2F6',
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
  headerContainer: {
    minHeight: 170,
    position: 'relative',
    overflow: 'hidden',
  },
  headerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 72,
  },
  backButton: {
    position: 'absolute',
    top: 44,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.92)',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 0,
  },
  sectionHeader: {
    marginTop: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#BEE3DB',
    borderRadius: 12,
    backgroundColor: '#EAF7F4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0C5F59',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  equipmentHeader: {
    marginTop: 2,
    marginBottom: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#D9E1EC',
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  equipmentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A647C',
  },
  hierarchyChevron: {
    marginLeft: 8,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: '#0891B2',
    borderRadius: 10,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.84,
  },
});
