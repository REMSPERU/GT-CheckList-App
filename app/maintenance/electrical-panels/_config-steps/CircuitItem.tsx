import React, { memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import RNPickerSelect from 'react-native-picker-select';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './_styles';
import { PhaseType, CableType } from '@/types/panel-configuration';
import { PanelConfigurationFormValues } from '@/schemas/panel-configuration';

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
  { key: 'mono_2w', label: 'Monofásico 2 hilos' },
  { key: 'tri_3w', label: 'Trifásico 3 hilos' },
  { key: 'tri_4w', label: 'Trifásico 4 hilos' },
];

const CABLE_TYPE_OPTIONS: { key: CableType; label: string }[] = [
  { key: 'libre_halogeno', label: 'Libre de Halógeno' },
  { key: 'no_libre_halogeno', label: 'No libre de Halógeno' },
];

interface CircuitItemProps {
  index: number;
  itgIndex: number;
  isExpanded: boolean;
  onToggleExpand: (index: number) => void;
  cnPrefix: string;
}

const CircuitItem = ({
  index,
  itgIndex,
  isExpanded,
  onToggleExpand,
  cnPrefix,
}: CircuitItemProps) => {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<PanelConfigurationFormValues>();

  // Use granular useWatch for this specific item's ID toggle
  const hasID = useWatch({
    control,
    name: `itgCircuits.${itgIndex}.circuits.${index}.hasID`,
  });

  // Check if this circuit has any validation errors
  const circuitErrors = errors.itgCircuits?.[itgIndex]?.circuits?.[index];
  const hasErrors = !!(
    circuitErrors?.amperajeITM ||
    circuitErrors?.diameter ||
    circuitErrors?.cableType
  );

  return (
    <View
      style={[
        styles.cnCard,
        hasErrors && { borderColor: '#EF4444', borderWidth: 1.5 },
      ]}>
      {/* Header clickeable para expandir/colapsar */}
      <TouchableOpacity
        style={styles.cnCardHeader}
        onPress={() => onToggleExpand(index)}
        activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.cnTitle}>
            {cnPrefix || 'CN'}-{index + 1}
          </Text>
          {hasErrors && (
            <View
              style={{
                backgroundColor: '#EF4444',
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}>
              <Text
                style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>
                Incompleto
              </Text>
            </View>
          )}
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={hasErrors ? '#EF4444' : '#6B7280'}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View>
          {/* ITM */}
          <Text style={styles.cnSectionTitle}>
            Interruptor termomagnetico (ITM)
          </Text>
          <Text style={styles.cnLabel}>FASES</Text>
          <Controller
            control={control}
            name={`itgCircuits.${itgIndex}.circuits.${index}.phaseITM`}
            render={({ field: { onChange, value } }) => (
              <RNPickerSelect
                onValueChange={onChange}
                items={PHASE_OPTIONS.map(opt => ({
                  label: opt.label,
                  value: opt.key,
                }))}
                placeholder={{
                  label: 'Seleccione tipo de fase',
                  value: null,
                  color: '#9CA3AF',
                }}
                value={value}
                style={{
                  ...pickerSelectStyles,
                  iconContainer: {
                    top: 12,
                    right: 12,
                  },
                }}
                useNativeAndroidPickerStyle={false}
                Icon={() => (
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                )}
              />
            )}
          />

          <Text style={styles.cnLabel}>AMPERAJE:</Text>
          <View style={styles.inputWithUnitWrapper}>
            <Controller
              control={control}
              name={`itgCircuits.${itgIndex}.circuits.${index}.amperajeITM`}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.itgInputWithUnit,
                    errors.itgCircuits?.[itgIndex]?.circuits?.[index]
                      ?.amperajeITM && styles.inputError,
                  ]}
                  value={value}
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
          {errors.itgCircuits?.[itgIndex]?.circuits?.[index]?.amperajeITM && (
            <Text style={styles.errorText}>
              {
                errors.itgCircuits[itgIndex]?.circuits?.[index]?.amperajeITM
                  ?.message
              }
            </Text>
          )}

          {/* Diámetro */}
          <Text style={styles.cnLabel}>DIÁMETRO:</Text>
          <View
            style={[
              styles.inputWithUnitWrapper,
              errors.itgCircuits?.[itgIndex]?.circuits?.[index]?.diameter && {
                borderColor: '#EF4444',
                borderWidth: 1.5,
              },
            ]}>
            <Controller
              control={control}
              name={`itgCircuits.${itgIndex}.circuits.${index}.diameter`}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.itgInputWithUnit}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Ingrese diámetro"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              )}
            />
            <Text style={styles.unitText}>mm²</Text>
          </View>
          {errors.itgCircuits?.[itgIndex]?.circuits?.[index]?.diameter && (
            <Text style={styles.errorText}>
              {
                errors.itgCircuits[itgIndex]?.circuits?.[index]?.diameter
                  ?.message
              }
            </Text>
          )}

          {/* Tipo de Cable */}
          <Text style={styles.cnLabel}>TIPO DE CABLE:</Text>
          <Controller
            control={control}
            name={`itgCircuits.${itgIndex}.circuits.${index}.cableType`}
            render={({ field: { onChange, value } }) => (
              <RNPickerSelect
                onValueChange={onChange}
                items={CABLE_TYPE_OPTIONS.map(opt => ({
                  label: opt.label,
                  value: opt.key,
                }))}
                placeholder={{
                  label: 'Seleccione una opción',
                  value: null,
                  color: '#9CA3AF',
                }}
                value={value}
                style={{
                  ...(errors.itgCircuits?.[itgIndex]?.circuits?.[index]
                    ?.cableType
                    ? pickerErrorStyles
                    : pickerSelectStyles),
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
                    color={
                      errors.itgCircuits?.[itgIndex]?.circuits?.[index]
                        ?.cableType
                        ? '#EF4444'
                        : '#6B7280'
                    }
                  />
                )}
              />
            )}
          />
          {errors.itgCircuits?.[itgIndex]?.circuits?.[index]?.cableType && (
            <Text style={styles.errorText}>Seleccione tipo de cable</Text>
          )}

          {/* ID - Optional Section */}
          <View style={{ marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.toggleRow, hasID && styles.toggleRowActive]}
              onPress={() => {
                const newValue = !hasID;
                setValue(
                  `itgCircuits.${itgIndex}.circuits.${index}.hasID`,
                  newValue,
                );
                if (!newValue) {
                  setValue(
                    `itgCircuits.${itgIndex}.circuits.${index}.phaseID`,
                    undefined,
                  );
                  setValue(
                    `itgCircuits.${itgIndex}.circuits.${index}.amperajeID`,
                    undefined,
                  );
                  setValue(
                    `itgCircuits.${itgIndex}.circuits.${index}.diameterID`,
                    undefined,
                  );
                  setValue(
                    `itgCircuits.${itgIndex}.circuits.${index}.cableTypeID`,
                    undefined,
                  );
                } else {
                  setValue(
                    `itgCircuits.${itgIndex}.circuits.${index}.phaseID`,
                    'mono_2w',
                  );
                  setValue(
                    `itgCircuits.${itgIndex}.circuits.${index}.amperajeID`,
                    '',
                  );
                }
              }}>
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
            </TouchableOpacity>

            {hasID && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.cnLabel}>FASES</Text>
                <Controller
                  control={control}
                  name={`itgCircuits.${itgIndex}.circuits.${index}.phaseID`}
                  render={({ field: { onChange, value } }) => (
                    <RNPickerSelect
                      onValueChange={onChange}
                      items={PHASE_OPTIONS.map(opt => ({
                        label: opt.label,
                        value: opt.key,
                      }))}
                      placeholder={{
                        label: 'Seleccione tipo de fase',
                        value: null,
                        color: '#9CA3AF',
                      }}
                      value={value}
                      style={{
                        ...pickerSelectStyles,
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
                          color="#6B7280"
                        />
                      )}
                    />
                  )}
                />
                <Text style={styles.cnLabel}>AMPERAJE:</Text>
                <View style={styles.inputWithUnitWrapper}>
                  <Controller
                    control={control}
                    name={`itgCircuits.${itgIndex}.circuits.${index}.amperajeID`}
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

                {/* Diámetro ID */}
                <Text style={styles.cnLabel}>DIÁMETRO:</Text>
                <View style={styles.inputWithUnitWrapper}>
                  <Controller
                    control={control}
                    name={`itgCircuits.${itgIndex}.circuits.${index}.diameterID`}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={styles.itgInputWithUnit}
                        value={value || ''}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Ingrese diámetro"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                      />
                    )}
                  />
                  <Text style={styles.unitText}>mm²</Text>
                </View>

                {/* Tipo de Cable ID */}
                <Text style={styles.cnLabel}>TIPO DE CABLE:</Text>
                <Controller
                  control={control}
                  name={`itgCircuits.${itgIndex}.circuits.${index}.cableTypeID`}
                  render={({ field: { onChange, value } }) => (
                    <RNPickerSelect
                      onValueChange={onChange}
                      items={CABLE_TYPE_OPTIONS.map(opt => ({
                        label: opt.label,
                        value: opt.key,
                      }))}
                      placeholder={{
                        label: 'Seleccione una opción',
                        value: null,
                        color: '#9CA3AF',
                      }}
                      value={value}
                      style={{
                        ...pickerSelectStyles,
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
                          color="#6B7280"
                        />
                      )}
                    />
                  )}
                />
              </View>
            )}
          </View>

          {/* Suministro */}
          <Text style={[styles.cnLabel, { marginTop: 12 }]}>
            ¿Qué suministra eléctricamente el Circuito {cnPrefix || 'CN'}-
            {index + 1}?
          </Text>
          <Controller
            control={control}
            name={`itgCircuits.${itgIndex}.circuits.${index}.supply`}
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
  );
};

// Memoize the component to prevent re-renders when parent changes but props are same
export default memo(CircuitItem);
