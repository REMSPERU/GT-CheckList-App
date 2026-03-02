import {
  View,
  Text,
  TextInput,
  StyleSheet,
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
import {
  PanelConfigurationFormValues,
  DEFAULT_ITG_CIRCUIT,
} from '@/schemas/panel-configuration';
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

// ── Memoized ITGCard ─────────────────────────────────────────────────────────
// Each card reads its own errors reactively via Controller fieldState and its
// own description via Controller. Editing ITG-1 won't re-render ITG-2.
interface ITGCardProps {
  idx: number;
}

const ITGCard = memo(function ITGCard({ idx }: ITGCardProps) {
  const { control } = useFormContext<PanelConfigurationFormValues>();

  // Track individual field errors via local state — updated by each Controller's
  // fieldState.error. This replaces the imperative getFieldState() calls that
  // couldn't trigger re-renders when validation errors were set/cleared.
  const [fieldErrors, setFieldErrors] = useState({
    phase: false,
    amperaje: false,
    diameter: false,
    cableType: false,
  });

  const hasErrors =
    fieldErrors.phase ||
    fieldErrors.amperaje ||
    fieldErrors.diameter ||
    fieldErrors.cableType;

  return (
    <View style={[styles.itgCard, hasErrors && errorBorderStyle]}>
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
        render={({
          field: { onChange, value },
          fieldState: { error: phaseError },
        }) => {
          // Sync error state for the parent card's hasErrors badge
          const hasError = !!phaseError;
          if (hasError !== fieldErrors.phase) {
            setFieldErrors(prev => ({ ...prev, phase: hasError }));
          }
          return (
            <>
              <RNPickerSelect
                onValueChange={onChange}
                items={PHASE_PICKER_ITEMS}
                placeholder={PHASE_PLACEHOLDER}
                value={value}
                style={
                  phaseError ? pickerErrorStyleWithIcon : pickerStyleWithIcon
                }
                useNativeAndroidPickerStyle={false}
                Icon={phaseError ? PickerChevronErrorIcon : PickerChevronIcon}
              />
              {phaseError && (
                <Text style={styles.errorText}>{phaseError.message}</Text>
              )}
            </>
          );
        }}
      />

      {/* Amperaje */}
      <Text style={styles.cnLabel}>AMPERAJE:</Text>
      <Controller
        control={control}
        name={`itgCircuits.${idx}.amperajeITG`}
        render={({
          field: { onChange, onBlur, value },
          fieldState: { error: amperajeError },
        }) => {
          const hasError = !!amperajeError;
          if (hasError !== fieldErrors.amperaje) {
            setFieldErrors(prev => ({ ...prev, amperaje: hasError }));
          }
          return (
            <>
              <View
                style={[
                  styles.inputWithUnitWrapper,
                  amperajeError && errorBorderStyle,
                ]}>
                <TextInput
                  style={styles.itgInputWithUnit}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Ingrese amperaje"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
                <Text style={styles.unitText}>A</Text>
              </View>
              {amperajeError && (
                <Text style={styles.errorText}>{amperajeError.message}</Text>
              )}
            </>
          );
        }}
      />

      {/* Diámetro */}
      <Text style={styles.cnLabel}>DIÁMETRO:</Text>
      <Controller
        control={control}
        name={`itgCircuits.${idx}.diameterITG`}
        render={({
          field: { onChange, onBlur, value },
          fieldState: { error: diameterError },
        }) => {
          const hasError = !!diameterError;
          if (hasError !== fieldErrors.diameter) {
            setFieldErrors(prev => ({ ...prev, diameter: hasError }));
          }
          return (
            <>
              <View
                style={[
                  styles.inputWithUnitWrapper,
                  diameterError && errorBorderStyle,
                ]}>
                <TextInput
                  style={styles.itgInputWithUnit}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Ingrese diámetro"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
                <Text style={styles.unitText}>mm²</Text>
              </View>
              {diameterError && (
                <Text style={styles.errorText}>{diameterError.message}</Text>
              )}
            </>
          );
        }}
      />

      {/* Tipo de Cable */}
      <Text style={styles.cnLabel}>TIPO DE CABLE:</Text>
      <Controller
        control={control}
        name={`itgCircuits.${idx}.cableTypeITG`}
        render={({
          field: { onChange, value },
          fieldState: { error: cableTypeError },
        }) => {
          const hasError = !!cableTypeError;
          if (hasError !== fieldErrors.cableType) {
            setFieldErrors(prev => ({ ...prev, cableType: hasError }));
          }
          return (
            <>
              <RNPickerSelect
                onValueChange={onChange}
                items={CABLE_TYPE_PICKER_ITEMS}
                placeholder={GENERIC_PLACEHOLDER}
                value={value}
                style={
                  cableTypeError
                    ? pickerErrorStyleWithIcon
                    : pickerStyleWithIcon
                }
                useNativeAndroidPickerStyle={false}
                Icon={
                  cableTypeError ? PickerChevronErrorIcon : PickerChevronIcon
                }
              />
              {cableTypeError && (
                <Text style={styles.errorText}>Seleccione tipo de cable</Text>
              )}
            </>
          );
        }}
      />

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
});

// ── Main Component ──────────────────────────────────────────────────────────
// memo prevents re-renders when only the parent re-renders (e.g., step
// navigation state change), since `panel` prop is stable between renders.
export default memo(function ITGConfigStep({ panel }: ITGConfigStepProps) {
  const { control, setValue, getValues } =
    useFormContext<PanelConfigurationFormValues>();

  // Watch only the scalar count — not the entire itgDescriptions array.
  // The number of ITG cards to render is derived from this count.
  const itgCount = useWatch({ control, name: 'itgCount' }) || '1';
  const itgCountNum = Math.max(0, parseInt(itgCount, 10) || 0);

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
            ...DEFAULT_ITG_CIRCUIT,
            circuits: [{ ...DEFAULT_ITG_CIRCUIT.circuits[0] }],
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

  // Stable index array for rendering ITG cards
  const itgIndices = useMemo(
    () => Array.from({ length: itgCountNum }, (_, i) => i),
    [itgCountNum],
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
    <View style={dynamicPadding}>
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
            render={({
              field: { onBlur, value },
              fieldState: { error: itgCountError },
            }) => (
              <>
                <TextInput
                  style={[
                    styles.countInput,
                    itgCountError && styles.inputError,
                  ]}
                  value={value}
                  onChangeText={updateCount}
                  onBlur={onBlur}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor="#9CA3AF"
                />
                {itgCountError && (
                  <Text style={styles.errorText}>{itgCountError.message}</Text>
                )}
              </>
            )}
          />
        </View>

        {/* Lista IT-G — each card is a memoized component */}
        <View style={localStyles.itgListContainer}>
          {itgIndices.map(idx => (
            <ITGCard key={`itg-${idx}`} idx={idx} />
          ))}
        </View>
      </View>
    </View>
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
