import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StepFourProps, ExtraComponentType } from './_types';

const COMPONENT_OPTIONS: { key: ExtraComponentType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'contactores', label: 'Contactores', icon: 'flash-outline' },
  { key: 'relays', label: 'Relays', icon: 'swap-horizontal-outline' },
  { key: 'ventiladores', label: 'Ventiladores', icon: 'options-outline' },
  { key: 'termostato', label: 'Termostato', icon: 'thermometer-outline' },
  { key: 'medidores', label: 'Medidores', icon: 'speedometer-outline' },
  { key: 'timers', label: 'Timers', icon: 'time-outline' },
];

export default function StepFour({
  panel,
  enabledComponents,
  setEnabledComponents,
  extraComponents,
  setExtraComponents,
}: StepFourProps) {
  const toggleComponent = (key: ExtraComponentType) => {
    if (enabledComponents.includes(key)) {
      setEnabledComponents(prev => prev.filter(k => k !== key));
    } else {
      setEnabledComponents(prev => [...prev, key]);
    }
  };

  const addComponent = (type: ExtraComponentType) => {
    const newId = `${type.substring(0, 3).toUpperCase()}-${extraComponents[type].length + 1}`;
    setExtraComponents(prev => ({
      ...prev,
      [type]: [...prev[type], { id: newId, description: '' }]
    }));
  };

  const removeComponent = (type: ExtraComponentType, index: number) => {
    setExtraComponents(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const updateComponentDescription = (type: ExtraComponentType, index: number, description: string) => {
    setExtraComponents(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) =>
        i === index ? { ...item, description } : item
      )
    }));
  };

  return (
    <View style={styles.contentWrapper}>
      {/* Equipo */}
      <Text style={styles.equipmentLabel}>Equipo {panel?.name || panel?.id || ''}</Text>

      {/* Title */}
      <Text style={styles.stepTitleStrong}>Componentes Extras</Text>
      <Text style={styles.sectionTitleWithMargin}>
        Seleccione los componentes adicionales del tablero
      </Text>

      {/* Component toggles with their sections */}
      <View style={styles.componentContainer}>
        {COMPONENT_OPTIONS.map(({ key, label, icon }) => {
          const isEnabled = enabledComponents.includes(key);

          return (
            <View key={key}>
              {/* Toggle */}
              <TouchableOpacity
                style={[
                  styles.componentToggle,
                  isEnabled && styles.componentToggleActive
                ]}
                onPress={() => toggleComponent(key)}
              >
                <View style={styles.toggleIconRow}>
                  <Ionicons
                    name={icon}
                    size={24}
                    color={isEnabled ? '#0891B2' : '#6B7280'}
                  />
                  <Text style={[
                    styles.componentToggleText,
                    isEnabled && styles.componentToggleTextActive
                  ]}>
                    {label}
                  </Text>
                </View>
                <View style={[
                  styles.toggleSwitch,
                  isEnabled && styles.toggleSwitchActive
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    isEnabled && styles.toggleThumbActive
                  ]} />
                </View>
              </TouchableOpacity>

              {/* Component Section - appears right below the toggle */}
              {isEnabled && (
                <View style={styles.componentSection}>
                  <View style={styles.componentSectionHeader}>
                    {/* <View style={styles.sectionIconRow}>
                      <Ionicons name={icon} size={20} color="#0891B2" />
                      <Text style={styles.componentSectionTitle}>{label}</Text>
                    </View> */}
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => addComponent(key)}
                    >
                      <Ionicons name="add-circle" size={24} color="#0891B2" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.componentSectionSubtitle}>
                    Seleccione la cantidad
                  </Text>

                  {extraComponents[key].map((component, index) => (
                    <View key={`${key}-${index}`} style={styles.componentCard}>
                      <View style={styles.componentCardHeader}>
                        <Text style={styles.componentCardTitle}>{component.id}</Text>
                        <TouchableOpacity
                          onPress={() => removeComponent(key, index)}
                        >
                          <Ionicons name="close-circle" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.itgInput}
                        value={component.description}
                        onChangeText={(text) => updateComponentDescription(key, index, text)}
                        placeholder={`Descripción del ${label.toLowerCase()}`}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  ))}

                  {extraComponents[key].length === 0 && (
                    <View style={styles.emptyState}>
                      <Ionicons name="add-circle-outline" size={32} color="#9CA3AF" />
                      <Text style={styles.emptyStateText}>
                        Presione + para agregar {label.toLowerCase()}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {enabledComponents.length === 0 && (
        <View style={styles.emptyStateMain}>
          <Ionicons name="construct-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyStateMainText}>
            No hay componentes extras seleccionados
          </Text>
          <Text style={styles.emptyStateText}>
            Active los componentes que desee agregar
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contentWrapper: {
    paddingHorizontal: 24,
    paddingTop: 16
  },
  equipmentLabel: {
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 12
  },
  stepTitleStrong: {
    textAlign: 'center',
    color: '#11181C',
    marginBottom: 12,
    fontWeight: '700',
    fontSize: 18
  },
  sectionTitleWithMargin: {
    textAlign: 'center',
    color: '#1F2937',
    marginBottom: 16,
    fontWeight: '600'
  },
  componentContainer: {
    gap: 12
  },
  componentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16
  },
  componentToggleActive: {
    borderColor: '#0891B2',
    backgroundColor: '#F0F9FF'
  },
  toggleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  componentToggleText: {
    color: '#11181C',
    fontSize: 15,
    fontWeight: '500'
  },
  componentToggleTextActive: {
    color: '#0891B2',
    fontWeight: '600'
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center'
  },
  toggleSwitchActive: {
    backgroundColor: '#0891B2'
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start'
  },
  toggleThumbActive: {
    alignSelf: 'flex-end'
  },
  componentSection: {
    marginTop: 12,
    // marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  componentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  sectionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  componentSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C'
  },
  componentSectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12
  },
  addButton: {
    padding: 4
  },
  componentCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  componentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  componentCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11181C'
  },
  itgInput: {
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#7DD3FC',
    paddingHorizontal: 12,
    color: '#11181C'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24
  },
  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4
  },
  emptyStateMain: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    marginTop: 24
  },
  emptyStateMainText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8
  },
});
