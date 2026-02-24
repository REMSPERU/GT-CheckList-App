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
}

const ListHeader = memo(function ListHeader({
  panel,
  selectedItgIndex,
  itgCircuitsLength,
  itgDescription,
}: HeaderProps) {
  const {
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<PanelConfigurationFormValues>();

  const tabLabels = useMemo(
    () =>
      Array.from({ length: itgCircuitsLength }, (_, i) => `IT - G${i + 1} `),
    [itgCircuitsLength],
  );

  // Circuits count handler — local to the header so it doesn't force
  // the entire list to re-render.
  const updateCircuitsCount = useCallback(
    (value: string) => {
      const n = Math.max(0, parseInt(value || '0', 10));
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
    },
    [selectedItgIndex, getValues, setValue],
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
          onSelectIndex={() => {}}
          disabled={true}
        />
      )}

      {/* IT-G description */}
      {itgDescription && (
        <Text style={styles.itgDescription}>{itgDescription}</Text>
      )}

      {/* Prefijo */}
      <View style={{ marginBottom: 8 }}>
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
              style={[
                styles.input,
                errors.itgCircuits?.[selectedItgIndex]?.cnPrefix &&
                  styles.inputError,
              ]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="CN, SA"
              placeholderTextColor="#9CA3AF"
            />
          )}
        />
        {errors.itgCircuits?.[selectedItgIndex]?.cnPrefix && (
          <Text style={styles.errorText}>
            {errors.itgCircuits[selectedItgIndex]?.cnPrefix?.message}
          </Text>
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
              style={[
                styles.countInput,
                errors.itgCircuits?.[selectedItgIndex]?.circuitsCount &&
                  styles.inputError,
              ]}
              value={value}
              onChangeText={updateCircuitsCount}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor="#9CA3AF"
            />
          )}
        />
      </View>
      {errors.itgCircuits?.[selectedItgIndex]?.circuitsCount && (
        <Text style={styles.errorText}>
          {errors.itgCircuits[selectedItgIndex]?.circuitsCount?.message}
        </Text>
      )}
    </View>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────

const CircuitsConfigStep = forwardRef<
  CircuitsConfigStepRef,
  CircuitsConfigStepProps
>(function CircuitsConfigStep({ panel }, ref) {
  const {
    control,
    trigger,
    clearErrors,
    formState: { errors },
  } = useFormContext<PanelConfigurationFormValues>();

  // Watch only the count string (lightweight) instead of the entire itgCircuits array.
  // This prevents massive re-renders when any circuit field changes.
  const itgCount = useWatch({ control, name: 'itgCount' }) || '1';
  const itgCircuitsLength = Math.max(1, parseInt(itgCount, 10) || 1);

  const [selectedItgIndex, setSelectedItgIndex] = useState(0);

  // Watch only the specific fields we actually need for the list
  const currentCircuits =
    (useWatch({
      control,
      name: `itgCircuits.${selectedItgIndex}.circuits` as const,
    }) as unknown as CircuitConfig[]) || [];

  const cnPrefix =
    useWatch({
      control,
      name: `itgCircuits.${selectedItgIndex}.cnPrefix` as const,
    }) || '';

  const itgDescription = useWatch({
    control,
    name: `itgDescriptions.${selectedItgIndex}` as const,
  });

  // ── Validation & Navigation ──────────────────────────────────────────────

  const validateCurrentItg = useCallback(async (): Promise<boolean> => {
    const result = await trigger(`itgCircuits.${selectedItgIndex}` as any);

    if (!result) {
      const itgErrors = errors.itgCircuits?.[selectedItgIndex];
      const errorMessages: string[] = [];

      if (itgErrors?.cnPrefix) {
        errorMessages.push('• Prefijo es requerido');
      }
      if (itgErrors?.circuitsCount) {
        errorMessages.push('• Cantidad de circuitos debe ser mayor a 0');
      }
      if (itgErrors?.circuits) {
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
  }, [selectedItgIndex, trigger, errors]);

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

  // Track previous circuits length to detect new additions
  const prevCircuitsLengthRef = useRef(currentCircuits.length);
  const prevItgIndexRef = useRef(selectedItgIndex);

  useEffect(() => {
    if (prevItgIndexRef.current === selectedItgIndex) {
      if (currentCircuits.length > prevCircuitsLengthRef.current) {
        const newIndices = Array.from(
          { length: currentCircuits.length - prevCircuitsLengthRef.current },
          (_, i) => prevCircuitsLengthRef.current + i,
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
    prevCircuitsLengthRef.current = currentCircuits.length;
    prevItgIndexRef.current = selectedItgIndex;
  }, [currentCircuits.length, selectedItgIndex]);

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

  // Use a stable data array reference – only re-create when length actually changes
  const circuitsCount = currentCircuits.length;
  const stableData = useMemo(
    () => currentCircuits,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [circuitsCount, selectedItgIndex],
  );

  const getCircuitKey = useCallback(
    (_: CircuitConfig, idx: number) => `itg-${selectedItgIndex}-circuit-${idx}`,
    [selectedItgIndex],
  );

  // Memoize renderItem — pull `expandedIndices.includes` out of the closure
  // by using a Set for O(1) lookup.
  const expandedSet = useMemo(
    () => new Set(expandedIndices),
    [expandedIndices],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CircuitConfig; index: number }) => (
      <View style={paddingStyle}>
        <CircuitItem
          index={index}
          itgIndex={selectedItgIndex}
          isExpanded={expandedSet.has(index)}
          onToggleExpand={toggleExpand}
          cnPrefix={cnPrefix}
        />
      </View>
    ),
    [selectedItgIndex, expandedSet, toggleExpand, cnPrefix],
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
      />
    ),
    [panel, selectedItgIndex, itgCircuitsLength, itgDescription],
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
      <FlatList<CircuitConfig>
        data={stableData}
        keyExtractor={getCircuitKey}
        renderItem={renderItem}
        ListHeaderComponent={headerElement}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        // removeClippedSubviews can cause crashes on Android with complex items
        removeClippedSubviews={Platform.OS === 'ios'}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={dynamicContentPadding}
      />
    </View>
  );
});

// Static style objects extracted outside the component to prevent re-creation
const containerStyle = { flex: 1 } as const;
const paddingStyle = { paddingHorizontal: 24 } as const;

export default CircuitsConfigStep;
