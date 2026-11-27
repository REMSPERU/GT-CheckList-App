import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getLocalExtraordinaryChecklists } from '@/services/db/extraordinary-checklists';

export function ExtraordinaryChecklistCards({
  propertyId,
}: {
  propertyId: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const { data = [], refetch } = useQuery({
    queryKey: ['extraordinary-checklists', user?.id],
    queryFn: () => (user?.id ? getLocalExtraordinaryChecklists(user.id) : []),
    enabled: Boolean(user?.id),
    networkMode: 'always',
    refetchInterval: 15000,
  });
  useFocusEffect(
    useCallback(() => {
      if (user?.id) void refetch();
    }, [refetch, user?.id]),
  );

  const todayParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts();
  const today = ['year', 'month', 'day']
    .map(part => todayParts.find(item => item.type === part)?.value)
    .join('-');
  const assignments = data.filter(
    item => item.buildingId === propertyId && item.end_date >= today,
  );
  if (assignments.length === 0) return null;

  return (
    <View style={styles.list}>
      <Text style={styles.heading}>Checklists extraordinarios</Text>
      {assignments.map(assignment => (
        <Pressable
          key={assignment.id}
          accessibilityRole="button"
          disabled={assignment.start_date > today}
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: '/checklist/form',
              params: {
                extraordinaryId: assignment.id,
                buildingId: assignment.buildingId,
                buildingName: assignment.buildingName,
                equipamentoId: assignment.equipamentoId,
                equipamentoNombre: assignment.equipamentoNombre,
                equipoId: assignment.asset_id,
                equipoCodigo: assignment.equipoCodigo,
                equipoUbicacion: assignment.equipoUbicacion,
                equipoDetalleUbicacion: assignment.equipoDetalleUbicacion,
                frecuencia: 'EXTRAORDINARIA',
              },
            })
          }>
          <Text style={styles.heading}>{assignment.equipoCodigo}</Text>
          <Text>{assignment.reason}</Text>
          <Text style={styles.dates}>
            {assignment.start_date.split('-').reverse().join('/')} al{' '}
            {assignment.end_date.split('-').reverse().join('/')}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8, marginTop: 16 },
  heading: { color: '#1F2937', fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, gap: 4 },
  dates: { color: '#4B5563', fontSize: 13 },
});
