import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
  Keyboard,
} from 'react-native';
import { useFormContext, Controller, useWatch } from 'react-hook-form';
import RNPickerSelect from 'react-native-picker-select';
import { Ionicons } from '@expo/vector-icons';
import {
  ITGConfigStepProps,
  CableType,
  PhaseType,
} from '@/types/panel-configuration';
import { PanelConfigurationFormValues } from '@/schemas/panel-configuration';
import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { styles } from './_styles';

// ── Stable Icon components for RNPickerSelect (avoid inline re-creation) ────
const PickerChevronIcon = () => (
  <Ionicons name="chevron-down" size={20} color="#6B7280" />
);
const PickerChevronErrorIcon = () => (
  <Ionicons name="chevron-down" size={20} color="#EF4444" />
);

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

const PHASE_OPTIONS: { key: PhaseType; label: string }[] = [
  { key: 'unipolar', label: 'Unipolar' },
  { key: 'mono_2w', label: 'Monofásico 2 hilos' },
  { key: 'tri_3w', label: 'Trifásico 3 hilos' },
  { key: 'tri_4w', label: 'Trifásico 4 hilos' },
];

const CABLE_TYPE_OPTIONS: { key: CableType; label: string }[] = [
  { key: 'libre_halogeno', label: 'Libre de Halógeno' },
  { key: 'no_libre_halogeno', label: 'No libre de Halógeno' },
];

// Pre-computed picker items — avoids .map() on every render
const PHASE_PICKER_ITEMS = PHASE_OPTIONS.map(opt => ({
  label: opt.label,
  value: opt.key,
}));
const CABLE_TYPE_PICKER_ITEMS = CABLE_TYPE_OPTIONS.map(opt => ({
  label: opt.label,
  value: opt.key,
}));

// Static placeholder objects — avoids re-creating on every render
const PHASE_PLACEHOLDER = {
  label: 'Seleccione tipo de fase',
  value: null,
  color: '#9CA3AF',
};
const GENERIC_PLACEHOLDER = {
  label: 'Seleccione una opción',
  value: null,
  color: '#9CA3AF',
};

// Combined picker styles with iconContainer — avoids spreading + inline object
const pickerStyleWithIcon = {
  ...pickerSelectStyles,
  iconContainer: { top: 12, right: 12 },
};
const pickerErrorStyleWithIcon = {
  ...pickerErrorStyles,
  iconContainer: { top: 12, right: 12 },
};

// Static error border style
const errorBorderStyle = { borderColor: '#EF4444', borderWidth: 1.5 } as const;

// memo prevents re-renders when only the parent re-renders (e.g., step
// navigation state change), since `panel` prop is stable between renders.
export default memo(function ITGConfigStep({ panel }: ITGConfigStepProps) {
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

  // Handler that updates count and syncs arrays — wrapped in useCallback to
  // avoid re-creating on every render (prevents unnecessary Controller re-renders)
  const updateCount = useCallback(
    (text: string) => {
      // 1. Update the count field
      setValue('itgCount', text, { shouldValidate: true });

      // 2. Sync itgDescriptions array
      const parsed = parseInt(text || '0', 10);
      const n = isNaN(parsed) ? 0 : Math.max(0, parsed);
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
                hasSubITMs: false,
                subITMsCount: '1',
                subITMs: [],
              },
            ],
            // New IT-G specific fields (required)
            phaseITG: 'mono_2w',
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
    },
    [setValue, getValues],
  );

  // Track keyboard height on Android to add dynamic bottom padding
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
    <ScrollView
      contentContainerStyle={dynamicPadding}
      keyboardShouldPersistTaps="handled">
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
                style={[
                  styles.countInput,
                  errors.itgCount && styles.inputError,
                ]}
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
        <View style={localStyles.itgListContainer}>
          {itgDescriptions.map((description, idx) => {
            const itgErrors = errors.itgCircuits?.[idx];
            const hasErrors = !!(
              itgErrors?.phaseITG ||
              itgErrors?.amperajeITG ||
              itgErrors?.diameterITG ||
              itgErrors?.cableTypeITG
            );

            // Key must NOT include field values — that would destroy/recreate
            // the entire component on every keystroke (loss of focus, flash, etc.)
            const stableKey = `itg-${idx}`;

            return (
              <View
                key={stableKey}
                style={[styles.itgCard, hasErrors && errorBorderStyle]}>
                <View style={localStyles.itgCardHeaderRow}>
                  <Text style={styles.itgTitle}>IT–G{idx + 1}</Text>
                  {hasErrors && (
                    <View style={localStyles.errorBadge}>
                      <Text style={localStyles.errorBadgeText}>Incompleto</Text>
                    </View>
                  )}
                </View>

                {/* Fases */}
                <Text style={styles.cnLabel}>FASES:</Text>
                <Controller
                  control={control}
                  name={`itgCircuits.${idx}.phaseITG`}
                  render={({ field: { onChange, value } }) => (
                    <RNPickerSelect
                      onValueChange={onChange}
                      items={PHASE_PICKER_ITEMS}
                      placeholder={PHASE_PLACEHOLDER}
                      value={value}
                      style={
                        itgErrors?.phaseITG
                          ? pickerErrorStyleWithIcon
                          : pickerStyleWithIcon
                      }
                      useNativeAndroidPickerStyle={false}
                      Icon={
                        itgErrors?.phaseITG
                          ? PickerChevronErrorIcon
                          : PickerChevronIcon
                      }
                    />
                  )}
                />
                {itgErrors?.phaseITG && (
                  <Text style={styles.errorText}>
                    {itgErrors.phaseITG.message}
                  </Text>
                )}

                {/* Amperaje */}
                <Text style={styles.cnLabel}>AMPERAJE:</Text>
                <View
                  style={[
                    styles.inputWithUnitWrapper,
                    itgErrors?.amperajeITG && errorBorderStyle,
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
                    itgErrors?.diameterITG && errorBorderStyle,
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
                      items={CABLE_TYPE_PICKER_ITEMS}
                      placeholder={GENERIC_PLACEHOLDER}
                      value={value}
                      style={
                        itgErrors?.cableTypeITG
                          ? pickerErrorStyleWithIcon
                          : pickerStyleWithIcon
                      }
                      useNativeAndroidPickerStyle={false}
                      Icon={
                        itgErrors?.cableTypeITG
                          ? PickerChevronErrorIcon
                          : PickerChevronIcon
                      }
                    />
                  )}
                />
                {itgErrors?.cableTypeITG && (
                  <Text style={styles.errorText}>Seleccione tipo de cable</Text>
                )}

                {/* Suministro eléctrico */}
                <Text style={[styles.itgSubtitle, localStyles.marginTop12]}>
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
    </ScrollView>
  );
});
const localStyles = StyleSheet.create({
  itgListContainer: { marginTop: 12 },
  marginTop12: { marginTop: 12 },
  itgCardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  errorBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
});
