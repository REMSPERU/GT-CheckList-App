import { memo, type ReactElement } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { Controller, useWatch } from 'react-hook-form';
import type { Control, FieldValues, Path } from 'react-hook-form';
import type { TechnicalFieldConfig } from '@/types/inventory';
import { BrandSelector } from './brand-selector';

interface DynamicFieldRendererProps<T extends FieldValues> {
  fields: TechnicalFieldConfig[];
  /** Path prefix in the form: equipment_detail.marca */
  fieldPrefix: string;
  control: Control<T>;
  equipamentoId?: string | null;
  equipamentoAbreviatura?: string | null;
  equipamentoNombre?: string | null;
  /** Datos existentes en equipment_detail para detectar llaves no mapeadas en el esquema */
  existingData?: Record<string, unknown> | null;
}

/**
 * Renders dynamic form fields based on TechnicalFieldConfig.
 * Supports text, number, boolean (Switch), and select (Pressable list).
 */
export const DynamicFieldRenderer = memo(function DynamicFieldRenderer<
  T extends FieldValues,
>({
  fields,
  fieldPrefix,
  control,
  equipamentoId,
  equipamentoAbreviatura,
  equipamentoNombre,
  existingData,
}: DynamicFieldRendererProps<T>) {
  const detailValue = useWatch({
    control,
    name: fieldPrefix as Path<T>,
  }) as Record<string, unknown> | undefined;

  const currentData = detailValue ?? existingData ?? {};
  const schemaTopLevelKeys = new Set(
    (fields ?? []).map(f => f.key.split('.')[0]),
  );

  const extraKeys = Object.keys(currentData).filter(key => {
    if (schemaTopLevelKeys.has(key)) return false;
    const val = currentData[key];
    return val !== null && val !== undefined && val !== '';
  });

  return (
    <View style={styles.wrap}>
      {fields.map(field => {
        if (field.visibleWhen) {
          const currentValue = detailValue
            ? getValueByPath(detailValue, field.visibleWhen.key)
            : undefined;
          const hasSavedValue = detailValue
            ? getValueByPath(detailValue, field.key)
            : undefined;
          const isValueNotEmpty =
            hasSavedValue !== null &&
            hasSavedValue !== undefined &&
            hasSavedValue !== '';

          if (currentValue !== field.visibleWhen.equals && !isValueNotEmpty) {
            return null;
          }
        }

        // Si es un campo de control (ej. tiene_vdf) y algún campo controlado por él tiene datos en el formulario, ocultar este control
        const hasControlledFieldsWithData = fields.some(other => {
          if (other.visibleWhen?.key === field.key) {
            const otherVal = detailValue
              ? getValueByPath(detailValue, other.key)
              : undefined;
            return (
              otherVal !== null && otherVal !== undefined && otherVal !== ''
            );
          }
          return false;
        });

        if (hasControlledFieldsWithData) {
          return null;
        }

        const fieldPath = `${fieldPrefix}.${field.key}` as Path<T>;

        const isBrandField =
          field.key === 'marca' ||
          field.key === 'marca_vdf' ||
          field.key === 'marca_motor' ||
          field.key.endsWith('.marca');

        if (isBrandField) {
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
                  <BrandSelector
                    value={value != null ? String(value) : ''}
                    onChange={onChange}
                    equipamentoId={equipamentoId}
                    equipamentoAbreviatura={equipamentoAbreviatura}
                    equipamentoNombre={equipamentoNombre}
                    error={fieldState.error?.message}
                  />
                  {fieldState.error && (
                    <Text style={styles.error}>{fieldState.error.message}</Text>
                  )}
                </View>
              )}
            />
          );
        }

        if (field.type === 'collection') {
          return (
            <Controller
              key={field.key}
              control={control}
              name={fieldPath}
              render={({ field: { value, onChange } }) => {
                const items = Array.isArray(value) ? value : [];

                return (
                  <View style={styles.collectionWrap}>
                    <View style={styles.collectionHeader}>
                      <Text style={styles.collectionTitle}>{field.label}</Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.addItemButton,
                          pressed && styles.pressed,
                        ]}
                        onPress={() =>
                          onChange([...items, buildEmptyItem(field.fields)])
                        }>
                        <Text style={styles.addItemText}>Agregar</Text>
                      </Pressable>
                    </View>

                    {items.length === 0 ? (
                      <Text style={styles.emptyCollectionText}>
                        Sin registros agregados.
                      </Text>
                    ) : (
                      items.map((_, index) => (
                        <View
                          key={`${field.key}-${index}`}
                          style={styles.itemCard}>
                          <View style={styles.itemHeader}>
                            <Text style={styles.itemTitle}>
                              Registro #{index + 1}
                            </Text>
                            <Pressable
                              onPress={() =>
                                onChange(items.filter((__, i) => i !== index))
                              }
                              hitSlop={8}>
                              <Text style={styles.removeText}>Eliminar</Text>
                            </Pressable>
                          </View>
                          <DynamicFieldRenderer
                            fields={field.fields ?? []}
                            fieldPrefix={`${fieldPrefix}.${field.key}.${index}`}
                            control={control}
                            equipamentoId={equipamentoId}
                            equipamentoAbreviatura={equipamentoAbreviatura}
                            equipamentoNombre={equipamentoNombre}
                          />
                        </View>
                      ))
                    )}
                  </View>
                );
              }}
            />
          );
        }

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
                      value={parseBoolean(value)}
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
                  multiline={field.multiline}
                  numberOfLines={field.multiline ? 4 : 1}
                  textAlignVertical={field.multiline ? 'top' : 'center'}
                />
                {fieldState.error && (
                  <Text style={styles.error}>{fieldState.error.message}</Text>
                )}
              </View>
            )}
          />
        );
      })}

      {extraKeys.length > 0 ? (
        <View style={styles.extraSectionWrap}>
          <Text style={styles.extraSectionTitle}>Campos Adicionales</Text>
          {extraKeys.map(extraKey => {
            const extraPath = `${fieldPrefix}.${extraKey}` as Path<T>;
            const rawVal = currentData[extraKey];
            const isComplex = typeof rawVal === 'object' && rawVal !== null;

            return (
              <Controller
                key={extraKey}
                control={control}
                name={extraPath}
                render={({ field: { value, onChange, onBlur }, fieldState }) => (
                  <View style={styles.fieldWrap}>
                    <Text style={styles.label}>{formatDetailLabel(extraKey)}</Text>
                    {isComplex ? (
                      <TextInput
                        style={[styles.input, styles.inputMultiline]}
                        value={
                          typeof value === 'object' && value !== null
                            ? JSON.stringify(value, null, 2)
                            : String(value ?? '')
                        }
                        onChangeText={text => {
                          try {
                            onChange(JSON.parse(text));
                          } catch {
                            onChange(text);
                          }
                        }}
                        onBlur={onBlur}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        placeholder="Formato JSON"
                        placeholderTextColor="#94A3B8"
                      />
                    ) : (
                      <TextInput
                        style={[
                          styles.input,
                          fieldState.error && styles.inputError,
                        ]}
                        value={value != null ? String(value) : ''}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder={`Ingresa ${formatDetailLabel(extraKey).toLowerCase()}`}
                        placeholderTextColor="#94A3B8"
                      />
                    )}
                    {fieldState.error && (
                      <Text style={styles.error}>{fieldState.error.message}</Text>
                    )}
                  </View>
                )}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}) as <T extends FieldValues>(
  props: DynamicFieldRendererProps<T>,
) => ReactElement;

function formatDetailLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function buildEmptyItem(fields: TechnicalFieldConfig[] | undefined) {
  return (fields ?? []).reduce<Record<string, unknown>>((item, field) => {
    if (field.type === 'collection') return item;
    item[field.key] =
      field.defaultValue ?? (field.type === 'boolean' ? false : '');
    return item;
  }, {});
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const norm = value.trim().toLowerCase();
    if (norm === 'no' || norm === 'false' || norm === '0') return false;
    if (norm === 'sí' || norm === 'si' || norm === 'true' || norm === '1') return true;
  }
  return !!value;
}

function getValueByPath(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!isRecord(current)) return undefined;
    let val = current[key];
    if (val === undefined) {
      if (key === 'anio_operacion') {
        val = current['ano_operacion'];
      } else if (key === 'ano_operacion') {
        val = current['anio_operacion'];
      }
    }
    return val;
  }, data);
}

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
  pressed: { opacity: 0.75 },
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
  collectionWrap: {
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  collectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  addItemButton: {
    borderRadius: 8,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#67E8F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addItemText: {
    color: '#0891B2',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCollectionText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  itemCard: {
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  removeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  extraSectionWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  extraSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputMultiline: {
    minHeight: 80,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
});
