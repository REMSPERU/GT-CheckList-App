import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { Ionicons } from '@expo/vector-icons';
import { CableType } from '@/types/panel-configuration';

const CABLE_TYPE_OPTIONS: { value: CableType; label: string }[] = [
  { value: 'libre_halogeno', label: 'Libre de Halógeno' },
  { value: 'no_libre_halogeno', label: 'No libre de Halógeno' },
];

interface CableTypePickerProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  showIncomplete?: boolean;
  errorMessage?: string;
  placeholder?: string;
}

export const CableTypePicker: React.FC<CableTypePickerProps> = ({
  label,
  value,
  onChange,
  showIncomplete,
  errorMessage,
  placeholder,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <RNPickerSelect
        onValueChange={onChange}
        items={CABLE_TYPE_OPTIONS}
        placeholder={{
          label: placeholder || 'Seleccione tipo de cable',
          value: null,
          color: '#9CA3AF',
        }}
        value={value}
        style={{
          inputIOS: [
            pickerStyles.inputIOS,
            showIncomplete && pickerStyles.inputIncomplete,
          ],
          inputAndroid: [
            pickerStyles.inputAndroid,
            showIncomplete && pickerStyles.inputIncomplete,
          ],
          placeholder: pickerStyles.placeholder,
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
            color={showIncomplete ? '#F59E0B' : '#6B7280'}
          />
        )}
      />
      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
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
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});

const pickerStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    color: '#11181C',
    backgroundColor: '#F9FAFB',
    paddingRight: 30,
    height: 44,
  },
  inputAndroid: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    color: '#11181C',
    backgroundColor: '#F9FAFB',
    paddingRight: 30,
    height: 44,
  },
  placeholder: {
    color: '#9CA3AF',
  },
  inputIncomplete: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
});
