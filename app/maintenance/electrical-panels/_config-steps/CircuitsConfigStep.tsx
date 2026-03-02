import {
  View,
  Text,
  TextInput,
  Alert,
  FlatList,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFormContext, Controller, useWatch } from 'react-hook-form';
import {
  CircuitsConfigStepProps,
  CircuitsConfigStepRef,
  CircuitConfig,
} from '@/types/panel-configuration';
import { PanelConfigurationFormValues } from '@/schemas/panel-configuration';
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
  memo,
} from 'react';
import ProgressTabs from '@/components/progress-tabs';
import { styles } from './_styles';
import CircuitItem from './CircuitItem';

const DEFAULT_CIRCUIT: CircuitConfig = {
  name: undefined,
  interruptorType: 'itm',
  phase: 'mono_2w',
  amperaje: '',
  diameter: '',
  cableType: undefined,
  supply: '',
  hasID: false,
  phaseID: undefined,
  amperajeID: '',
  diameterID: '',
  cableTypeID: 'libre_halogeno',
  hasSubITMs: false,
  subITMsCount: '1',
  subITMs: [],
};

// ─── Extracted Header Component ──────────────────────────────────────────────
// Extracted as a separate memoized component so that TextInput focus is never
// lost due to parent re-renders from FlatList data changes.
interface HeaderProps {
  panel: CircuitsConfigStepProps['panel'];
  selectedItgIndex: number;
  itgCircuitsLength: number;
  itgDescription: string | undefined;
  onCircuitsCountChange: (count: number) => void;
}

