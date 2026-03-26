import React from 'react';
import { View, Text, TextInput, StyleSheet, Switch } from 'react-native';

interface MeasurementInputProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  unit?: string;
  isValid?: boolean; // If undefined, no validation shown yet. If false, shows error.
  placeholder?: string;
  keyboardType?: 'numeric' | 'decimal-pad' | 'default';
  errorMessage?: string; // Inline error message to display
  showIncomplete?: boolean; // Show as incomplete field (orange highlight)
  editable?: boolean;
  statusValue?: boolean;
  onStatusChange?: (value: boolean) => void;
}

export const MeasurementInput = React.memo(function MeasurementInput({
  label,
  value,
  onChange,
  unit,
  placeholder,
  keyboardType = 'decimal-pad',
  errorMessage,
  showIncomplete,
  editable = true,
  statusValue,
  onStatusChange,
}: MeasurementInputProps) {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {onStatusChange && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              {statusValue ? 'OK' : 'Observado'}
            </Text>
            <Switch
              value={statusValue === true}
              onValueChange={onStatusChange}
              trackColor={{ false: '#E5E7EB', true: '#A5F3FC' }}
              thumbColor={statusValue ? '#06B6D4' : '#fff'}
            />
          </View>
        )}
      </View>
      <View
        style={[styles.inputWrapper, showIncomplete && styles.inputIncomplete]}>
        <TextInput
          style={[styles.input, !editable && styles.inputDisabled]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          keyboardType={keyboardType}
          placeholderTextColor="#9CA3AF"
          editable={editable}
        />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#11181C',
  },
  unit: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  inputIncomplete: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});
