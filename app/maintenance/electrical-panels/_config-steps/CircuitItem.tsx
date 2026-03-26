import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Control, Controller, useFormContext, useWatch } from 'react-hook-form';
import RNPickerSelect from 'react-native-picker-select';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { styles } from './_styles';
import {
  PhaseType,
  CableType,
  InterruptorType,
  SubITM,
} from '@/types/panel-configuration';
import {
  PanelConfigurationFormValues,
  SUB_ITMS_MAX_ITM,
  SUB_ITMS_MAX_ID,
} from '@/schemas/panel-configuration';

// ── Stable Icon components for RNPickerSelect (avoid inline re-creation) ────
const PickerChevronIcon = () => (
  <Ionicons name="chevron-down" size={20} color="#6B7280" />
);
const PickerChevronErrorIcon = () => (
  <Ionicons name="chevron-down" size={20} color="#EF4444" />
);

// Default SubITM para nuevos circuitos
const DEFAULT_SUB_ITM: SubITM = {
  name: '',
  phaseITM: 'mono_2w',
  amperajeITM: '',
  diameter: '',
  cableType: 'libre_halogeno',
  supply: '',
  hasID: false,
  phaseID: undefined,
  amperajeID: '',
  diameterID: '',
  cableTypeID: 'libre_halogeno',
};

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
  { key: 'mono_2w', label: 'Monofasico 2 hilos' },
  { key: 'tri_3w', label: 'Trifasico 3 hilos' },
  { key: 'tri_4w', label: 'Trifasico 4 hilos' },
];

const CABLE_TYPE_OPTIONS: { key: CableType; label: string }[] = [
  { key: 'libre_halogeno', label: 'Libre de Halogeno' },
  { key: 'no_libre_halogeno', label: 'No libre de Halogeno' },
];

// Pre-computed picker items -- avoids .map() on every render
const PHASE_PICKER_ITEMS = PHASE_OPTIONS.map(opt => ({
  label: opt.label,
  value: opt.key,
}));
const CABLE_TYPE_PICKER_ITEMS = CABLE_TYPE_OPTIONS.map(opt => ({
  label: opt.label,
  value: opt.key,
}));

// Static placeholder objects
const PHASE_PLACEHOLDER = {
  label: 'Seleccione tipo de fase',
  value: null,
  color: '#9CA3AF',
};
const GENERIC_PLACEHOLDER = {
  label: 'Seleccione una opcion',
  value: null,
  color: '#9CA3AF',
};

// Combined picker styles with iconContainer
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

const INTERRUPTOR_OPTIONS: {
  key: InterruptorType;
  label: string;
  shortLabel: string;
}[] = [
  { key: 'itm', label: 'Interruptor Termomagnetico (ITM)', shortLabel: 'ITM' },
  { key: 'id', label: 'Interruptor Diferencial (ID)', shortLabel: 'ID' },
  { key: 'reserva', label: 'Reserva', shortLabel: 'Reserva' },
];

// Segment options for ID sub-ITM count (1-3)
const ID_SUB_ITM_COUNT_OPTIONS = ['1', '2', '3'];

// Sub-ITMs pagination: render this many initially, then +PAGE_SIZE on "show more"
const SUB_ITM_PAGE_SIZE = 5;

interface CircuitItemProps {
  index: number;
  itgIndex: number;
  cnPrefix: string;
  isExpanded: boolean;
  onToggleExpand: (index: number) => void;
}

// ─── MEMOIZED SUB-ITM FORM ITEM ──────────────────────────────────────────────
// Extracted as a separate memo component so editing one sub-ITM doesn't
// re-render sibling sub-ITMs. Critical for ITM mode with up to 30 items.
interface SubITMFormItemProps {
  control: Control<PanelConfigurationFormValues>;
  basePath: string; // e.g. "itgCircuits.0.circuits.0.subITMs.0"
  subIdx: number;
  showIDToggle: boolean; // true cuando el circuito padre es tipo ITM
  subITMsPrefix: string; // prefijo compartido desde el circuito padre (e.g. "ITM")
}

