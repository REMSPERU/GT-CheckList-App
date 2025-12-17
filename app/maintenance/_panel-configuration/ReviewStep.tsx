import { View, Text } from 'react-native';
import { useFormContext } from "react-hook-form";
import { ReviewStepProps } from '@/types/panel-configuration';
import { PanelConfigurationFormValues } from '@/schemas/panel-configuration';
import { styles } from './_styles';

export default function ReviewStep({
  panel,
}: ReviewStepProps) {
  const { getValues } = useFormContext<PanelConfigurationFormValues>();
  const values = getValues();

  const {
    panelType,
    voltage,
    phase,
    itgDescriptions,
    itgCircuits,
    enabledComponents,
    extraComponents,
    extraConditions,
  } = values;

  return (
    <View style={styles.contentWrapper}>
      <Text style={styles.equipmentLabel}>Equipo {panel?.name || panel?.id || ''}</Text>
      <Text style={styles.stepTitleStrong}>Resumen</Text>

      {/* Basic Info */}
      <View style={styles.componentSection}>
        <Text style={styles.componentSectionTitle}>Información Básica</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tipo:</Text>
          <Text style={styles.summaryValue}>{panelType}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Voltaje:</Text>
          <Text style={styles.summaryValue}>{voltage} V</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Fases:</Text>
          <Text style={styles.summaryValue}>{phase}</Text>
        </View>
      </View>

      {/* ITG Info */}
      <View style={styles.componentSection}>
        <Text style={styles.componentSectionTitle}>Interruptores Generales</Text>
        {itgDescriptions.map((desc, idx) => (
          <View key={idx} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>IT-G{idx + 1}:</Text>
            <Text style={styles.summaryValue}>{desc || 'Sin descripción'}</Text>
          </View>
        ))}
      </View>

      {/* Circuits Info */}
      <View style={styles.componentSection}>
        <Text style={styles.componentSectionTitle}>Circuitos</Text>
        {itgCircuits.map((itg, idx) => (
          <View key={idx} style={{ marginBottom: 8 }}>
            <Text style={[styles.cnLabel, { fontWeight: '600' }]}>
              IT-G{idx + 1} ({itg.cnPrefix} - {itg.circuitsCount} circuitos)
            </Text>
          </View>
        ))}
      </View>

      {/* Extra Components */}
      <View style={styles.componentSection}>
        <Text style={styles.componentSectionTitle}>Componentes Adicionales</Text>
        {enabledComponents.length === 0 ? (
          <Text style={styles.emptyStateText}>Ninguno seleccionado</Text>
        ) : (
          enabledComponents.map((comp) => (
            <View key={comp} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{comp}:</Text>
              <Text style={styles.summaryValue}>{extraComponents[comp]?.length || 0}</Text>
            </View>
          ))
        )}
      </View>

      {/* Extra Conditions */}
      <View style={styles.componentSection}>
        <Text style={styles.componentSectionTitle}>Condiciones Adicionales</Text>
        {Object.entries(extraConditions).map(([key, value]) => (
          value && (
            <View key={key} style={styles.summaryRow}>
              <Text style={styles.summaryValue}>{key}</Text>
              <Text style={styles.summaryValue}>Sí</Text>
            </View>
          )
        ))}
      </View>

    </View>
  );
}
