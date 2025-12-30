import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChecklistItem } from './check-list-item';
import { ItemObservation } from '@/types/maintenance-session';
import { Ionicons } from '@expo/vector-icons';

interface AuxiliaryChecklistProps {
  components: any[];
  checklist: Record<string, boolean | string>;
  itemObservations: Record<string, ItemObservation>;
  onStatusChange: (itemId: string, status: boolean) => void;
  onObservationChange: (itemId: string, text: string) => void;
  onPhotoPress: (itemId: string) => void;
}

export const AuxiliaryChecklist: React.FC<AuxiliaryChecklistProps> = ({
  components,
  checklist,
  itemObservations,
  onStatusChange,
  onObservationChange,
  onPhotoPress,
}) => {
  if (!components || components.length === 0) return null;

  const getIconForType = (type: string): keyof typeof Ionicons.glyphMap => {
    const t = type.toLowerCase();
    if (t.includes('contactor')) return 'hardware-chip-outline';
    if (t.includes('relay') || t.includes('rele')) return 'return-down-forward';
    if (t.includes('ventilador')) return 'snow-outline';
    if (t.includes('termostato')) return 'thermometer-outline';
    if (t.includes('medidor')) return 'speedometer-outline';
    if (t.includes('timer')) return 'timer-outline';
    return 'cube-outline';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Equipamientos extras</Text>

      {components.flatMap((comp: any) =>
        comp.items.map((item: any) => {
          const itemId = `comp_${comp.tipo}_${item.codigo}`;
          const status = checklist[itemId];
          const obs = itemObservations[itemId];

          return (
            <ChecklistItem
              key={itemId}
              label={`${comp.tipo} ${item.codigo ? item.codigo : ''}`}
              icon={getIconForType(comp.tipo)}
              status={
                status === undefined ? true : status === true ? true : false
              }
              onStatusChange={val => onStatusChange(itemId, val)}
              observation={obs?.note}
              onObservationChange={text => onObservationChange(itemId, text)}
              hasPhoto={true}
              photoUri={obs?.photoUri}
              onPhotoPress={() => onPhotoPress(itemId)}
            />
          );
        }),
      )}
    </View>
  );
};

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
