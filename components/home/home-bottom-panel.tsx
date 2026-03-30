import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { PropertyResponse as Property } from '@/types/api';

interface HomeBottomPanelProps {
  building: Property | null;
}

export function HomeBottomPanel({ building }: HomeBottomPanelProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Ionicons name="time-outline" size={18} color="#0891B2" />
          <Text style={styles.statusText} numberOfLines={1}>
            {building
              ? `Ultimo inmueble: ${building.name}`
              : 'Sin inmueble seleccionado'}
          </Text>
        </View>

        <Text style={styles.helpText}>
          Selecciona un inmueble para mantener el flujo activo desde esta
          pantalla.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 14,
    gap: 10,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  helpText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
});
