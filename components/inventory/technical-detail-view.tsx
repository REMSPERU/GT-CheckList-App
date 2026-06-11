import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TechnicalFieldConfig } from '@/types/inventory';

interface TechnicalDetailViewProps {
  fields: TechnicalFieldConfig[];
  data: Record<string, unknown> | null | undefined;
}

/**
 * Renders technical equipment details in a clean key-value grid.
 * Used in the read-only detail view.
 */
export const TechnicalDetailView = memo(function TechnicalDetailView({
  fields,
  data,
}: TechnicalDetailViewProps) {
  if (!data || fields.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>
          Sin especificaciones técnicas registradas.
        </Text>
      </View>
    );
  }

  // Split into pairs for grid layout
  const pairs: TechnicalFieldConfig[][] = [];
  for (let i = 0; i < fields.length; i += 2) {
    pairs.push(fields.slice(i, i + 2));
  }

  return (
    <View style={styles.grid}>
      {pairs.map(pair => (
        <View key={pair[0].key} style={styles.row}>
          {pair.map(field => (
            <View key={field.key} style={styles.cell}>
              <Text style={styles.label}>{field.label}</Text>
              <Text style={styles.value} numberOfLines={2}>
                {formatFieldValue(data[field.key], field)}
              </Text>
            </View>
          ))}
          {pair.length === 1 && <View style={styles.cellPlaceholder} />}
        </View>
      ))}
    </View>
  );
});

function formatFieldValue(value: unknown, field: TechnicalFieldConfig): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (field.type === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  const strVal = String(value);

  if (field.suffix && strVal !== '—') {
    return `${strVal} ${field.suffix}`;
  }

  return strVal;
}

const styles = StyleSheet.create({
  grid: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 2,
  },
  cell: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 4,
  },
  cellPlaceholder: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