const SubITMFormItem = memo(function SubITMFormItem({
  control,
  basePath,
  subIdx,
  showIDToggle,
  subITMsPrefix,
}: SubITMFormItemProps) {
  const { setValue } = useFormContext<PanelConfigurationFormValues>();

  // Only subscribe to hasID when the toggle is shown (ITM parent)
  const hasID = useWatch({
    control,
    name: `${basePath}.hasID` as any,
    disabled: !showIDToggle,
  });

  const toggleID = useCallback(() => {
    const newValue = !hasID;
    setValue(`${basePath}.hasID` as any, newValue);
    if (newValue) {
      setValue(`${basePath}.phaseID` as any, 'mono_2w');
      setValue(`${basePath}.amperajeID` as any, '');
      setValue(`${basePath}.cableTypeID` as any, 'libre_halogeno');
    } else {
      setValue(`${basePath}.phaseID` as any, undefined);
      setValue(`${basePath}.amperajeID` as any, undefined);
      setValue(`${basePath}.diameterID` as any, undefined);
      setValue(`${basePath}.cableTypeID` as any, undefined);
    }
  }, [basePath, hasID, setValue]);

  return (
    <View style={localStyles.subItmContainer}>
      <Controller
        control={control}
        name={`${basePath}.name` as any}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={localStyles.subItmNameRow}>
            <TextInput
              style={[styles.cnSectionTitle, localStyles.subItmNameInput]}
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCorrect={false}
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              smartInsertDelete={false}
              underlineColorAndroid="transparent"
              placeholder={`${subITMsPrefix || 'ITM'} ${subIdx + 1}`}
              placeholderTextColor="#9CA3AF"
            />
            <Ionicons name="pencil" size={11} color="#9CA3AF" />
          </View>
        )}
      />

      <Text style={styles.cnLabel}>FASES</Text>
      <Controller
        control={control}
        name={`${basePath}.phaseITM` as any}
        render={({ field: { onChange, value } }) => (
          <RNPickerSelect
            onValueChange={onChange}
            items={PHASE_PICKER_ITEMS}
            placeholder={PHASE_PLACEHOLDER}
            value={value}
            style={pickerStyleWithIcon}
            useNativeAndroidPickerStyle={false}
            Icon={PickerChevronIcon}
          />
        )}
      />

      <Text style={styles.cnLabel}>AMPERAJE:</Text>
      <View style={styles.inputWithUnitWrapper}>
        <Controller
          control={control}
          name={`${basePath}.amperajeITM` as any}
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

      <Text style={styles.cnLabel}>DIAMETRO:</Text>
      <View style={styles.inputWithUnitWrapper}>
        <Controller
          control={control}
          name={`${basePath}.diameter` as any}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.itgInputWithUnit}
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Ingrese diametro"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          )}
        />
        <Text style={styles.unitText}>mm2</Text>
      </View>

      <Text style={styles.cnLabel}>TIPO DE CABLE:</Text>
      <Controller
        control={control}
        name={`${basePath}.cableType` as any}
        render={({ field: { onChange, value } }) => (
          <RNPickerSelect
            onValueChange={onChange}
            items={CABLE_TYPE_PICKER_ITEMS}
            placeholder={GENERIC_PLACEHOLDER}
            value={value}
            style={pickerStyleWithIcon}
            useNativeAndroidPickerStyle={false}
            Icon={PickerChevronIcon}
          />
        )}
      />

      <Text style={styles.cnLabel}>SUMINISTRO:</Text>
      <Controller
        control={control}
        name={`${basePath}.supply` as any}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.itgInput}
            value={value || ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Que suministra?"
            placeholderTextColor="#9CA3AF"
          />
        )}
      />

      {/* Toggle ID (Interruptor Diferencial) — solo para sub-ITMs dentro de ITM */}
      {showIDToggle && (
        <View style={localStyles.marginTop12}>
          <Pressable
            style={[styles.toggleRow, hasID && styles.toggleRowActive]}
            onPress={toggleID}>
            <View style={styles.toggleIconRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={hasID ? '#0891B2' : '#6B7280'}
              />
              <Text
                style={[styles.toggleLabel, hasID && styles.toggleLabelActive]}>
                Diferencial (ID)
              </Text>
            </View>
            <View
              style={[styles.toggleSwitch, hasID && styles.toggleSwitchActive]}>
              <View
                style={[styles.toggleThumb, hasID && styles.toggleThumbActive]}
              />
            </View>
          </Pressable>

          {hasID && (
            <View style={localStyles.marginTop12}>
              <Text style={styles.cnLabel}>FASES</Text>
              <Controller
                control={control}
                name={`${basePath}.phaseID` as any}
                render={({ field: { onChange, value } }) => (
                  <RNPickerSelect
                    onValueChange={onChange}
                    items={PHASE_PICKER_ITEMS}
                    placeholder={PHASE_PLACEHOLDER}
                    value={value}
                    style={pickerStyleWithIcon}
                    useNativeAndroidPickerStyle={false}
                    Icon={PickerChevronIcon}
                  />
                )}
              />

              <Text style={styles.cnLabel}>AMPERAJE:</Text>
              <View style={styles.inputWithUnitWrapper}>
                <Controller
                  control={control}
                  name={`${basePath}.amperajeID` as any}
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

              <Text style={styles.cnLabel}>DIAMETRO:</Text>
              <View style={styles.inputWithUnitWrapper}>
                <Controller
                  control={control}
                  name={`${basePath}.diameterID` as any}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.itgInputWithUnit}
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Ingrese diametro"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                  )}
                />
                <Text style={styles.unitText}>mm2</Text>
              </View>

              <Text style={styles.cnLabel}>TIPO DE CABLE:</Text>
              <Controller
                control={control}
                name={`${basePath}.cableTypeID` as any}
                render={({ field: { onChange, value } }) => (
                  <RNPickerSelect
                    onValueChange={onChange}
                    items={CABLE_TYPE_PICKER_ITEMS}
                    placeholder={GENERIC_PLACEHOLDER}
                    value={value}
                    style={pickerStyleWithIcon}
                    useNativeAndroidPickerStyle={false}
                    Icon={PickerChevronIcon}
                  />
                )}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
});

// ─── COLLAPSED HEADER ─────────────────────────────────────────────────────────
// Receives cnPrefix as a prop (single subscription at the parent level via
// CircuitsConfigStep) instead of each collapsed header subscribing individually.
// With 29 collapsed items, this eliminates 29 useWatch subscriptions that each
// triggered re-renders when cnPrefix changed.
const CollapsedCircuitHeader = memo(function CollapsedCircuitHeader({
  index,
  itgIndex,
  cnPrefix,
  onToggleExpand,
}: Omit<CircuitItemProps, 'isExpanded'>) {
  const { getValues } = useFormContext<PanelConfigurationFormValues>();

  // Read name imperatively (no subscription, no re-renders from other fields)
  const name = getValues(
    `itgCircuits.${itgIndex}.circuits.${index}.name` as any,
  );
  const displayName =
    name && name.trim() !== '' ? name : `${cnPrefix || 'CN'}-${index + 1}`;

  return (
    <View style={styles.cnCard}>
      <Pressable
        style={styles.cnCardHeader}
        onPress={() => onToggleExpand(index)}>
        <View style={localStyles.nameContainer}>
          <Text style={styles.cnTitle} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color="#6B7280" />
      </Pressable>
    </View>
  );
});

// ─── EXPANDED CONTENT ─────────────────────────────────────────────────────────
// All hooks live here -- only mounted for the single expanded item.
// cnPrefix is passed as a prop but we also useWatch it here since the expanded
// item needs to react to live edits in the prefix field. This is fine because
// only 1 item is expanded at a time (1 subscription vs N).
const ExpandedCircuitContent = memo(function ExpandedCircuitContent({
  index,
  itgIndex,
  onToggleExpand,
}: Omit<CircuitItemProps, 'isExpanded'>) {
  const { control, setValue, getValues } =
    useFormContext<PanelConfigurationFormValues>();

  const prefix = `itgCircuits.${itgIndex}.circuits.${index}` as const;

  // Read cnPrefix reactively (lightweight scalar watch)
  const cnPrefix =
    useWatch({
      control,
      name: `itgCircuits.${itgIndex}.cnPrefix` as const,
    }) || '';

  // These hooks only run for the 1 expanded item, not 74 collapsed ones
  const hasID = useWatch({
    control,
    name: `${prefix}.hasID`,
  });

  const hasSubITMs = useWatch({
    control,
    name: `${prefix}.hasSubITMs`,
  });

  const interruptorType =
    useWatch({
      control,
      name: `${prefix}.interruptorType`,
    }) || 'itm';

  const subITMsCount =
    useWatch({
      control,
      name: `${prefix}.subITMsCount`,
    }) || '1';

  const subITMsPrefix =
    useWatch({
      control,
      name: `${prefix}.subITMsPrefix`,
    }) || 'ITM';

  // Local state for the sub-ITMs count — same pattern as circuitsCount in
  // CircuitsConfigStep. We do NOT useWatch on the subITMs array (that would
  // re-render on every field change inside any sub-ITM). Instead, syncSubITMsArray
  // pushes the new length here after mutating the form array.
  const [subITMsLength, setSubITMsLength] = useState(() => {
    const actualArray = getValues(`${prefix}.subITMs` as any) as
      | any[]
      | undefined;
    return actualArray?.length || 0;
  });

  const [localCircuitName, setLocalCircuitName] = useState(() => {
    const currentName = getValues(`${prefix}.name` as any);
    return typeof currentName === 'string' ? currentName : '';
  });

  const commitCircuitName = useCallback(() => {
    const trimmed = localCircuitName.trim();
    setValue(`${prefix}.name` as any, trimmed === '' ? undefined : trimmed, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setLocalCircuitName(trimmed);
  }, [localCircuitName, prefix, setValue]);

  const displayName =
    localCircuitName && localCircuitName.trim() !== ''
      ? localCircuitName
      : `${cnPrefix || 'CN'}-${index + 1}`;

  // Syncs subITMs array length with the desired count, preserving existing data.
  // Also updates the local subITMsLength state so the render loop picks up
  // the new count without needing useWatch on the full array.
  const syncSubITMsArray = useCallback(
    (targetCount: number) => {
      const currentSubITMs = getValues(`${prefix}.subITMs` as any) || [];
      let newSubITMs = [...currentSubITMs];

      while (newSubITMs.length < targetCount) {
        newSubITMs.push({ ...DEFAULT_SUB_ITM });
      }
      if (newSubITMs.length > targetCount) {
        newSubITMs = newSubITMs.slice(0, targetCount);
      }

      setValue(`${prefix}.subITMs` as any, newSubITMs);
      setSubITMsLength(newSubITMs.length);
    },
    [prefix, getValues, setValue],
  );

  // ── ITM sub-ITMs count: local state for free typing, commit on blur ──
  // This avoids the problem where clamping on every keystroke prevents the
  // user from clearing the field to type a new number (e.g. delete "1" → "3" → "30").
  const [itmCountInput, setItmCountInput] = useState(subITMsCount);

  // Sync local state when form value changes externally (e.g. toggle reset)
  useEffect(() => {
    setItmCountInput(subITMsCount);
  }, [subITMsCount]);

  // Accept raw text while typing — only digits allowed, strip leading zeros
  const onChangeItmCount = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    // Strip leading zeros: "02" → "2", but keep single "0" if user typed "0"
    const stripped =
      cleaned.replace(/^0+/, '') || (cleaned.length > 0 ? '0' : '');
    // Allow empty string so user can clear and retype
    const display = text === '' ? '' : stripped;
    setItmCountInput(display);
  }, []);

  // Commit the value on blur: clamp to [1, max] and sync the sub-ITMs array
  const onBlurItmCount = useCallback(() => {
    const n = parseInt(itmCountInput, 10);
    const clamped = isNaN(n) || n < 1 ? 1 : Math.min(n, SUB_ITMS_MAX_ITM);
    const value = String(clamped);

    setItmCountInput(value);
    setValue(`${prefix}.subITMsCount` as any, value);
    syncSubITMsArray(clamped);
  }, [itmCountInput, prefix, setValue, syncSubITMsArray]);

  // Updates the sub-ITMs count for ID type (segment control: 1-3)
  const updateSubITMsCountID = useCallback(
    (newCount: string) => {
      const n = parseInt(newCount, 10);
      if (isNaN(n) || n < 1 || n > SUB_ITMS_MAX_ID) return;

      setValue(`${prefix}.subITMsCount` as any, newCount);
      syncSubITMsArray(n);
    },
    [prefix, setValue, syncSubITMsArray],
  );

  // Handles the ITM sub-ITMs toggle: initializes or clears the array
  const toggleITMSubITMs = useCallback(() => {
    const newValue = !hasSubITMs;
    setValue(`${prefix}.hasSubITMs` as any, newValue);

    if (newValue) {
      // Initialize with 1 sub-ITM
      setValue(`${prefix}.subITMsCount` as any, '1');
      syncSubITMsArray(1);
    } else {
      // Clear sub-ITMs data
      setValue(`${prefix}.subITMsCount` as any, '1');
      setValue(`${prefix}.subITMs` as any, []);
      setSubITMsLength(0);
    }
  }, [prefix, hasSubITMs, setValue, syncSubITMsArray]);

  // Handles the ID toggle for ITM type
  const toggleIDForITM = useCallback(() => {
    const newValue = !hasID;
    setValue(`${prefix}.hasID` as any, newValue);

    if (!newValue) {
      setValue(`${prefix}.phaseID` as any, undefined);
      setValue(`${prefix}.amperajeID` as any, undefined);
      setValue(`${prefix}.diameterID` as any, undefined);
      setValue(`${prefix}.cableTypeID` as any, undefined);
    } else {
      setValue(`${prefix}.phaseID` as any, 'mono_2w');
      setValue(`${prefix}.amperajeID` as any, '');
      setValue(`${prefix}.cableTypeID` as any, 'libre_halogeno');
    }
  }, [prefix, hasID, setValue]);

  // Track individual field errors via refs updated inside Controller render props,
  // then synced to state via useEffect to avoid setState-during-render.
  const pendingErrorsRef = useRef({
    amperaje: false,
    diameter: false,
    cableType: false,
  });
  const [fieldErrors, setFieldErrors] = useState({
    amperaje: false,
    diameter: false,
    cableType: false,
  });
  const hasErrors =
    fieldErrors.amperaje || fieldErrors.diameter || fieldErrors.cableType;

  // Flush pending error changes after render (avoids setState during render)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs every render to sync ref → state
  useEffect(() => {
    const pending = pendingErrorsRef.current;
    setFieldErrors(prev => {
      if (
        prev.amperaje === pending.amperaje &&
        prev.diameter === pending.diameter &&
        prev.cableType === pending.cableType
      ) {
        return prev; // no change, skip re-render
      }
      return { ...pending };
    });
  });

  // Build stable base paths for sub-ITM forms to avoid string concatenation in render
  const subITMBasePath = `${prefix}.subITMs`;

  // Generate index array for sub-ITMs rendering (avoids watching the full array)
  const subITMIndices = useMemo(
    () => Array.from({ length: subITMsLength }, (_, i) => i),
    [subITMsLength],
  );

  // ── Sub-ITM pagination: only render SUB_ITM_PAGE_SIZE at a time ──
  const [subITMVisibleCount, setSubITMVisibleCount] =
    useState(SUB_ITM_PAGE_SIZE);

  // Reset visible count when subITMs count changes (e.g. user toggles off/on)
  useEffect(() => {
    setSubITMVisibleCount(SUB_ITM_PAGE_SIZE);
  }, [subITMsLength]);

  const visibleSubITMIndices = useMemo(
    () => subITMIndices.slice(0, subITMVisibleCount),
    [subITMIndices, subITMVisibleCount],
  );

  const hasMoreSubITMs = subITMVisibleCount < subITMsLength;

  const showMoreSubITMs = useCallback(() => {
    setSubITMVisibleCount(prev =>
      Math.min(prev + SUB_ITM_PAGE_SIZE, subITMsLength),
    );

    Sentry.addBreadcrumb({
      category: 'circuits',
      message: `Show more sub-ITMs (now showing ${Math.min(subITMVisibleCount + SUB_ITM_PAGE_SIZE, subITMsLength)}/${subITMsLength})`,
      level: 'info',
    });
  }, [subITMsLength, subITMVisibleCount]);

  // Whether to show the main supply field:
  // - For ITM: only if there are no sub-ITMs active (each sub-ITM has its own supply)
  // - For ID: never (sub-ITMs always present)
  const showMainSupply =
    interruptorType === 'itm' && !(hasSubITMs && subITMsLength > 0);

  return (
    <View style={[styles.cnCard, hasErrors && errorBorderStyle]}>
      {/* Header con TextInput y toggle */}
      <View style={styles.cnCardHeader}>
        <View style={localStyles.editableNameContainer}>
          <TextInput
            style={[styles.cnTitle, localStyles.editableTextInput]}
            value={localCircuitName}
            onChangeText={setLocalCircuitName}
            onBlur={commitCircuitName}
            autoCorrect={false}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            smartInsertDelete={false}
            underlineColorAndroid="transparent"
            placeholder={`${cnPrefix || 'CN'}-${index + 1}`}
            placeholderTextColor="#9CA3AF"
          />
          <Ionicons name="pencil" size={12} color="#6B7280" />
        </View>
        <Pressable
          style={localStyles.toggleArea}
          onPress={() => onToggleExpand(index)}>
          {hasErrors && (
            <View style={localStyles.errorBadge}>
              <Text style={localStyles.errorBadgeText}>Incompleto</Text>
            </View>
          )}
          <Ionicons
            name="chevron-up"
            size={20}
            color={hasErrors ? '#EF4444' : '#6B7280'}
          />
        </Pressable>
      </View>

      {/* -- Full content -- */}
      <View>
        {/* Selector de tipo de interruptor */}
        <Text style={styles.cnLabel}>TIPO DE INTERRUPTOR:</Text>
        <View style={styles.segmentContainer}>
          {INTERRUPTOR_OPTIONS.map(option => (
            <Pressable
              key={option.key}
              style={[
                styles.segment,
                interruptorType === option.key && styles.segmentActive,
              ]}
              onPress={() =>
                setValue(`${prefix}.interruptorType` as any, option.key)
              }>
              <Text
                style={[
                  styles.segmentText,
                  interruptorType === option.key && styles.segmentTextActive,
                ]}>
                {option.shortLabel}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Titulo segun el tipo seleccionado */}
        <Text style={styles.cnSectionTitle}>
          {INTERRUPTOR_OPTIONS.find(o => o.key === interruptorType)?.label ||
            'Interruptor Termomagnetico (ITM)'}
        </Text>
        {interruptorType !== 'reserva' && (
          <View>
            <Text style={styles.cnLabel}>FASES</Text>
            <Controller
              control={control}
              name={`${prefix}.phase`}
              render={({ field: { onChange, value } }) => (
                <RNPickerSelect
                  onValueChange={onChange}
                  items={PHASE_PICKER_ITEMS}
                  placeholder={PHASE_PLACEHOLDER}
                  value={value}
                  style={pickerStyleWithIcon}
                  useNativeAndroidPickerStyle={false}
                  Icon={PickerChevronIcon}
                />
              )}
            />

            <Text style={styles.cnLabel}>AMPERAJE:</Text>
            <Controller
              control={control}
              name={`${prefix}.amperaje`}
              render={({
                field: { onChange, onBlur, value },
                fieldState: { error: amperajeError },
              }) => {
                // Update ref (will be flushed to state via useEffect after render)
                pendingErrorsRef.current.amperaje = !!amperajeError;
                return (
                  <>
                    <View style={styles.inputWithUnitWrapper}>
                      <TextInput
                        style={[
                          styles.itgInputWithUnit,
                          amperajeError && styles.inputError,
                        ]}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Ingrese amperaje"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                      />
                      <Text style={styles.unitText}>A</Text>
                    </View>
                    {amperajeError && (
                      <Text style={styles.errorText}>
                        {amperajeError.message}
                      </Text>
                    )}
                  </>
                );
              }}
            />

            {/* Diametro */}
            <Text style={styles.cnLabel}>DIAMETRO:</Text>
            <Controller
              control={control}
              name={`${prefix}.diameter`}
              render={({
                field: { onChange, onBlur, value },
                fieldState: { error: diameterError },
              }) => {
                pendingErrorsRef.current.diameter = !!diameterError;
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
                        placeholder="Ingrese diametro"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                      />
                      <Text style={styles.unitText}>mm2</Text>
                    </View>
                    {diameterError && (
                      <Text style={styles.errorText}>
                        {diameterError.message}
                      </Text>
                    )}
                  </>
                );
              }}
            />

            {/* Tipo de Cable */}
            <Text style={styles.cnLabel}>TIPO DE CABLE:</Text>
            <Controller
              control={control}
              name={`${prefix}.cableType`}
              render={({
                field: { onChange, value },
                fieldState: { error: cableTypeError },
              }) => {
                pendingErrorsRef.current.cableType = !!cableTypeError;
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
                        cableTypeError
                          ? PickerChevronErrorIcon
                          : PickerChevronIcon
                      }
                    />
                    {cableTypeError && (
                      <Text style={styles.errorText}>
                        Seleccione tipo de cable
                      </Text>
                    )}
                  </>
                );
              }}
            />

            {/* ── ITM-specific sections ── */}
            {interruptorType === 'itm' && (
              <View style={localStyles.marginTop12}>
                {/* ID Toggle (Interruptor Diferencial opcional) */}
                <Pressable
                  style={[styles.toggleRow, hasID && styles.toggleRowActive]}
                  onPress={toggleIDForITM}>
                  <View style={styles.toggleIconRow}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={hasID ? '#0891B2' : '#6B7280'}
                    />
                    <Text
                      style={[
                        styles.toggleLabel,
                        hasID && styles.toggleLabelActive,
                      ]}>
                      Interruptor diferencial (ID)
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.toggleSwitch,
                      hasID && styles.toggleSwitchActive,
                    ]}>
                    <View
                      style={[
                        styles.toggleThumb,
                        hasID && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>

                {hasID && (
                  <View style={localStyles.marginTop12}>
                    <Text style={styles.cnLabel}>FASES</Text>
                    <Controller
                      control={control}
                      name={`${prefix}.phaseID`}
                      render={({ field: { onChange, value } }) => (
                        <RNPickerSelect
                          onValueChange={onChange}
                          items={PHASE_PICKER_ITEMS}
                          placeholder={PHASE_PLACEHOLDER}
                          value={value}
                          style={pickerStyleWithIcon}
                          useNativeAndroidPickerStyle={false}
                          Icon={PickerChevronIcon}
                        />
                      )}
                    />
                    <Text style={styles.cnLabel}>AMPERAJE:</Text>
                    <View style={styles.inputWithUnitWrapper}>
                      <Controller
                        control={control}
                        name={`${prefix}.amperajeID`}
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

                    {/* Diametro ID */}
                    <Text style={styles.cnLabel}>DIAMETRO:</Text>
                    <View style={styles.inputWithUnitWrapper}>
                      <Controller
                        control={control}
                        name={`${prefix}.diameterID`}
                        render={({ field: { onChange, onBlur, value } }) => (
                          <TextInput
                            style={styles.itgInputWithUnit}
                            value={value || ''}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            placeholder="Ingrese diametro"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                          />
                        )}
                      />
                      <Text style={styles.unitText}>mm2</Text>
                    </View>

                    {/* Tipo de Cable ID */}
                    <Text style={styles.cnLabel}>TIPO DE CABLE:</Text>
                    <Controller
                      control={control}
                      name={`${prefix}.cableTypeID`}
                      render={({ field: { onChange, value } }) => (
                        <RNPickerSelect
                          onValueChange={onChange}
                          items={CABLE_TYPE_PICKER_ITEMS}
                          placeholder={GENERIC_PLACEHOLDER}
                          value={value}
                          style={pickerStyleWithIcon}
                          useNativeAndroidPickerStyle={false}
                          Icon={PickerChevronIcon}
                        />
                      )}
                    />
                  </View>
                )}

                {/* Sub-ITMs Toggle for ITM type */}
                <View style={localStyles.marginTop12}>
                  <Pressable
                    style={[
                      styles.toggleRow,
                      hasSubITMs && styles.toggleRowActive,
                    ]}
                    onPress={toggleITMSubITMs}>
                    <View style={styles.toggleIconRow}>
                      <Ionicons
                        name="git-branch-outline"
                        size={20}
                        color={hasSubITMs ? '#0891B2' : '#6B7280'}
                      />
                      <Text
                        style={[
                          styles.toggleLabel,
                          hasSubITMs && styles.toggleLabelActive,
                        ]}>
                        Sub-ITMs
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.toggleSwitch,
                        hasSubITMs && styles.toggleSwitchActive,
                      ]}>
                      <View
                        style={[
                          styles.toggleThumb,
                          hasSubITMs && styles.toggleThumbActive,
                        ]}
                      />
                    </View>
                  </Pressable>

                  {hasSubITMs && (
                    <View style={localStyles.marginTop12}>
                      <Text style={styles.cnLabel}>
                        CANTIDAD DE SUB-ITMs (1-{SUB_ITMS_MAX_ITM}):
                      </Text>
                      <View style={styles.inputWithUnitWrapper}>
                        <TextInput
                          style={styles.itgInputWithUnit}
                          value={itmCountInput}
                          onChangeText={onChangeItmCount}
                          onBlur={onBlurItmCount}
                          keyboardType="numeric"
                          placeholder="1"
                          placeholderTextColor="#9CA3AF"
                          maxLength={2}
                        />
                        <Text style={styles.unitText}>uds</Text>
                      </View>

                      <Text style={styles.cnLabel}>PREFIJO SUB-ITMs:</Text>
                      <Controller
                        control={control}
                        name={`${prefix}.subITMsPrefix`}
                        render={({ field: { onChange, onBlur, value } }) => (
                          <TextInput
                            style={styles.itgInput}
                            value={value || ''}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            placeholder="ITM"
                            placeholderTextColor="#9CA3AF"
                            maxLength={10}
                            autoCapitalize="characters"
                          />
                        )}
                      />

                      {/* Render each sub-ITM with memoized component (paginated) */}
                      {visibleSubITMIndices.map(subIdx => (
                        <SubITMFormItem
                          key={subIdx}
                          control={control}
                          basePath={`${subITMBasePath}.${subIdx}`}
                          subIdx={subIdx}
                          showIDToggle={true}
                          subITMsPrefix={subITMsPrefix}
                        />
                      ))}
                      {hasMoreSubITMs && (
                        <Pressable
                          style={localStyles.showMoreBtn}
                          onPress={showMoreSubITMs}>
                          <Ionicons
                            name="add-circle-outline"
                            size={18}
                            color="#0891B2"
                          />
                          <Text style={localStyles.showMoreText}>
                            Mostrar más ({subITMVisibleCount}/{subITMsLength})
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ── ID-specific sections: Sub-ITMs (1-3 via segments) ── */}
            {interruptorType === 'id' && (
              <View style={localStyles.marginTop12}>
                <Text style={styles.cnLabel}>CANTIDAD DE ITMs:</Text>
                <View style={styles.segmentContainer}>
                  {ID_SUB_ITM_COUNT_OPTIONS.map(num => (
                    <Pressable
                      key={num}
                      style={[
                        styles.segment,
                        subITMsCount === num && styles.segmentActive,
                      ]}
                      onPress={() => updateSubITMsCountID(num)}>
                      <Text
                        style={[
                          styles.segmentText,
                          subITMsCount === num && styles.segmentTextActive,
                        ]}>
                        {num}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.cnLabel}>PREFIJO ITMs:</Text>
                <Controller
                  control={control}
                  name={`${prefix}.subITMsPrefix`}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.itgInput}
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="ITM"
                      placeholderTextColor="#9CA3AF"
                      maxLength={10}
                      autoCapitalize="characters"
                    />
                  )}
                />

                {/* Render each sub-ITM with memoized component */}
                {subITMIndices.map(subIdx => (
                  <SubITMFormItem
                    key={subIdx}
                    control={control}
                    basePath={`${subITMBasePath}.${subIdx}`}
                    subIdx={subIdx}
                    showIDToggle={false}
                    subITMsPrefix={subITMsPrefix}
                  />
                ))}
              </View>
            )}

            {/* Suministro - only shown when no sub-ITMs are active for ITM */}
            {showMainSupply && (
              <View>
                <Text style={[styles.cnLabel, localStyles.marginTop12]}>
                  Que suministra electricamente el Circuito {displayName}?
                </Text>
                <Controller
                  control={control}
                  name={`${prefix}.supply`}
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
            )}
          </View>
        )}
      </View>
    </View>
  );
});

// ─── WRAPPER (exported) ───────────────────────────────────────────────────────
// Decides which component to mount. Collapsed = minimal hooks. Expanded = all hooks.
function CircuitItemWrapper(props: CircuitItemProps) {
  if (props.isExpanded) {
    return (
      <ExpandedCircuitContent
        index={props.index}
        itgIndex={props.itgIndex}
        cnPrefix={props.cnPrefix}
        onToggleExpand={props.onToggleExpand}
      />
    );
  }
  return (
    <CollapsedCircuitHeader
      index={props.index}
      itgIndex={props.itgIndex}
      cnPrefix={props.cnPrefix}
      onToggleExpand={props.onToggleExpand}
    />
  );
}

// Extracted static styles
const localStyles = StyleSheet.create({
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  editableNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  editableTextInput: {
    padding: 0,
    margin: 0,
    flex: 1,
    minWidth: 40,
    fontSize: 14,
  },
  toggleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  errorBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  errorBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  marginTop12: {
    marginTop: 12,
  },
  noMarginTop: {
    marginTop: 0,
  },
  subItmContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subItmNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginBottom: 8,
  },
  subItmNameInput: {
    padding: 0,
    margin: 0,
    marginTop: 0,
    minWidth: 40,
    flex: 1,
    fontSize: 14,
  },
  showMoreBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#0891B2',
    borderRadius: 8,
    borderStyle: 'dashed' as const,
    backgroundColor: '#F0FDFA',
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#0891B2',
  },
});

export default memo(CircuitItemWrapper);
