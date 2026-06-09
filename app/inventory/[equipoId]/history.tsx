import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  EquipmentHistoryEntry,
  EquipmentHistoryAction,
} from '@/types/api';
import type { ListRenderItem } from 'react-native';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : (value ?? '');
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

const ACTION_CONFIG: Record<
  EquipmentHistoryAction,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  INSERT: { label: 'Creado', color: '#16A34A', icon: 'add-circle-outline' },
  UPDATE: { label: 'Actualizado', color: '#D97706', icon: 'pencil-outline' },
  SOFT_DELETE: {
    label: 'Eliminado',
    color: '#DC2626',
    icon: 'trash-outline',
  },
  RESTORE: {
    label: 'Restaurado',
    color: '#2563EB',
    icon: 'refresh-outline',
  },
};

interface HistoryItemProps {
  item: EquipmentHistoryEntry;
}

function HistoryItem({ item }: HistoryItemProps) {
  const config = ACTION_CONFIG[item.accion] ?? ACTION_CONFIG.UPDATE;

  return (
    <View style={styles.histItem}>
      <View style={[styles.histIcon, { backgroundColor: `${config.color}18` }]}>
        <Ionicons name={config.icon} size={18} color={config.color} />
      </View>
      <View style={styles.histBody}>
        <View style={styles.histTopRow}>
          <View
            style={[
              styles.histActionBadge,
              {
                borderColor: config.color,
                backgroundColor: `${config.color}12`,
              },
            ]}>
            <Text style={[styles.histActionText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
          <Text style={styles.histVersion}>v{item.version}</Text>
        </View>
        <Text style={styles.histDate}>{formatDate(item.changed_at)}</Text>
        {item.changed_fields && item.changed_fields.length > 0 && (
          <Text style={styles.histFields}>
            Campos: {item.changed_fields.join(', ')}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function EquipoHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const equipoId = getSingleParam(params.equipoId);
  const propertyName = getSingleParam(params.propertyName);
  const equipamentoNombre = getSingleParam(params.equipamentoNombre);

  const {
    data: history,
    isLoading,
    error,
  } = useQuery<EquipmentHistoryEntry[], Error>({
    queryKey: ['equipos-historial', equipoId],
    queryFn: async () => {
      const { data, error: supaError } = await supabase
        .from('equipos_historial')
        .select('*')
        .eq('equipo_id', equipoId)
        .order('changed_at', { ascending: false })
        .limit(50);
      if (supaError) throw supaError;
      return (data ?? []) as EquipmentHistoryEntry[];
    },
    enabled: !!equipoId,
    retry: 1,
  });

  const renderItem = useCallback<ListRenderItem<EquipmentHistoryEntry>>(
    ({ item }) => <HistoryItem item={item} />,
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar">
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.breadcrumb} numberOfLines={1}>
            {propertyName} · {equipamentoNombre}
          </Text>
          <Text style={styles.headerTitle}>Historial de Cambios</Text>
        </View>
      </SafeAreaView>

      {/* Online-only notice */}
      <View style={styles.noticeBanner}>
        <Ionicons name="cloud-outline" size={14} color="#0891B2" />
        <Text style={styles.noticeText}>
          El historial requiere conexión a internet
        </Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color="#CBD5E1" />
          <Text style={styles.errorText}>No se pudo cargar el historial.</Text>
          <Text style={styles.errorHint}>
            Verifica tu conexión a internet e intenta de nuevo.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history ?? []}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            (!history || history.length === 0) && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="time-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>
                Sin historial registrado para este equipo.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.75 },
  headerTextWrap: { flex: 1 },
  breadcrumb: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ECFEFF',
    borderBottomWidth: 1,
    borderBottomColor: '#CFFAFE',
  },
  noticeText: { fontSize: 12, color: '#0891B2', fontWeight: '500' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 10,
  },
  loadingText: { fontSize: 15, color: '#64748B', marginTop: 8 },
  errorText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },
  errorHint: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  emptyText: { fontSize: 15, color: '#64748B', textAlign: 'center' },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 10,
  },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  histItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  histIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  histBody: { flex: 1, gap: 4 },
  histTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
  },
  histActionBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  histActionText: { fontSize: 12, fontWeight: '700' },
  histVersion: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  histDate: { fontSize: 12, color: '#64748B' },
  histFields: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
});
