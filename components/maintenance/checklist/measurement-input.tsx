import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MeasurementInputProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  unit?: string;
  isValid?: boolean; // If undefined, no validation shown yet. If false, shows error.
  placeholder?: string;
  keyboardType?: 'numeric' | 'decimal-pad';
}

export const MeasurementInput: React.FC<MeasurementInputProps> = ({
  label,
  value,
  onChange,
  unit,
  isValid,
  placeholder,
  keyboardType = 'decimal-pad',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          isValid === false && styles.inputError,
          isValid === true && styles.inputSuccess,
        ]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          keyboardType={keyboardType}
          placeholderTextColor="#9CA3AF"
        />
        {unit && <Text style={styles.unit}>{unit}</Text>}
        {isValid === true && (
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        )}
        {isValid === false && (
          <Ionicons name="alert-circle" size={20} color="#EF4444" />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 4,
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
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputSuccess: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
});
