import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DatabaseService } from '@/services/database';

interface ChecklistTypeProgress {
  id: string;
  name: string;
  total: number;
  completed: number;
}

export function ChecklistTodayCard({
  propertyId,
  lastSync,
  onOpen,
}: {
  propertyId: string;
  lastSync: number;
  onOpen: () => void;
}) {
  const [progress, setProgress] = useState<ChecklistTypeProgress[] | null>(
    null,
  );
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setProgress(null);
      setFailed(false);

      async function load() {
        const systems = await DatabaseService.getChecklistSystemsByProperty(
          propertyId,
          true,
        );
        const submittedAt = new Date().toISOString();
        const results = await Promise.all(
          systems
            .flatMap(system => system.equipamentos)
            .map(async type => {
              const day = await DatabaseService.validateLocalChecklistSchedule(
                propertyId,
                type.id,
                null,
                submittedAt,
                { calendarPreview: true },
              );
              if (
                !day.period_start ||
                !day.frequency ||
                !day.occurrences_per_day
              )
                return null;
              const target = day.occurrences_per_day;
              const counts = await DatabaseService.getChecklistCountsByEquipo(
                propertyId,
                type.id,
                day.frequency,
                day.period_start,
              );
              const completed = Math.min(
                type.equipos_count,
                counts.filter(
                  row => row.synced_count + row.pending_count >= target,
                ).length,
              );
              return {
                id: type.id,
                name: type.nombre,
                total: type.equipos_count,
                completed,
              };
            }),
        );
        if (active) setProgress(results.filter(item => item !== null));
      }

      void load().catch(() => {
        if (active) setFailed(true);
      });
      return () => {
        active = false;
      };
    }, [propertyId, lastSync]),
  );

  const total = progress?.reduce((count, row) => count + row.total, 0) ?? 0;
  const completed =
    progress?.reduce((count, row) => count + row.completed, 0) ?? 0;
  const percentage = total ? Math.round((completed * 100) / total) : 0;
  const upcoming =
    progress?.filter(row => row.completed < row.total).slice(0, 2) ?? [];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Checklists por revisar hoy</Text>
        <Pressable accessibilityRole="button" onPress={onOpen} hitSlop={8}>
          <Text style={styles.link}>Ver más</Text>
        </Pressable>
      </View>
      {failed ? (
        <Text style={styles.detail}>No se pudo cargar el avance.</Text>
      ) : progress === null ? (
        <Text style={styles.detail}>Cargando checklists…</Text>
      ) : total === 0 ? (
        <Text style={styles.detail}>Hoy no hay checklists programados.</Text>
      ) : (
        <>
          <Text style={styles.detail}>
            {completed} de {total} equipos completados · {percentage}%
          </Text>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Avance de checklists"
            accessibilityValue={{ min: 0, max: 100, now: percentage }}
            style={styles.track}>
            <View style={[styles.fill, { width: `${percentage}%` }]} />
          </View>
          {upcoming.map(row => (
            <Text key={row.id} style={styles.detail}>
              {row.name} · {row.total - row.completed} pendientes
            </Text>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    gap: 10,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { color: '#111827', fontSize: 16, fontWeight: '700' },
  link: { color: '#0E7490', fontWeight: '700' },
  detail: { color: '#475569', fontSize: 14 },
  track: {
    backgroundColor: '#E2E8F0',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: { backgroundColor: '#0891B2', height: '100%' },
});
