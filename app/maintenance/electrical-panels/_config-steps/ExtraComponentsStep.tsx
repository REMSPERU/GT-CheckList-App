import { View, Text, Switch, TextInput, StyleSheet } from 'react-native';
import { useFormContext, Controller, useWatch } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import {
  ExtraComponentsStepProps,
  ExtraComponentType,
} from '@/types/panel-configuration';
import { PanelConfigurationFormValues } from '@/schemas/panel-configuration';
import { styles } from './_styles';

const COMPONENT_DEFINITIONS: {
  type: ExtraComponentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    type: 'contactores',
    label: 'Contactores',
    icon: 'flash-outline',
  },
  {
    type: 'relays',
    label: 'Relays',
    icon: 'swap-horizontal-outline',
  },
  {
    type: 'ventiladores',
    label: 'Ventiladores',
    icon: 'aperture-outline',
  },
  {
    type: 'termostato',
    label: 'Termostato',
    icon: 'thermometer-outline',
  },
  {
    type: 'medidores',
    label: 'Medidores de energia',
    icon: 'speedometer-outline',
  },
  {
    type: 'timers',
    label: 'Interruptor horario (Timers)',
    icon: 'time-outline',
  },
];

// ── Static style constants ──────────────────────────────────────────────────
const switchTrackColor = { false: '#D1D5DB', true: '#0891B2' } as const;

const localStyles = StyleSheet.create({
  iconRow: { flexDirection: 'row', alignItems: 'center' },
  iconMargin: { marginRight: 8 },
  itemContainer: { marginTop: 12 },
  itemLabel: { marginBottom: 4 },
  itemSubtitle: { marginBottom: 8 },
});

// ── Per-type ComponentCard (memoized) ───────────────────────────────────────
// Isolates re-renders: toggling/editing "Contactores" won't re-render "Relays".
interface ComponentCardProps {
  type: ExtraComponentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isEnabled: boolean;
  componentList: { id: string; description: string }[];
  onToggle: () => void;
  onUpdateQuantity: (val: string) => void;
}

const ComponentCard = memo(function ComponentCard({
  type,
  label,
  icon,
  isEnabled,
  componentList,
  onToggle,
  onUpdateQuantity,
}: ComponentCardProps) {
  const { control } = useFormContext<PanelConfigurationFormValues>();

  return (
    <View style={styles.componentCard}>
      <View style={styles.componentCardHeader}>
        <View style={localStyles.iconRow}>
          <Ionicons
            name={icon}
            size={24}
            color="#6B7280"
            style={localStyles.iconMargin}
          />
          <Text style={styles.componentCardTitle}>{label}</Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={onToggle}
          trackColor={switchTrackColor}
          thumbColor="#FFFFFF"
        />
      </View>

      {isEnabled && (
        <View>
          <View style={styles.rowBetween}>
            <Text style={styles.countLabel}>Cuantos tienes?</Text>
            <TextInput
              style={styles.countInput}
              value={String(componentList.length)}
              onChangeText={onUpdateQuantity}
              keyboardType="numeric"
            />
          </View>

          {componentList.map((item, idx) => (
            <View key={`${type}-${idx}`} style={localStyles.itemContainer}>
              <Text style={[styles.cnLabel, localStyles.itemLabel]}>
                {label.toUpperCase()} {idx + 1}
              </Text>
              <Text style={[styles.itgSubtitle, localStyles.itemSubtitle]}>
                Que suministra electricamente?
              </Text>
              <Controller
                control={control}
                name={`extraComponents.${type}.${idx}.description`}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.itgInput}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Ingrese descripcion"
                    placeholderTextColor="#9CA3AF"
                  />
                )}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

// ── Main Component ──────────────────────────────────────────────────────────

export default function ExtraComponentsStep({
  panel,
}: ExtraComponentsStepProps) {
  const { control, setValue } = useFormContext<PanelConfigurationFormValues>();

  const enabledComponents = useWatch({
    control,
    name: 'enabledComponents',
    defaultValue: [],
  });

  const extraComponents = useWatch({
    control,
    name: 'extraComponents',
    defaultValue: {
      contactores: [],
      relays: [],
      ventiladores: [],
      termostato: [],
      medidores: [],
      timers: [],
    },
  });

  const toggleComponent = useCallback(
    (type: ExtraComponentType) => {
      const isEnabled = enabledComponents.includes(type);

      if (isEnabled) {
        const newEnabled = enabledComponents.filter(t => t !== type);
        setValue('enabledComponents', newEnabled, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
      } else {
        const newEnabled = [...enabledComponents, type];
        setValue('enabledComponents', newEnabled, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
        // Initialize if empty
        const currentList = extraComponents[type] || [];
        if (currentList.length === 0) {
          setValue(`extraComponents.${type}`, [{ id: '1', description: '' }], {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
      }
    },
    [enabledComponents, extraComponents, setValue],
  );

  const updateQuantity = useCallback(
    (type: ExtraComponentType, qtyStr: string) => {
      const qty = Math.max(0, parseInt(qtyStr || '0', 10));
      const currentList = extraComponents[type] || [];
      const newList = [...currentList];

      if (qty > newList.length) {
        for (let i = newList.length; i < qty; i++) {
          newList.push({ id: String(i + 1), description: '' });
        }
      } else if (qty < newList.length) {
        newList.length = qty;
      }
      setValue(`extraComponents.${type}`, newList, {
        shouldValidate: true,
        shouldTouch: true,
      });
    },
    [extraComponents, setValue],
  );

  return (
    <View style={styles.contentWrapper}>
      <Text style={styles.equipmentLabel}>
        Equipo {panel?.equipment_detail?.rotulo || panel?.codigo || ''}
      </Text>
      <Text style={styles.stepTitleStrong}>Componentes adicionales</Text>

      {COMPONENT_DEFINITIONS.map(def => {
        const isEnabled = enabledComponents.includes(def.type);
        const componentList = extraComponents[def.type] || [];

        return (
          <ComponentCard
            key={def.type}
            type={def.type}
            label={def.label}
            icon={def.icon}
            isEnabled={isEnabled}
            componentList={componentList}
            onToggle={() => toggleComponent(def.type)}
            onUpdateQuantity={(val: string) => updateQuantity(def.type, val)}
          />
        );
      })}
    </View>
  );
}
