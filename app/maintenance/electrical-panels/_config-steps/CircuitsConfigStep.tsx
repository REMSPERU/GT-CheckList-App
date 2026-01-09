import { View, Text, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFormContext, Controller, useWatch } from 'react-hook-form';
import {
  CircuitsConfigStepProps,
  CircuitConfig,
} from '@/types/panel-configuration';
import { PanelConfigurationFormValues } from '@/schemas/panel-configuration';
import { useState, useEffect, useRef, useCallback } from 'react';
import ProgressTabs from '@/components/progress-tabs';
import { styles } from './_styles';
import CircuitItem from './CircuitItem';

const DEFAULT_CIRCUIT: CircuitConfig = {
  phaseITM: 'mono_2w',
  amperajeITM: '',
  diameter: '',
  cableType: undefined,
  hasID: false,
  diameterID: '',
  cableTypeID: undefined,
  supply: '',
};

export default function CircuitsConfigStep({
  panel,
  navigationHandlers,
}: CircuitsConfigStepProps) {
  const {
    control,
    setValue,
    getValues,
    trigger,
    clearErrors,
    formState: { errors },
  } = useFormContext<PanelConfigurationFormValues>();

  // Watch the full itgCircuits array to get its length
  const itgCircuitsData =
    useWatch({
      control,
      name: 'itgCircuits',
    }) || [];

  const itgCircuitsLength = itgCircuitsData.length;

  const [selectedItgIndex, setSelectedItgIndex] = useState(0);

  // Watch circuits for the currently selected ITG
  const currentCircuits =
    useWatch({
      control,
      name: `itgCircuits.${selectedItgIndex}.circuits` as const,
    }) || [];

  // Watch other fields for the current ITG
  const cnPrefix = useWatch({
    control,
    name: `itgCircuits.${selectedItgIndex}.cnPrefix` as const,
  });

  const itgDescription = useWatch({
    control,
    name: `itgDescriptions.${selectedItgIndex}` as const,
  });

  // Helper to generate tab labels
  const getTabLabels = () => {
    return Array.from(
      { length: itgCircuitsLength },
      (_, i) => `IT - G${i + 1} `,
    );
  };

  // Validate current ITG before allowing tab change
  const validateCurrentItg = useCallback(async (): Promise<boolean> => {
    const result = await trigger(`itgCircuits.${selectedItgIndex}` as any);

    if (!result) {
      // Get specific errors for this ITG
      const itgErrors = errors.itgCircuits?.[selectedItgIndex];
      let errorMessages: string[] = [];

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

  // Navigation handlers with validation
  const handleNext = useCallback(async () => {
    // Validate current ITG before proceeding
    const isValid = await validateCurrentItg();

    if (!isValid) {
      return false; // Don't proceed - validation failed
    }

    if (selectedItgIndex < itgCircuitsLength - 1) {
      // Clear errors before switching to next ITG
      clearErrors('itgCircuits');
      // Go to next IT-G tab
      setSelectedItgIndex(prev => prev + 1);
      return false; // Don't proceed to next step
    } else {
      // Last IT-G, OK to go to next step
      return true;
    }
  }, [selectedItgIndex, itgCircuitsLength, validateCurrentItg, clearErrors]);

  const handleBack = useCallback(() => {
    if (selectedItgIndex > 0) {
      // Clear errors before switching to previous ITG
      clearErrors('itgCircuits');
      // Go to previous IT-G tab - no validation needed when going back
      setSelectedItgIndex(prev => prev - 1);
      return false; // Don't go back to previous step
    } else {
      // First IT-G, OK to go to previous step
      return true;
    }
  }, [selectedItgIndex, clearErrors]);

  // Expose handlers to parent via ref
  useEffect(() => {
    if (navigationHandlers) {
      navigationHandlers.current = {
        handleNext: handleNext,
        handleBack: handleBack,
      };
    }
  }, [navigationHandlers, handleNext, handleBack]);

  // State to track expanded indices per ITG
  const [expandedIndicesMap, setExpandedIndicesMap] = useState<
    Record<number, number[]>
  >({});

  // Get expanded indices for current ITG
  const expandedIndices = expandedIndicesMap[selectedItgIndex] || [];

  // Track previous circuits length to detect new additions
  const prevCircuitsLengthRef = useRef(currentCircuits.length);
  const prevItgIndexRef = useRef(selectedItgIndex);

  useEffect(() => {
    // Only expand new items if we're still on the same ITG
    if (prevItgIndexRef.current === selectedItgIndex) {
      if (currentCircuits.length > prevCircuitsLengthRef.current) {
        // Items were added - expand them
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

  // Toggle handler using useCallback to keep prop stable for React.memo
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

  // Update circuits count - uses setValue directly instead of useFieldArray
  const updateCircuitsCount = (value: string) => {
    const n = Math.max(0, parseInt(value || '0', 10));
    const currentCircuitsList =
      getValues(`itgCircuits.${selectedItgIndex}.circuits`) || [];
    const currentLength = currentCircuitsList.length;

    let newCircuits = [...currentCircuitsList];

    if (n > currentLength) {
      // Add new circuits
      for (let i = currentLength; i < n; i++) {
        newCircuits.push({
          ...DEFAULT_CIRCUIT,
          cableType: 'libre_halogeno' as const,
        });
      }
    } else if (n < currentLength) {
      // Remove excess circuits from the end
      newCircuits = newCircuits.slice(0, n);
    }

    // Update both the circuits array and the count
    setValue(`itgCircuits.${selectedItgIndex}.circuits`, newCircuits as any);
    setValue(`itgCircuits.${selectedItgIndex}.circuitsCount`, value);
  };

  // Generate stable keys for circuit items based on ITG index and circuit index
  const getCircuitKey = (circuitIndex: number) => {
    return `itg-${selectedItgIndex}-circuit-${circuitIndex}`;
  };

  return (
    <View style={styles.contentWrapper}>
      {/* Equipo */}
      <Text style={styles.equipmentLabel}>
        Equipo {panel?.name || panel?.codigo || ''}
      </Text>

      {/* Tabs for IT-G selection - Non-clickable, navigation via buttons */}
      {itgCircuitsLength > 1 && (
        <ProgressTabs
          items={getTabLabels()}
          selectedIndex={selectedItgIndex}
          onSelectIndex={() => {}} // Disabled
          disabled={true}
        />
      )}

      {/* IT-G description (title is already in tab) */}
      {itgDescription && (
        <Text style={styles.itgDescription}>{itgDescription}</Text>
      )}

      {/* Prefijo - key forces re-mount when ITG changes */}
      <View
        key={`prefix-container-${selectedItgIndex}`}
        style={{ marginBottom: 8 }}>
        <View style={styles.labelWithIconRow}>
          <Text style={styles.countLabel}>Ingrese el prefijo</Text>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#6B7280"
          />
        </View>
        <Controller
          key={`prefix-${selectedItgIndex}`}
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

      {/* ¿Cuántos circuitos tienes? - key forces re-mount when ITG changes */}
      <View
        key={`count-container-${selectedItgIndex}`}
        style={styles.rowBetween}>
        <Text style={styles.countLabel}>¿Cuántos circuitos tienes?</Text>
        <Controller
          key={`count-${selectedItgIndex}`}
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

      {/* Lista de circuitos */}
      <View style={{ marginTop: 12 }}>
        {currentCircuits.map((circuit, idx) => (
          <CircuitItem
            key={getCircuitKey(idx)}
            index={idx}
            itgIndex={selectedItgIndex}
            isExpanded={expandedIndices.includes(idx)}
            onToggleExpand={toggleExpand}
            cnPrefix={cnPrefix}
          />
        ))}
      </View>
    </View>
  );
}
