import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useFormContext, Controller, useWatch } from 'react-hook-form';
import RNPickerSelect from 'react-native-picker-select';
import { Ionicons } from '@expo/vector-icons';
import { ITGConfigStepProps, CableType } from '@/types/panel-configuration';
import { PanelConfigurationFormValues } from '@/schemas/panel-configuration';
import { styles } from './_styles';

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    color: '#11181C',
    backgroundColor: '#FFFFFF',
    paddingRight: 30,
    height: 48,
  },
  inputAndroid: {
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    color: '#11181C',
    backgroundColor: '#FFFFFF',
    paddingRight: 30,
    height: 48,
  },
  placeholder: {
    color: '#9CA3AF',
  },
});

const pickerErrorStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 8,
    color: '#11181C',
    backgroundColor: '#FEF2F2',
    paddingRight: 30,
    height: 48,
  },
  inputAndroid: {
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 8,
    color: '#11181C',
    backgroundColor: '#FEF2F2',
    paddingRight: 30,
    height: 48,
  },
  placeholder: {
    color: '#9CA3AF',
  },
});

const CABLE_TYPE_OPTIONS: { key: CableType; label: string }[] = [
  { key: 'libre_halogeno', label: 'Libre de Halógeno' },
  { key: 'no_libre_halogeno', label: 'No libre de Halógeno' },
];

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
              interruptorType: 'itm',
              phase: 'mono_2w',
              amperaje: '',
              diameter: '',
              cableType: 'libre_halogeno',
              supply: '',
              hasID: false,
              phaseID: undefined,
              amperajeID: '',
              diameterID: '',
              cableTypeID: 'libre_halogeno',
              subITMsCount: '1',
              subITMs: [],
            },
          ],
          // New IT-G specific fields (required)
          amperajeITG: '',
          diameterITG: '',
          cableTypeITG: 'libre_halogeno',
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
        {itgDescriptions.map((_, idx) => {
          const itgErrors = errors.itgCircuits?.[idx];
          const hasErrors = !!(
            itgErrors?.amperajeITG ||
            itgErrors?.diameterITG ||
            itgErrors?.cableTypeITG
          );

          return (
            <View
              key={`itg-${idx}`}
              style={[
                styles.itgCard,
                hasErrors && { borderColor: '#EF4444', borderWidth: 1.5 },
              ]}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.itgTitle}>IT–G{idx + 1}</Text>
                {hasErrors && (
                  <View
                    style={{
                      backgroundColor: '#EF4444',
                      borderRadius: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}>
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontSize: 10,
                        fontWeight: '600',
                      }}>
                      Incompleto
                    </Text>
                  </View>
                )}
              </View>

              {/* Amperaje */}
              <Text style={styles.cnLabel}>AMPERAJE:</Text>
              <View
                style={[
                  styles.inputWithUnitWrapper,
                  itgErrors?.amperajeITG && {
                    borderColor: '#EF4444',
                    borderWidth: 1.5,
                  },
                ]}>
                <Controller
                  control={control}
                  name={`itgCircuits.${idx}.amperajeITG`}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.itgInputWithUnit}
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Ingrese amperaje"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                  )}
                />
                <Text style={styles.unitText}>A</Text>
              </View>
              {itgErrors?.amperajeITG && (
                <Text style={styles.errorText}>
                  {itgErrors.amperajeITG.message}
                </Text>
              )}

              {/* Diámetro */}
              <Text style={styles.cnLabel}>DIÁMETRO:</Text>
              <View
                style={[
                  styles.inputWithUnitWrapper,
                  itgErrors?.diameterITG && {
                    borderColor: '#EF4444',
                    borderWidth: 1.5,
                  },
                ]}>
                <Controller
                  control={control}
                  name={`itgCircuits.${idx}.diameterITG`}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.itgInputWithUnit}
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Ingrese diámetro"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                  )}
                />
                <Text style={styles.unitText}>mm²</Text>
              </View>
              {itgErrors?.diameterITG && (
                <Text style={styles.errorText}>
                  {itgErrors.diameterITG.message}
                </Text>
              )}

              {/* Tipo de Cable */}
              <Text style={styles.cnLabel}>TIPO DE CABLE:</Text>
              <Controller
                control={control}
                name={`itgCircuits.${idx}.cableTypeITG`}
                render={({ field: { onChange, value } }) => (
                  <RNPickerSelect
                    onValueChange={onChange}
                    items={CABLE_TYPE_OPTIONS.map(opt => ({
                      label: opt.label,
                      value: opt.key,
                    }))}
                    placeholder={{
                      label: 'Seleccione una opción',
                      value: null,
                      color: '#9CA3AF',
                    }}
                    value={value}
                    style={{
                      ...(itgErrors?.cableTypeITG
                        ? pickerErrorStyles
                        : pickerSelectStyles),
                      iconContainer: {
                        top: 12,
                        right: 12,
                      },
                    }}
                    useNativeAndroidPickerStyle={false}
                    Icon={() => (
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={itgErrors?.cableTypeITG ? '#EF4444' : '#6B7280'}
                      />
                    )}
                  />
                )}
              />
              {itgErrors?.cableTypeITG && (
                <Text style={styles.errorText}>Seleccione tipo de cable</Text>
              )}

              {/* Suministro eléctrico */}
              <Text style={[styles.itgSubtitle, { marginTop: 12 }]}>
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
          );
        })}
      </View>
    </View>
  );
}
