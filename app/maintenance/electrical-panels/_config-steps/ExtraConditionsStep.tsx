import { View, Text, TouchableOpacity } from 'react-native';
import { useFormContext, Controller } from 'react-hook-form';
import { ExtraConditionsStepProps } from '@/types/panel-configuration';
import { PanelConfigurationFormValues } from '@/schemas/panel-configuration';
import { styles } from './_styles';
import { Ionicons } from '@expo/vector-icons';

// Key must match schema keys in PanelConfigurationSchema / ExtraConditions
const CONDITIONS: {
  key: keyof PanelConfigurationFormValues['extraConditions'];
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: 'mandilProteccion',
    label: 'Mandil de protección',
    icon: 'shield-outline',
  },
  {
    key: 'puertaMandilAterrados',
    label: 'Puerta y mandil aterrados',
    icon: 'log-in-outline',
  },
  { key: 'barraTierra', label: 'Barra de tierra', icon: 'git-commit-outline' },
  {
    key: 'terminalesElectricos',
    label: 'Cuenta con todos sus terminales eléctricos',
    icon: 'flash-outline',
  },
  {
    key: 'mangasTermoContraibles',
    label: 'Mangas Termo contraíbles',
    icon: 'color-wand-outline',
  },
  {
    key: 'diagramaUnifilarDirectorio',
    label: 'Diagrama unifilar y directorio de circuitos',
    icon: 'document-text-outline',
  },
];

export default function ExtraConditionsStep({
  panel,
}: ExtraConditionsStepProps) {
  const { control } = useFormContext<PanelConfigurationFormValues>();

  return (
    <View style={styles.contentWrapper}>
      <Text style={styles.equipmentLabel}>
        Equipo {panel?.equipment_detail?.rotulo || panel?.codigo || ''}
      </Text>
      <Text style={styles.stepTitleStrong}>Condiciones adicionales</Text>

      <View style={styles.componentContainer}>
        {CONDITIONS.map(item => (
          <Controller
            key={item.key}
            control={control}
            name={`extraConditions.${item.key}`}
            render={({ field: { onChange, value } }) => (
              <TouchableOpacity
                style={[
                  styles.componentToggle,
                  value && styles.componentToggleActive,
                ]}
                onPress={() => onChange(!value)}>
                <View style={styles.toggleIconRow}>
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={value ? '#0891B2' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.componentToggleText,
                      value && styles.componentToggleTextActive,
                    ]}>
                    {item.label}
                  </Text>
                </View>
                <View
                  style={[
                    styles.toggleSwitch,
                    value && styles.toggleSwitchActive,
                  ]}>
                  <View
                    style={[
                      styles.toggleThumb,
                      value && styles.toggleThumbActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            )}
          />
        ))}
      </View>
    </View>
  );
}
