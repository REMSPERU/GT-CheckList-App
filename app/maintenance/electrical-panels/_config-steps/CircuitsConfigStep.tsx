import { View, Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useFormContext,
  Controller,
  useWatch,
  useFieldArray,
} from 'react-hook-form';
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
    formState: { errors },
  } = useFormContext<PanelConfigurationFormValues>();

  // Watch only necessary top-level fields
  const itgCircuitsLength =
    useWatch({
      control,
      name: 'itgCircuits',
    })?.length || 0;

  const [selectedItgIndex, setSelectedItgIndex] = useState(0);

  // Use useFieldArray to manage the dynamic list of circuits efficiently
  const { fields, append, remove } = useFieldArray({
    control,
    name: `itgCircuits.${selectedItgIndex}.circuits`,
  });

  // Watch only necessary fields for the *current* ITG
  const cnPrefix = useWatch({
    control,
    name: `itgCircuits.${selectedItgIndex}.cnPrefix` as any,
  });

  const circuitsCount = useWatch({
    control,
    name: `itgCircuits.${selectedItgIndex}.circuitsCount` as any,
  });

  const itgDescription = useWatch({
    control,
    name: `itgDescriptions.${selectedItgIndex}` as any,
  });

  // Helper to generate tab labels
  const getTabLabels = () => {
    return Array.from(
      { length: itgCircuitsLength },
      (_, i) => `IT - G${i + 1} `,
    );
  };

  // Navigation handlers - parent will call these instead of goNext/goBack
  const handleNext = useCallback(() => {
    if (selectedItgIndex < itgCircuitsLength - 1) {
      // Go to next IT-G tab
      setSelectedItgIndex(prev => prev + 1);
      return false; // Don't proceed to next step
    } else {
      // Last IT-G, OK to go to next step
      return true;
    }
  }, [selectedItgIndex, itgCircuitsLength]);

  const handleBack = useCallback(() => {
    if (selectedItgIndex > 0) {
      // Go to previous IT-G tab
      setSelectedItgIndex(prev => prev - 1);
      return false; // Don't go to previous step
    } else {
      // First IT-G, OK to go to previous step
      return true;
    }
  }, [selectedItgIndex]);

  // Expose handlers to parent via ref
  useEffect(() => {
    if (navigationHandlers) {
      navigationHandlers.current = {
        handleNext: () => handleNext(),
        handleBack: () => handleBack(),
      };
    }
  }, [navigationHandlers, handleNext, handleBack]);

  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);

  // Automatically expand newly added items (but not all on initial load)
  const prevFieldsLengthRef = useRef(fields.length);

  useEffect(() => {
    if (fields.length > prevFieldsLengthRef.current) {
      // Items were added - expand them
      const newIndices = Array.from(
        { length: fields.length - prevFieldsLengthRef.current },
        (_, i) => prevFieldsLengthRef.current + i,
      );
      setExpandedIndices(prev => [...prev, ...newIndices]);
    }
    prevFieldsLengthRef.current = fields.length;
  }, [fields.length]);

  // Reset expanded indices when changing IT-G
  useEffect(() => {
    setExpandedIndices([]);
    prevFieldsLengthRef.current = fields.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItgIndex]);

  // Toggle handler using useCallback to keep prop stable for React.memo
  const toggleExpand = useCallback((index: number) => {
    setExpandedIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index],
    );
  }, []);

  const updateCircuitsCount = (value: string) => {
    const n = Math.max(0, parseInt(value || '0', 10));
    const currentLength = fields.length;

    if (n > currentLength) {
      // Append needed items
      const itemsToAdd = Array(n - currentLength).fill({ ...DEFAULT_CIRCUIT });
      append(itemsToAdd);
    } else if (n < currentLength) {
      // Remove excess items from the end
      const indicesToRemove = Array.from(
        { length: currentLength - n },
        (_, i) => currentLength - 1 - i,
      );
      remove(indicesToRemove);
    }

    setValue(`itgCircuits.${selectedItgIndex}.circuitsCount`, value);
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
          name={`itgCircuits.${selectedItgIndex}.cnPrefix` as any}
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
          name={`itgCircuits.${selectedItgIndex}.circuitsCount` as any}
          render={({ field: { value } }) => (
            <TextInput
              style={[
                styles.countInput,
                errors.itgCircuits?.[selectedItgIndex]?.circuitsCount &&
                  styles.inputError,
              ]}
              value={circuitsCount}
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
        {fields.map((field, idx) => (
          <CircuitItem
            key={field.id} // Important: use field.id from useFieldArray
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
