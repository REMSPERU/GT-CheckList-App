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

  const sections = groupFieldsBySection(
    fields.filter(field => isFieldVisible(field, data)),
  );

  return (
    <View style={styles.sectionsWrap}>
      {sections.map(section => (
        <View key={section.title} style={styles.sectionWrap}>
          {section.title !== DEFAULT_SECTION ? (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          ) : null}
          <View style={styles.grid}>{renderFieldGrid(section.fields, data)}</View>
        </View>
      ))}
    </View>
  );
});

const DEFAULT_SECTION = 'General';

function groupFieldsBySection(fields: TechnicalFieldConfig[]) {
  const sections: { title: string; fields: TechnicalFieldConfig[] }[] = [];

  fields.forEach(field => {
    const title = field.section ?? DEFAULT_SECTION;
    const section = sections.find(item => item.title === title);
    if (section) {
      section.fields.push(field);
    } else {
      sections.push({ title, fields: [field] });
    }
  });

  return sections;
}

function isFieldVisible(
  field: TechnicalFieldConfig,
  data: Record<string, unknown>,
) {
  if (!field.visibleWhen) return true;
  return (
    getValueByPath(data, field.visibleWhen.key) === field.visibleWhen.equals
  );
}

function renderFieldGrid(
  fields: TechnicalFieldConfig[],
  data: Record<string, unknown>,
) {
  const rows = [];

  for (let i = 0; i < fields.length; i += 1) {
    const field = fields[i];

    if (field.type === 'collection') {
      rows.push(renderCollectionCard(field, data));
      continue;
    }

    const nextField = fields[i + 1];
    const hasNextCell = nextField && nextField.type !== 'collection';

    rows.push(
      <View key={field.key} style={styles.row}>
        {renderScalarCell(field, data)}
        {hasNextCell ? (
          renderScalarCell(nextField, data)
        ) : (
          <View style={styles.cellPlaceholder} />
        )}
      </View>,
    );

    if (hasNextCell) i += 1;
  }

  return rows;
}

function renderScalarCell(
  field: TechnicalFieldConfig,
  data: Record<string, unknown>,
) {
  return (
    <View key={field.key} style={styles.cell}>
      <Text style={styles.label}>{field.label}</Text>
      <Text style={styles.value}>
        {formatFieldValue(getValueByPath(data, field.key), field, data)}
      </Text>
    </View>
  );
}

function renderCollectionCard(
  field: TechnicalFieldConfig,
  data: Record<string, unknown>,
) {
  return (
    <View key={field.key} style={styles.collectionCard}>
      <Text style={styles.collectionTitle}>{field.label}</Text>
      {renderCollection(data[field.key], field)}
    </View>
  );
}

function renderCollection(value: unknown, field: TechnicalFieldConfig) {
  const items = Array.isArray(value) ? value : [];

  if (items.length === 0) {
    return <Text style={styles.emptyCollectionText}>Sin registros.</Text>;
  }

  return items.map((item, index) => {
    const itemData = isRecord(item) ? item : {};
    return (
      <View key={`${field.key}-${index}`} style={styles.collectionItem}>
        <Text style={styles.collectionIndex}>#{index + 1}</Text>
        <View style={styles.collectionGrid}>
          {(field.fields ?? []).map(child => (
            <View key={child.key} style={styles.collectionCell}>
              <Text style={styles.label}>{child.label}</Text>
              <Text style={styles.value}>
                {formatFieldValue(
                  getValueByPath(itemData, child.key),
                  child,
                  itemData,
                )}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getValueByPath(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!isRecord(current)) return undefined;
    return current[key];
  }, data);
}

function formatFieldValue(
  value: unknown,
  field: TechnicalFieldConfig,
  data: Record<string, unknown>,
): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (field.type === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  const strVal = String(value);
  const dynamicSuffix = field.suffixFrom
    ? getValueByPath(data, field.suffixFrom)
    : null;
  const suffix = field.suffix ?? dynamicSuffix;

  if (suffix && strVal !== '—') {
    return `${strVal} ${String(suffix)}`;
  }

  return strVal;
}

const styles = StyleSheet.create({
  grid: {
    gap: 2,
  },
  sectionsWrap: {
    gap: 14,
  },
  sectionWrap: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
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
  collectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    gap: 10,
  },
  collectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyCollectionText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  collectionItem: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
  collectionIndex: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0891B2',
  },
  collectionGrid: {
    gap: 6,
  },
  collectionCell: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 4,
  },
});
