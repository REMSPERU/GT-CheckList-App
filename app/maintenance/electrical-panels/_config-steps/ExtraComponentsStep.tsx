import {
  View,
  Text,
  Switch,
  TextInput,
  StyleSheet,
  Platform,
  Keyboard,
} from 'react-native';
import { useFormContext, Controller, useWatch } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
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

// ── Per-item form row (memoized) ────────────────────────────────────────────
// Each item reads its own Controller slice, so editing item N does NOT
// re-render items 0..N-1 or N+1..max.
interface ComponentFormItemProps {
  type: ExtraComponentType;
  index: number;
  label: string;
}

const ComponentFormItem = memo(function ComponentFormItem({
  type,
  index,
  label,
}: ComponentFormItemProps) {
  const { control } = useFormContext<PanelConfigurationFormValues>();

  return (
    <View style={localStyles.itemContainer}>
      <Text style={[styles.cnLabel, localStyles.itemLabel]}>
        {label.toUpperCase()} {index + 1}
      </Text>
      <Text style={[styles.itgSubtitle, localStyles.itemSubtitle]}>
        Que suministra electricamente?
      </Text>
      <Controller
        control={control}
        name={`extraComponents.${type}.${index}.description`}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.itgInput}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Ingrese descripcion"
            placeholderTextColor="#9CA3AF"
            scrollEnabled={false}
          />
        )}
      />
    </View>
  );
});

// ── Per-type ComponentCard (memoized) ───────────────────────────────────────
// Uses local `itemCount` state instead of useWatch on the full component array.
// This means typing in any ComponentFormItem description field does NOT
// re-render the ComponentCard or sibling ComponentFormItems. The count is
// synced via the `onUpdateQuantity` callback (which also sets form state).
interface ComponentCardProps {
  type: ExtraComponentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isEnabled: boolean;
  onToggle: () => void;
  onUpdateQuantity: (val: string) => void;
}

const ComponentCard = memo(function ComponentCard({
  type,
  label,
  icon,
  isEnabled,
  onToggle,
  onUpdateQuantity,
}: ComponentCardProps) {
  const { getValues } = useFormContext<PanelConfigurationFormValues>();

  // Local state for item count — seeded from the form array length.
  // Updated when the user changes the quantity TextInput.
  const [itemCount, setItemCount] = useState(() => {
    const list = getValues(`extraComponents.${type}`) || [];
    return (list as any[]).length;
  });

  // Re-seed itemCount when the card becomes enabled (the parent's toggleComponent
  // may have initialized the array to 1 item).
  useEffect(() => {
    if (isEnabled) {
      const list = getValues(`extraComponents.${type}`) || [];
      setItemCount((list as any[]).length);
    }
  }, [isEnabled, getValues, type]);

  // Wrap onUpdateQuantity to also update local count state
  const handleUpdateQuantity = useCallback(
    (val: string) => {
      const parsed = parseInt(val || '0', 10);
      const qty = isNaN(parsed) ? 0 : Math.max(0, parsed);
      setItemCount(qty);
      onUpdateQuantity(val);
    },
    [onUpdateQuantity],
  );

  // Stable index array — only re-created when count changes
  const itemIndices = useMemo(
    () => Array.from({ length: itemCount }, (_, i) => i),
    [itemCount],
  );

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
              value={String(itemCount)}
              onChangeText={handleUpdateQuantity}
              keyboardType="numeric"
            />
          </View>

          {itemIndices.map(idx => (
            <ComponentFormItem
              key={`${type}-${idx}`}
              type={type}
              index={idx}
              label={label}
            />
          ))}
        </View>
      )}
    </View>
  );
});

// ── Main Component ──────────────────────────────────────────────────────────
// memo prevents re-renders when only the parent re-renders (e.g., step
// navigation state change), since `panel` prop is stable between renders.

export default memo(function ExtraComponentsStep({
  panel,
}: ExtraComponentsStepProps) {
  const { control, setValue, getValues } =
    useFormContext<PanelConfigurationFormValues>();

  // Only watch the lightweight string array — not the entire extraComponents object.
  const enabledComponents = useWatch({
    control,
    name: 'enabledComponents',
    defaultValue: [],
  });

  // Toggle uses getValues() imperatively — no dependency on extraComponents,
  // so the callback reference stays stable across edits.
  const toggleComponent = useCallback(
    (type: ExtraComponentType) => {
      const currentEnabled = getValues('enabledComponents') || [];
      const isEnabled = currentEnabled.includes(type);

      if (isEnabled) {
        const newEnabled = currentEnabled.filter(
          (t: ExtraComponentType) => t !== type,
        );
        setValue('enabledComponents', newEnabled, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
      } else {
        const newEnabled = [...currentEnabled, type];
        setValue('enabledComponents', newEnabled, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
        // Initialize if empty
        const currentList = getValues(`extraComponents.${type}`) || [];
        if (currentList.length === 0) {
          setValue(`extraComponents.${type}`, [{ id: '1', description: '' }], {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
      }
    },
    [getValues, setValue],
  );

  // updateQuantity also reads current data imperatively
  const updateQuantity = useCallback(
    (type: ExtraComponentType, qtyStr: string) => {
      const parsed = parseInt(qtyStr || '0', 10);
      const qty = isNaN(parsed) ? 0 : Math.max(0, parsed);
      const currentList = getValues(`extraComponents.${type}`) || [];
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
    [getValues, setValue],
  );

  // Pre-create stable per-type callbacks. Because toggleComponent and
  // updateQuantity no longer depend on watched data (they use getValues),
  // these handlers stay referentially stable across field edits.
  const handlers = useMemo(() => {
    const result: Record<
      ExtraComponentType,
      { onToggle: () => void; onUpdateQuantity: (val: string) => void }
    > = {} as any;
    for (const def of COMPONENT_DEFINITIONS) {
      result[def.type] = {
        onToggle: () => toggleComponent(def.type),
        onUpdateQuantity: (val: string) => updateQuantity(def.type, val),
      };
    }
    return result;
  }, [toggleComponent, updateQuantity]);

  // ── Track keyboard height on Android to add dynamic bottom padding ──
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const dynamicPadding = useMemo(
    () => ({ paddingBottom: keyboardHeight > 0 ? keyboardHeight : 24 }),
    [keyboardHeight],
  );

  return (
    <View style={dynamicPadding}>
      <View style={styles.contentWrapper}>
        <Text style={styles.equipmentLabel}>
          Equipo {panel?.equipment_detail?.rotulo || panel?.codigo || ''}
        </Text>
        <Text style={styles.stepTitleStrong}>Componentes adicionales</Text>

        {COMPONENT_DEFINITIONS.map(def => {
          const isEnabled = enabledComponents.includes(def.type);

          return (
            <ComponentCard
              key={def.type}
              type={def.type}
              label={def.label}
              icon={def.icon}
              isEnabled={isEnabled}
              onToggle={handlers[def.type].onToggle}
              onUpdateQuantity={handlers[def.type].onUpdateQuantity}
            />
          );
        })}
      </View>
    </View>
  );
});