const ListHeader = memo(function ListHeader({
  panel,
  selectedItgIndex,
  itgCircuitsLength,
  itgDescription,
  onCircuitsCountChange,
}: HeaderProps) {
  const { control, setValue, getValues, getFieldState, trigger } =
    useFormContext<PanelConfigurationFormValues>();

  const tabLabels = useMemo(
    () =>
      Array.from({ length: itgCircuitsLength }, (_, i) => `IT - G${i + 1} `),
    [itgCircuitsLength],
  );

  // Read errors imperatively — avoids subscribing to the entire formState.errors tree.
  // We trigger field-level validation on blur / submit; here we just need to
  // display the state after trigger() has run.
  const prefixState = getFieldState(
    `itgCircuits.${selectedItgIndex}.cnPrefix` as any,
  );
  const countState = getFieldState(
    `itgCircuits.${selectedItgIndex}.circuitsCount` as any,
  );

  // Circuits count handler — local to the header so it doesn't force
  // the entire list to re-render.
  const updateCircuitsCount = useCallback(
    (value: string) => {
      const n = Math.max(0, parseInt(value || '0', 10) || 0);
      const currentCircuitsList =
        getValues(`itgCircuits.${selectedItgIndex}.circuits`) || [];
      const currentLength = currentCircuitsList.length;

      let newCircuits = [...currentCircuitsList];

      if (n > currentLength) {
        for (let i = currentLength; i < n; i++) {
          newCircuits.push({
            ...DEFAULT_CIRCUIT,
            cableType: 'libre_halogeno' as const,
          });
        }
      } else if (n < currentLength) {
        newCircuits = newCircuits.slice(0, n);
      }

      setValue(`itgCircuits.${selectedItgIndex}.circuits`, newCircuits as any);
      setValue(`itgCircuits.${selectedItgIndex}.circuitsCount`, value);

      // Notify the parent of the new circuits count so it can update the
      // FlatList data without watching the entire circuits array.
      onCircuitsCountChange(n);
    },
    [selectedItgIndex, getValues, setValue, onCircuitsCountChange],
  );

  return (
    <View style={styles.contentWrapper}>
      {/* Equipo */}
      <Text style={styles.equipmentLabel}>
        Equipo {panel?.equipment_detail?.rotulo || panel?.codigo || ''}
      </Text>

      {/* Tabs for IT-G selection */}
      {itgCircuitsLength > 1 && (
        <ProgressTabs
          items={tabLabels}
          selectedIndex={selectedItgIndex}
          onSelectIndex={noop}
          disabled={true}
        />
      )}

      {/* IT-G description */}
      {itgDescription && (
        <Text style={styles.itgDescription}>{itgDescription}</Text>
      )}

      {/* Prefijo */}
      <View style={marginBottom8Style}>
        <View style={styles.labelWithIconRow}>
          <Text style={styles.countLabel}>Ingrese el prefijo</Text>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#6B7280"
          />
        </View>
        <Controller
          control={control}
          name={`itgCircuits.${selectedItgIndex}.cnPrefix` as const}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, prefixState.error && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="CN, SA"
              placeholderTextColor="#9CA3AF"
            />
          )}
        />
        {prefixState.error && (
          <Text style={styles.errorText}>{prefixState.error.message}</Text>
        )}
      </View>

      {/* ¿Cuántos circuitos tienes? */}
      <View style={styles.rowBetween}>
        <Text style={styles.countLabel}>¿Cuántos circuitos tienes?</Text>
        <Controller
          control={control}
          name={`itgCircuits.${selectedItgIndex}.circuitsCount` as const}
          render={({ field: { value } }) => (
            <TextInput
              style={[styles.countInput, countState.error && styles.inputError]}
              value={value}
              onChangeText={updateCircuitsCount}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor="#9CA3AF"
            />
          )}
        />
      </View>
      {countState.error && (
        <Text style={styles.errorText}>{countState.error.message}</Text>
      )}
    </View>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────

// Lightweight index-only item type for FlatList. Each CircuitItem reads its own
// form data via useFormContext — we never need the full CircuitConfig object here.
type CircuitIndexItem = { _idx: number };

const CircuitsConfigStep = forwardRef<
  CircuitsConfigStepRef,
  CircuitsConfigStepProps
>(function CircuitsConfigStep({ panel }, ref) {
  const { control, trigger, clearErrors, getFieldState, getValues } =
    useFormContext<PanelConfigurationFormValues>();

  // Watch only the count string (lightweight) instead of the entire itgCircuits array.
  // This prevents massive re-renders when any circuit field changes.
  const itgCount = useWatch({ control, name: 'itgCount' }) || '1';
  const itgCircuitsLength = Math.max(1, parseInt(itgCount, 10) || 1);

  const [selectedItgIndex, setSelectedItgIndex] = useState(0);

  // ── Circuits count: driven by a scalar state, NOT useWatch on the array ──
  // The header's `updateCircuitsCount` callback pushes the new count here.
  // We also seed the value from `circuitsCount` form field on ITG change.
  const [circuitsCount, setCircuitsCount] = useState(() => {
    const initial = getValues(
      `itgCircuits.${0}.circuitsCount` as any,
    ) as string;
    const circuits = getValues(`itgCircuits.${0}.circuits` as any) as any[];
    // Prefer actual array length over the text field (the text might lag)
    return circuits?.length || Math.max(0, parseInt(initial || '0', 10) || 0);
  });

  // Re-seed when switching ITG tabs
  useEffect(() => {
    const circuits = getValues(
      `itgCircuits.${selectedItgIndex}.circuits` as any,
    ) as any[];
    setCircuitsCount(circuits?.length || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItgIndex]);

  // Callback passed to ListHeader so it can notify us of count changes
  // without us subscribing to the full circuits array via useWatch.
  const onCircuitsCountChange = useCallback((n: number) => {
    setCircuitsCount(n);
  }, []);

  // Watch only the itgDescription for the header (lightweight scalar)
  const itgDescription = useWatch({
    control,
    name: `itgDescriptions.${selectedItgIndex}` as const,
  });

  // ── Validation & Navigation ──────────────────────────────────────────────

  const validateCurrentItg = useCallback(async (): Promise<boolean> => {
    const result = await trigger(`itgCircuits.${selectedItgIndex}` as any);

    if (!result) {
      // Read fresh field state after trigger() — the `errors` from the
      // render-time closure is stale at this point because trigger() updated
      // the form state asynchronously.
      const prefixState = getFieldState(
        `itgCircuits.${selectedItgIndex}.cnPrefix` as any,
      );
      const countState = getFieldState(
        `itgCircuits.${selectedItgIndex}.circuitsCount` as any,
      );
      const circuitsState = getFieldState(
        `itgCircuits.${selectedItgIndex}.circuits` as any,
      );

      const errorMessages: string[] = [];

      if (prefixState.error) {
        errorMessages.push('• Prefijo es requerido');
      }
      if (countState.error) {
        errorMessages.push('• Cantidad de circuitos debe ser mayor a 0');
      }
      if (circuitsState.error) {
        errorMessages.push('• Complete todos los campos de los circuitos');
      }

      if (errorMessages.length > 0) {
        Alert.alert(
          `Error en IT-G${selectedItgIndex + 1}`,
          `Por favor complete los siguientes campos:\n\n${errorMessages.join('\n')}`,
        );
      }
    }

    return result;
  }, [selectedItgIndex, trigger, getFieldState]);

  const handleNext = useCallback(async () => {
    const isValid = await validateCurrentItg();
    if (!isValid) return false;

    if (selectedItgIndex < itgCircuitsLength - 1) {
      clearErrors('itgCircuits');
      setSelectedItgIndex(prev => prev + 1);
      return false;
    }
    return true;
  }, [selectedItgIndex, itgCircuitsLength, validateCurrentItg, clearErrors]);

  const handleBack = useCallback(() => {
    if (selectedItgIndex > 0) {
      clearErrors('itgCircuits');
      setSelectedItgIndex(prev => prev - 1);
      return false;
    }
    return true;
  }, [selectedItgIndex, clearErrors]);

  useImperativeHandle(
    ref,
    () => ({
      handleNext,
      handleBack,
    }),
    [handleNext, handleBack],
  );

  // ── Expand / Collapse ────────────────────────────────────────────────────

  const [expandedIndicesMap, setExpandedIndicesMap] = useState<
    Record<number, number[]>
  >({});

  const expandedIndices = useMemo(
    () => expandedIndicesMap[selectedItgIndex] || [],
    [expandedIndicesMap, selectedItgIndex],
  );

  // Track previous circuits count to detect new additions
  const prevCircuitsCountRef = useRef(circuitsCount);
  const prevItgIndexRef = useRef(selectedItgIndex);

  useEffect(() => {
    if (prevItgIndexRef.current === selectedItgIndex) {
      if (circuitsCount > prevCircuitsCountRef.current) {
        const newIndices = Array.from(
          { length: circuitsCount - prevCircuitsCountRef.current },
          (_, i) => prevCircuitsCountRef.current + i,
        );
        setExpandedIndicesMap(prev => ({
          ...prev,
          [selectedItgIndex]: [
            ...(prev[selectedItgIndex] || []),
            ...newIndices,
          ],
        }));
      }
    }
    prevCircuitsCountRef.current = circuitsCount;
    prevItgIndexRef.current = selectedItgIndex;
  }, [circuitsCount, selectedItgIndex]);

  const toggleExpand = useCallback(
    (index: number) => {
      setExpandedIndicesMap(prev => {
        const currentIndices = prev[selectedItgIndex] || [];
        const newIndices = currentIndices.includes(index)
          ? currentIndices.filter((i: number) => i !== index)
          : [...currentIndices, index];
        return { ...prev, [selectedItgIndex]: newIndices };
      });
    },
    [selectedItgIndex],
  );

  // ── FlatList Helpers ─────────────────────────────────────────────────────

  // Stable index-only data array. Only re-created when count or ITG changes.
  // Each CircuitItem reads its own form data — we never pass CircuitConfig here.
  const stableData = useMemo<CircuitIndexItem[]>(
    () => Array.from({ length: circuitsCount }, (_, i) => ({ _idx: i })),
    [circuitsCount, selectedItgIndex],
  );

  const getCircuitKey = useCallback(
    (item: CircuitIndexItem) => `itg-${selectedItgIndex}-circuit-${item._idx}`,
    [selectedItgIndex],
  );

  // Store expandedSet in a ref so that `renderItem` identity doesn't change
  // when the user expands/collapses a circuit. Each CircuitItem receives
  // `isExpanded` via the ref lookup — the FlatList won't re-render ALL items
  // on expand/collapse; only the toggled item re-renders (via its own state).
  const expandedSetRef = useRef(new Set<number>());
  expandedSetRef.current = useMemo(
    () => new Set(expandedIndices),
    [expandedIndices],
  );

  // renderItem is now stable across expand/collapse and cnPrefix changes.
  // - cnPrefix: each CircuitItem reads it via useWatch internally (Fix #5)
  // - expandedSet: read from ref (Fix #8)
  // - only `selectedItgIndex` and `toggleExpand` can change its identity
  const renderItem = useCallback(
    ({ item }: { item: CircuitIndexItem }) => (
      <View style={paddingStyle}>
        <CircuitItem
          index={item._idx}
          itgIndex={selectedItgIndex}
          isExpanded={expandedSetRef.current.has(item._idx)}
          onToggleExpand={toggleExpand}
        />
      </View>
    ),
    [selectedItgIndex, toggleExpand],
  );

  // Memoize the header element so FlatList doesn't re-mount it
  const headerElement = useMemo(
    () => (
      <ListHeader
        key={selectedItgIndex}
        panel={panel}
        selectedItgIndex={selectedItgIndex}
        itgCircuitsLength={itgCircuitsLength}
        itgDescription={itgDescription}
        onCircuitsCountChange={onCircuitsCountChange}
      />
    ),
    [
      panel,
      selectedItgIndex,
      itgCircuitsLength,
      itgDescription,
      onCircuitsCountChange,
    ],
  );

  // Track keyboard height on Android to add dynamic bottom padding,
  // so inputs near the bottom aren't hidden behind the keyboard.
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

  const dynamicContentPadding = useMemo(
    () => ({ paddingBottom: keyboardHeight > 0 ? keyboardHeight : 24 }),
    [keyboardHeight],
  );

  return (
    <View style={containerStyle}>
      <FlatList<CircuitIndexItem>
        data={stableData}
        keyExtractor={getCircuitKey}
        renderItem={renderItem}
        ListHeaderComponent={headerElement}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        // removeClippedSubviews can cause crashes with complex items
        // (TextInputs, pickers, nested views) on both platforms. For form-heavy
        // lists where stability is critical, keep it disabled.
        removeClippedSubviews={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={dynamicContentPadding}
        // Force re-render of visible items when expand/collapse state changes.
        // This is needed because we read from expandedSetRef in renderItem.
        extraData={expandedIndices}
      />
    </View>
  );
});

// Static style objects & callbacks extracted outside the component to prevent re-creation
const containerStyle = { flex: 1 } as const;
const paddingStyle = { paddingHorizontal: 24 } as const;
const marginBottom8Style = { marginBottom: 8 } as const;
const noop = () => {};

export default CircuitsConfigStep;
