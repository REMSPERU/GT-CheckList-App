import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

interface EquipmentSummaryCardProps {
  buildingName: string;
  equipamentoNombre: string;
  equipoCodigo: string;
  equipoUbicacion: string;
  equipoDetalleUbicacion?: string | null;
  frecuencia: string;
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value?.trim() || 'No registrado'}</Text>
    </View>
  );
}

export function EquipmentSummaryCard({
  buildingName,
  equipamentoNombre,
  equipoCodigo,
  equipoUbicacion,
  equipoDetalleUbicacion,
  frecuencia,
}: EquipmentSummaryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="qr-code-2" size={24} color="#06B6D4" />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.kicker}>Equipo escaneado</Text>
          <Text style={styles.title}>
            {equipamentoNombre || 'Tipo no registrado'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <SummaryRow label="Inmueble" value={buildingName} />
      <SummaryRow label="Codigo" value={equipoCodigo} />
      <SummaryRow label="Ubicacion" value={equipoUbicacion} />
      <SummaryRow label="Detalle" value={equipoDetalleUbicacion} />
      <SummaryRow label="Frecuencia" value={frecuencia?.toUpperCase()} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#0891B2',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 2,
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  label: {
    width: 92,
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  value: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
});
