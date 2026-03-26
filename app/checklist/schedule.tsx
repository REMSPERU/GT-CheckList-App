import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

import { useUserRole } from '@/hooks/use-user-role';
import {
  supabaseChecklistScheduleService,
  type ChecklistScheduleFrequency,
} from '@/services/supabase-checklist-schedule.service';
import { supabase } from '@/lib/supabase';

const FREQUENCY_OPTIONS: {
  label: string;
  value: ChecklistScheduleFrequency;
}[] = [
  { label: 'Diaria', value: 'DIARIA' },
  { label: 'Interdiaria', value: 'INTERDIARIA' },
  { label: 'Semanal', value: 'SEMANAL' },
  { label: 'Mensual', value: 'MENSUAL' },
];

function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

function isValidDate(value: string) {
  if (!value) {
    return true;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default function ChecklistScheduleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    equipoId: string;
    equipoCodigo: string;
    equipamentoNombre: string;
  }>();
  const { canScheduleMaintenance } = useUserRole();

  const [frequency, setFrequency] =
    useState<ChecklistScheduleFrequency>('DIARIA');
  const [occurrencesPerDay, setOccurrencesPerDay] = useState('1');
  const [windowStart, setWindowStart] = useState('08:00');
  const [windowEnd, setWindowEnd] = useState('18:00');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const title = useMemo(
    () => params.equipoCodigo || 'Programar checklist',
    [params.equipoCodigo],
  );

  const loadSchedule = useCallback(async () => {
    if (!params.equipoId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const schedule =
        await supabaseChecklistScheduleService.getScheduleByEquipoId(
          params.equipoId,
        );

      if (schedule) {
        setFrequency(schedule.frequency);
        setOccurrencesPerDay(String(schedule.occurrences_per_day));
        setWindowStart(schedule.window_start.slice(0, 5));
        setWindowEnd(schedule.window_end.slice(0, 5));
        setStartDate(schedule.start_date || '');
        setEndDate(schedule.end_date || '');
        setIsActive(schedule.is_active);
      }
    } catch (error) {
      console.error('Error loading checklist schedule:', error);
      Alert.alert('Error', 'No se pudo cargar la programación actual.');
    } finally {
      setIsLoading(false);
    }
  }, [params.equipoId]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    if (!canScheduleMaintenance) {
      Alert.alert(
        'Sin permisos',
        'Solo SUPERVISOR o SUPERADMIN pueden programar checklists.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    }
  }, [canScheduleMaintenance, router]);

  const handleSave = useCallback(async () => {
    if (!params.equipoId) {
      Alert.alert('Error', 'No se encontró el equipo.');
      return;
    }

    const parsedOccurrences = Number(occurrencesPerDay);
    if (
      !Number.isInteger(parsedOccurrences) ||
      parsedOccurrences < 1 ||
      parsedOccurrences > 24
    ) {
      Alert.alert(
        'Dato inválido',
        'La frecuencia diaria debe ser entre 1 y 24.',
      );
      return;
    }

    if (!isValidTime(windowStart) || !isValidTime(windowEnd)) {
      Alert.alert(
        'Dato inválido',
        'El rango horario debe tener formato HH:mm.',
      );
      return;
    }

    if (windowStart >= windowEnd) {
      Alert.alert(
        'Dato inválido',
        'La hora de inicio debe ser menor que la hora final.',
      );
      return;
    }

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      Alert.alert(
        'Dato inválido',
        'Las fechas deben tener formato YYYY-MM-DD.',
      );
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      Alert.alert(
        'Dato inválido',
        'La fecha de inicio no puede ser mayor a la fecha fin.',
      );
      return;
    }

    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        Alert.alert('Error', 'No se pudo identificar el usuario actual.');
        return;
      }

      await supabaseChecklistScheduleService.upsertSchedule({
        equipoId: params.equipoId,
        frequency,
        occurrencesPerDay: parsedOccurrences,
        windowStart: `${windowStart}:00`,
        windowEnd: `${windowEnd}:00`,
        timezone: 'America/Lima',
        startDate: startDate || null,
        endDate: endDate || null,
        isActive,
        userId: user.id,
      });

      Alert.alert('Éxito', 'Programación de checklist guardada.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving checklist schedule:', error);
      Alert.alert('Error', 'No se pudo guardar la programación.');
    } finally {
      setIsSaving(false);
    }
  }, [
    endDate,
    frequency,
    isActive,
    occurrencesPerDay,
    params.equipoId,
    router,
    startDate,
    windowEnd,
    windowStart,
  ]);

  if (isLoading || !canScheduleMaintenance) {
    return (
      <SafeAreaView style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#0891B2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {params.equipamentoNombre || 'Checklist'}
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Frecuencia</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={frequency}
            onValueChange={value =>
              setFrequency(value as ChecklistScheduleFrequency)
            }>
            {FREQUENCY_OPTIONS.map(option => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Veces por día</Text>
        <TextInput
          value={occurrencesPerDay}
          onChangeText={setOccurrencesPerDay}
          keyboardType="number-pad"
          style={styles.input}
          placeholder="1"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>Rango horario (HH:mm)</Text>
        <View style={styles.timeRow}>
          <TextInput
            value={windowStart}
            onChangeText={setWindowStart}
            style={[styles.input, styles.timeInput]}
            placeholder="08:00"
            placeholderTextColor="#94A3B8"
          />
          <Text style={styles.timeSeparator}>a</Text>
          <TextInput
            value={windowEnd}
            onChangeText={setWindowEnd}
            style={[styles.input, styles.timeInput]}
            placeholder="18:00"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <Text style={styles.label}>Fecha inicio (opcional, YYYY-MM-DD)</Text>
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          style={styles.input}
          placeholder="2026-03-26"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>Fecha fin (opcional, YYYY-MM-DD)</Text>
        <TextInput
          value={endDate}
          onChangeText={setEndDate}
          style={styles.input}
          placeholder="2026-12-31"
          placeholderTextColor="#94A3B8"
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Programación activa</Text>
          <Switch value={isActive} onValueChange={setIsActive} />
        </View>

        <Pressable
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          accessibilityRole="button">
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Guardando...' : 'Guardar programación'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backText: {
    color: '#0369A1',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },
  formCard: {
    margin: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
  },
  timeSeparator: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  switchRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveButton: {
    marginTop: 18,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#0891B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#7DD3FC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
