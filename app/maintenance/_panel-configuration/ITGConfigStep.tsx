import { View, Text, TextInput } from 'react-native';
import { useFormContext, Controller } from "react-hook-form";
import { ITGConfigStepProps } from '@/types/panel-configuration';
import { PanelConfigurationFormValues } from '@/schemas/panel-configuration';
import { styles } from './_styles';

export default function ITGConfigStep({
  panel,
}: ITGConfigStepProps) {
  const { control, watch, formState: { errors } } = useFormContext<PanelConfigurationFormValues>();
  const itgDescriptions = watch("itgDescriptions");

  return (
    <View style={styles.contentWrapper}>
      {/* Equipo */}
      <Text style={styles.equipmentLabel}>Equipo {panel?.name || panel?.id || ''}</Text>
      <Text style={styles.stepTitleStrong}>Interruptor Termomagnetico general (IT-G)</Text>

      {/* ¿Cuantos IT-G tienes? */}
      <View style={styles.rowBetween}>
        <Text style={styles.countLabel}>¿Cuantos IT-G tienes?</Text>
        <Controller
          control={control}
          name="itgCount"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.countInput, errors.itgCount && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor="#9CA3AF"
            />
          )}
        />
      </View>
      {errors.itgCount && (
        <Text style={styles.errorText}>{errors.itgCount.message}</Text>
      )}

      {/* Lista IT-G */}
      <View style={{ marginTop: 12 }}>
        {itgDescriptions.map((_, idx) => (
          <View key={`itg-${idx}`} style={styles.itgCard}>
            <Text style={styles.itgTitle}>IT–G{idx + 1}</Text>
            <Text style={styles.itgSubtitle}>¿Qué suministra eléctricamente el IT-G?</Text>
            <Controller
              control={control}
              name={`itgDescriptions.${idx}`}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.itgInput}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Ingrese texto"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
