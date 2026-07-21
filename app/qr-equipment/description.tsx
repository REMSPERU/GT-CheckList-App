import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EquipmentSummaryCard } from '@/components/qr-equipment/equipment-summary-card';
import { DatabaseService } from '@/services/database';
import type { BaseEquipment } from '@/types/api';
import type { QREquipmentRouteParams } from '@/types/qr-equipment';

interface DetailRowProps {
  label: string;
  value: unknown;
  depth?: number;
}

function formatDetailLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function formatPrimitiveDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'No registrado';
  }

  if (typeof value === 'boolean') {
    return value ? 'Si' : 'No';
  }

  return String(value);
}

function DetailValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Text style={styles.detailValue}>Sin registros</Text>;
    }

    return (
      <View style={styles.nestedList}>
        {value.slice(0, 6).map((item, index) => (
          <View key={index} style={styles.nestedItem}>
            {isRecord(item) ? (
              <DetailObject data={item} depth={depth + 1} compact />
            ) : (
              <Text style={styles.detailValue}>
                {formatPrimitiveDetailValue(item)}
              </Text>
            )}
          </View>
        ))}
        {value.length > 6 && (
          <Text style={styles.moreText}>
            + {value.length - 6} registro(s) mas
          </Text>
        )}
      </View>
    );
  }

  if (isRecord(value)) {
    if (depth >= 2) {
      return (
        <Text style={styles.detailValue}>
          {Object.keys(value).length} campo(s) registrados
        </Text>
      );
    }

    return <DetailObject data={value} depth={depth + 1} compact />;
  }

  return (
    <Text style={styles.detailValue}>{formatPrimitiveDetailValue(value)}</Text>
  );
}

function DetailRow({ label, value, depth = 0 }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <DetailValue value={value} depth={depth} />
    </View>
  );
}

function DetailObject({
  data,
  depth = 0,
  compact = false,
}: {
  data: Record<string, unknown>;
  depth?: number;
  compact?: boolean;
}) {
  const entries = Object.entries(data).filter(
    ([, value]) => value !== undefined,
  );

  if (entries.length === 0) {
    return <Text style={styles.emptyText}>No hay descripcion registrada.</Text>;
  }

  return (
    <View style={compact ? styles.nestedCard : styles.detailCard}>
      {entries.map(([key, value]) => (
        <DetailRow
          key={key}
          label={formatDetailLabel(key)}
          value={value}
          depth={depth}
        />
      ))}
    </View>
  );
}

export default function QREquipmentDescriptionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<QREquipmentRouteParams>();
  const [equipment, setEquipment] = useState<BaseEquipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const routeParams = useMemo<QREquipmentRouteParams>(
    () => ({
      buildingId: params.buildingId || '',
      buildingName: params.buildingName || '',
      equipamentoId: params.equipamentoId || '',
      equipamentoNombre: params.equipamentoNombre || '',
      frecuencia: params.frecuencia || 'MENSUAL',
      equipoId: params.equipoId || '',
      equipoCodigo: params.equipoCodigo || '',
      equipoUbicacion: params.equipoUbicacion || '',
      equipoDetalleUbicacion: params.equipoDetalleUbicacion || '',
    }),
    [
      params.buildingId,
      params.buildingName,
      params.equipoCodigo,
      params.equipoDetalleUbicacion,
      params.equipoId,
      params.equipoUbicacion,
      params.equipamentoId,
      params.equipamentoNombre,
      params.frecuencia,
    ],
  );

  const loadEquipment = useCallback(async () => {
    if (!routeParams.equipoId) {
      setEquipment(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const localEquipment = await DatabaseService.getEquipmentById(
        routeParams.equipoId,
      );
      setEquipment(localEquipment as BaseEquipment | null);
    } finally {
      setIsLoading(false);
    }
  }, [routeParams.equipoId]);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const equipmentDetail = equipment?.equipment_detail;
  const hasStructuredDetail =
    equipmentDetail &&
    typeof equipmentDetail === 'object' &&
    !Array.isArray(equipmentDetail);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver">
          <MaterialIcons name="chevron-left" size={28} color="#111827" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Descripcion del equipo</Text>
          <Text style={styles.headerSubtitle}>
            Informacion local disponible
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.editButton,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            router.push({
              pathname: '/inventory/[equipoId]/detail' as never,
              params: {
                equipoId: routeParams.equipoId,
                propertyId: routeParams.buildingId,
                propertyName: routeParams.buildingName,
                equipamentoId: routeParams.equipamentoId,
                equipamentoNombre: routeParams.equipamentoNombre,
                autoEdit: 'true',
              },
            });
          }}
          accessibilityLabel="Editar equipo">
          <MaterialIcons name="edit" size={16} color="#0891B2" />
          <Text style={styles.editButtonText}>Editar</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <EquipmentSummaryCard {...routeParams} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Detalle tecnico</Text>
          <Text style={styles.sectionDescription}>
            Datos leidos desde la copia local del equipo.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#06B6D4" />
            <Text style={styles.loadingText}>Cargando descripcion...</Text>
          </View>
        ) : hasStructuredDetail ? (
          <DetailObject data={equipmentDetail} />
        ) : (
          <View style={styles.detailCard}>
            <Text style={styles.emptyText}>No hay descripcion registrada.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#CFFAFE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0891B2',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  sectionDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nestedCard: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  detailValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  nestedList: {
    marginTop: 6,
    gap: 8,
  },
  nestedItem: {
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  moreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0891B2',
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
  },
  emptyText: {
    paddingVertical: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  pressed: {
    opacity: 0.78,
  },
});
