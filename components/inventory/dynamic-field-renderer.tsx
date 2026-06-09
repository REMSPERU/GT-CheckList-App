import { memo, type ReactElement } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Controller } from 'react-hook-form';
import type { Control, FieldValues, Path } from 'react-hook-form';
import type { TechnicalFieldConfig } from '@/types/inventory';

interface DynamicFieldRendererProps<T extends FieldValues> {
  fields: TechnicalFieldConfig[];
  /** Path prefix in the form: equipment_detail.marca */
  fieldPrefix: string;
  control: Control<T>;
}

/**
 * Renders dynamic form fields based on TechnicalFieldConfig.
 * Supports text, number, boolean (Switch), and select (Pressable list).
 */
export const DynamicFieldRenderer = memo(function DynamicFieldRenderer<
  T extends FieldValues,
>({ fields, fieldPrefix, control }: DynamicFieldRendererProps<T>) {
  return (
    <View style={styles.wrap}>
      {fields.map(field => {
        const fieldPath = `${fieldPrefix}.${field.key}` as Path<T>;

        if (field.type === 'boolean') {
          return (
            <Controller
              key={field.key}
              control={control}
              name={fieldPath}
              render={({ field: { value, onChange } }) => (
                <View style={styles.fieldWrap}>
                  <View style={styles.switchRow}>
                    <Text style={styles.label}>
                      {field.label}
                      {field.required && (
                        <Text style={styles.required}> *</Text>
                      )}
                    </Text>
                    <Switch
                      value={!!value}
                      onValueChange={onChange}
                      trackColor={{ false: '#E2E8F0', true: '#06B6D4' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              )}
            />
          );
        }

        if (field.type === 'select' && field.options) {
          return (
            <Controller
              key={field.key}
              control={control}
              name={fieldPath}
              render={({ field: { value, onChange }, fieldState }) => (
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>
                    {field.label}
                    {field.required && <Text style={styles.required}> *</Text>}
                  </Text>
                  <View style={styles.optionsWrap}>
                    {field.options!.map(opt => (
                      <Pressable
                        key={opt.value}
                        style={[
                          styles.optionChip,
                          value === opt.value && styles.optionChipSelected,
                        ]}
                        onPress={() => onChange(opt.value)}>
                        <Text
                          style={[
                            styles.optionChipText,
                            value === opt.value &&
                              styles.optionChipTextSelected,
                          ]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {fieldState.error && (
                    <Text style={styles.error}>{fieldState.error.message}</Text>
                  )}
                </View>
              )}
            />
          );
        }

        // text / number
        return (
          <Controller
            key={field.key}
            control={control}
            name={fieldPath}
            render={({ field: { value, onChange, onBlur }, fieldState }) => (
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>
                  {field.label}
                  {field.required && <Text style={styles.required}> *</Text>}
                  {field.suffix && (
                    <Text style={styles.suffix}> ({field.suffix})</Text>
                  )}
                </Text>
                <TextInput
                  style={[styles.input, fieldState.error && styles.inputError]}
                  value={value != null ? String(value) : ''}
                  onChangeText={text => {
                    if (field.type === 'number') {
                      const num = parseFloat(text);
                      onChange(isNaN(num) ? text : num);
                    } else {
                      onChange(text);
                    }
                  }}
                  onBlur={onBlur}
                  keyboardType={
                    field.type === 'number' ? 'decimal-pad' : 'default'
                  }
                  placeholder={`Ingresa ${field.label.toLowerCase()}`}
                  placeholderTextColor="#94A3B8"
                />
                {fieldState.error && (
                  <Text style={styles.error}>{fieldState.error.message}</Text>
                )}
              </View>
            )}
          />
        );
      })}
    </View>
  );
}) as <T extends FieldValues>(
  props: DynamicFieldRendererProps<T>,
) => ReactElement;

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  required: {
    color: '#EF4444',
  },
  suffix: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  error: {
    fontSize: 12,
    color: '#EF4444',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  optionChipSelected: {
    borderColor: '#06B6D4',
    backgroundColor: '#ECFEFF',
  },
  optionChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  optionChipTextSelected: {
    color: '#0891B2',
    fontWeight: '700',
  },
});
