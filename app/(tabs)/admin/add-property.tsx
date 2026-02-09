import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import React from 'react';
import DefaultHeader from '@/components/default-header';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AddPropertySchema, AddPropertyForm } from '@/schemas/property';
import { supabasePropertyService } from '@/services/supabase-property.service';
import type { PropertyCreateRequest } from '@/types/api';
import { useRouter } from 'expo-router';

// A simple reusable input component for the form
const FormInput = ({
  name,
  control,
  label,
  placeholder,
  error,
  ...textInputProps
}: any) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <TextInput
          style={[styles.input, error && styles.inputError]}
          onBlur={onBlur}
          onChangeText={onChange}
          value={value}
          placeholder={placeholder}
          {...textInputProps}
        />
      )}
    />
    {error && <Text style={styles.errorText}>{error.message}</Text>}
  </View>
);

export default function AddPropertyScreen() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(AddPropertySchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      address: '',
      city: '',
      country: '',
      property_type: '',
      maintenance_priority: '',
      is_active: true,
    },
  });

  const onSubmit: SubmitHandler<AddPropertyForm> = async data => {
    try {
      // Build payload matching PropertyCreateRequest (omit server-managed fields like created_at and is_active)
      const payload: PropertyCreateRequest = {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        address: data.address,
        city: data.city,
        country: data.country || 'PE',
        property_type: data.property_type || 'BUILDING',
        maintenance_priority: data.maintenance_priority || 'MEDIUM',
      };

      await supabasePropertyService.create(payload);

      Alert.alert('Éxito', 'El inmueble ha sido creado correctamente.', [
        {
          text: 'OK',
          onPress: () => {
            reset();
            router.push('/(tabs)/admin');
          },
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Ocurrió un error desconocido';
      Alert.alert('Error', `No se pudo crear el inmueble: ${errorMessage}`);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <DefaultHeader title="Añadir Inmueble" />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <FormInput
            name="name"
            label="Nombre del Inmueble"
            control={control}
            placeholder="Ej: Edificio Central"
            error={errors.name}
          />
          <FormInput
            name="code"
            label="Código"
            control={control}
            placeholder="Ej: ED-CENT"
            error={errors.code}
          />
          <FormInput
            name="address"
            label="Dirección"
            control={control}
            placeholder="Ej: Av. Principal 123"
            error={errors.address}
          />
          <FormInput
            name="city"
            label="Ciudad"
            control={control}
            placeholder="Ej: Ciudad Capital"
            error={errors.city}
          />
          <FormInput
            name="country"
            label="País"
            control={control}
            placeholder="Ej: Mi País"
            error={errors.country}
          />
          {/* TODO: Convert to a Picker component */}
          <FormInput
            name="property_type"
            label="Tipo de Inmueble"
            control={control}
            placeholder="Ej: Comercial, Residencial"
            error={errors.property_type}
          />
          {/* TODO: Convert to a Picker component */}
          <FormInput
            name="maintenance_priority"
            label="Prioridad de Mantenimiento"
            control={control}
            placeholder="Ej: Alta, Media, Baja"
            error={errors.maintenance_priority}
          />
          <FormInput
            name="description"
            label="Descripción (Opcional)"
            control={control}
            placeholder="Detalles adicionales del inmueble"
            error={errors.description}
            multiline
          />

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}>
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Guardando...' : 'Guardar Inmueble'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#0891B2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});