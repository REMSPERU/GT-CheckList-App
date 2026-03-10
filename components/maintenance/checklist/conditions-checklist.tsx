import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChecklistItem } from './check-list-item';
import { ItemObservation } from '@/types/maintenance-session';
import { Ionicons } from '@expo/vector-icons';

interface ConditionsChecklistProps {
  conditions: Record<string, boolean>;
  checklist: Record<string, boolean | string>;
  itemObservations: Record<string, ItemObservation>;
  onStatusChange: (itemId: string, status: boolean) => void;
  onObservationChange: (itemId: string, text: string) => void;
  onPhotoPress: (itemId: string) => void;
}

const CONDITION_LABELS: Record<string, string> = {
  barra_tierra: 'Barra de tierra',
  mandil_proteccion: 'Mandil de protección',
  terminal_electrico: 'Terminales eléctricos',
  puerta_mandil_aterrados: 'Puerta / Mandil aterrados',
  mangas_termo_contraibles: 'Mangas Termo contraíbles',
  diagrama_unifilar_directorio: 'Diagrama unifilar y directorio',
};

const CONDITION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  barra_tierra: 'construct-outline',
  mandil_proteccion: 'shield-checkmark-outline',
  terminal_electrico: 'link-outline',
  puerta_mandil_aterrados: 'lock-closed-outline',
  mangas_termo_contraibles: 'barcode-outline',
  diagrama_unifilar_directorio: 'document-text-outline',
};

export const ConditionsChecklist = React.memo(function ConditionsChecklist({
  conditions,
  checklist,
  itemObservations,
  onStatusChange,
  onObservationChange,
  onPhotoPress,
}: ConditionsChecklistProps) {
  // Filter keys that are actual conditions (boolean true usually means they SHOULD exist)
  const conditionKeys = useMemo(() => Object.keys(conditions), [conditions]);

  const renderedConditions = useMemo(
    () =>
      conditionKeys.map(key => {
        if (!conditions[key]) return null;
        if (!CONDITION_LABELS[key]) return null;

        const itemId = `cond_${key}`;
        const status = checklist[itemId];
        const obs = itemObservations[itemId];

        return (
          <ChecklistItem
            key={itemId}
            label={CONDITION_LABELS[key]}
            icon={CONDITION_ICONS[key] || 'checkbox-outline'}
            status={status === undefined ? true : status === true}
            onStatusChange={val => onStatusChange(itemId, val)}
            observation={obs?.note}
            onObservationChange={text => onObservationChange(itemId, text)}
            hasPhoto={true}
            photoUri={obs?.photoUri}
            onPhotoPress={() => onPhotoPress(itemId)}
          />
        );
      }),
    [
      checklist,
      conditionKeys,
      conditions,
      itemObservations,
      onObservationChange,
      onPhotoPress,
      onStatusChange,
    ],
  );

  if (!conditions) return null;
  if (conditionKeys.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Condiciones extras</Text>

      {renderedConditions}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#11181C',
    marginBottom: 16,
    marginLeft: 4,
  },
});
