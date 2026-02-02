import { View, Text, TextInput } from 'react-native';
import { useFormContext, Controller, useWatch } from 'react-hook-form';
import { ITGConfigStepProps } from '@/types/panel-configuration';
import { PanelConfigurationFormValues } from '@/schemas/panel-configuration';
import { styles } from './_styles';

export default function ITGConfigStep({ panel }: ITGConfigStepProps) {
  const {
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<PanelConfigurationFormValues>();

  // Watch itgDescriptions for reactive re-renders
  const itgDescriptions = useWatch({
    control,
    name: 'itgDescriptions',
  });

  // Handler that updates count and syncs arrays
  const updateCount = (text: string) => {
    // 1. Update the count field
    setValue('itgCount', text, { shouldValidate: true });

    // 2. Sync itgDescriptions array
    const n = Math.max(0, parseInt(text || '0', 10));
    const currentDescriptions = getValues('itgDescriptions');
    const currentLength = currentDescriptions.length;

    if (n > currentLength) {
      // Add items
      const newDescriptions = [...currentDescriptions];
      while (newDescriptions.length < n) {
        newDescriptions.push('');
      }
      setValue('itgDescriptions', newDescriptions);

      // Also sync itgCircuits
      const currentCircuits = getValues('itgCircuits');
      const newCircuits = [...currentCircuits];
      while (newCircuits.length < n) {
        newCircuits.push({
          cnPrefix: 'CN',
          circuitsCount: '1',
          circuits: [
            {
              phaseITM: 'mono_2w',
              amperajeITM: '',
              diameter: '',
              cableType: 'libre_halogeno',
              hasID: false,
              diameterID: '',
              cableTypeID: undefined,
              supply: '',
            },
          ],
        });
      }
      setValue('itgCircuits', newCircuits);
    } else if (n < currentLength) {
      // Remove items from the end
      const newDescriptions = currentDescriptions.slice(0, n);
      setValue('itgDescriptions', newDescriptions);

      // Also sync itgCircuits
      const currentCircuits = getValues('itgCircuits');
      const newCircuits = currentCircuits.slice(0, n);
      setValue('itgCircuits', newCircuits);
    }
  };

  return (
    <View style={styles.contentWrapper}>
      {/* Equipo */}
      <Text style={styles.equipmentLabel}>
        Equipo {panel?.equipment_detail?.rotulo || panel?.codigo || ''}
      </Text>
      <Text style={styles.stepTitleStrong}>
        Interruptor Termomagnetico general (IT-G)
      </Text>

      {/* ¿Cuantos IT-G tienes? */}
      <View style={styles.rowBetween}>
        <Text style={styles.countLabel}>¿Cuantos IT-G tienes?</Text>
        <Controller
          control={control}
          name="itgCount"
          render={({ field: { onBlur, value } }) => (
            <TextInput
              style={[styles.countInput, errors.itgCount && styles.inputError]}
              value={value}
              onChangeText={updateCount}
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

      {/* Lista IT-G - render based on watched itgDescriptions array */}
      <View style={{ marginTop: 12 }}>
        {itgDescriptions.map((_, idx) => (
          <View key={`itg-${idx}`} style={styles.itgCard}>
            <Text style={styles.itgTitle}>IT–G{idx + 1}</Text>
            <Text style={styles.itgSubtitle}>
              ¿Qué suministra eléctricamente el IT-G?
            </Text>
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
