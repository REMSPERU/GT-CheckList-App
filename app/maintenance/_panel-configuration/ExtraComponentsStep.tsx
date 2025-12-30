import { View, Text, Switch, TextInput } from 'react-native';
import { useFormContext, Controller, useWatch } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
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
    label: 'Medidores de energía',
    icon: 'speedometer-outline',
  },
  {
    type: 'timers',
    label: 'Interruptor horario (Timers)',
    icon: 'time-outline',
  },
];

export default function ExtraComponentsStep({
  panel,
}: ExtraComponentsStepProps) {
  const { control, setValue } = useFormContext<PanelConfigurationFormValues>();

  // Use useWatch instead of watch for better reactivity
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

  const toggleComponent = (type: ExtraComponentType) => {
    const isEnabled = enabledComponents.includes(type);
    console.log(
      `🔄 Toggle ${type}: currently ${isEnabled ? 'enabled' : 'disabled'}`,
    );

    if (isEnabled) {
      const newEnabled = enabledComponents.filter(t => t !== type);
      console.log(`  ➡️ Disabling. New enabledComponents:`, newEnabled);
      setValue('enabledComponents', newEnabled, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    } else {
      const newEnabled = [...enabledComponents, type];
      console.log(`  ➡️ Enabling. New enabledComponents:`, newEnabled);
      setValue('enabledComponents', newEnabled, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
      // Initialize if empty
      const currentList = extraComponents[type] || [];
      if (currentList.length === 0) {
        console.log(`  ➡️ Initializing ${type} with 1 item`);
        setValue(`extraComponents.${type}`, [{ id: '1', description: '' }], {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    }
  };

  const updateQuantity = (type: ExtraComponentType, qtyStr: string) => {
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
  };

  return (
    <View style={styles.contentWrapper}>
      <Text style={styles.equipmentLabel}>
        Equipo {panel?.name || panel?.codigo || ''}
      </Text>
      <Text style={styles.stepTitleStrong}>Componentes adicionales</Text>

      {COMPONENT_DEFINITIONS.map(def => {
        const isEnabled = enabledComponents.includes(def.type);
        const componentList = extraComponents[def.type] || [];

        return (
          <View key={def.type} style={styles.componentCard}>
            <View style={styles.componentCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name={def.icon}
                  size={24}
                  color="#6B7280"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.componentCardTitle}>{def.label}</Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={() => toggleComponent(def.type)}
                trackColor={{ false: '#D1D5DB', true: '#0891B2' }}
                thumbColor={'#FFFFFF'}
              />
            </View>

            {isEnabled && (
              <View>
                <View style={styles.rowBetween}>
                  <Text style={styles.countLabel}>¿Cuántos tienes?</Text>
                  <TextInput
                    style={styles.countInput} // Reuse same style
                    value={String(componentList.length)}
                    onChangeText={val => updateQuantity(def.type, val)}
                    keyboardType="numeric"
                  />
                </View>

                {componentList.map((item, idx) => (
                  <View key={`${def.type}-${idx}`} style={{ marginTop: 12 }}>
                    <Text style={[styles.cnLabel, { marginBottom: 4 }]}>
                      {def.label.toUpperCase()} {idx + 1}
                    </Text>
                    <Text style={[styles.itgSubtitle, { marginBottom: 8 }]}>
                      ¿Qué suministra eléctricamente?
                    </Text>
                    <Controller
                      control={control}
                      name={`extraComponents.${def.type}.${idx}.description`}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.itgInput}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Ingrese descripción"
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
      })}
    </View>
  );
}
