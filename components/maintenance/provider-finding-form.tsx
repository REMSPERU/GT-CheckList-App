import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function ProviderFindingForm({ responseId }: { responseId: string }) {
  const [note, setNote] = useState<string | null>(null);
  const finding = useQuery({
    queryKey: ['provider-finding', responseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_equipment_findings')
        .select('note,corroborating_response_id')
        .eq('maintenance_response_id', responseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const report = useMutation({
    networkMode: 'always',
    mutationFn: async (text: string) => {
      const { error } = await supabase.rpc(
        'report_provider_equipment_finding',
        {
          p_response_id: responseId,
          p_note: text,
        },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void finding.refetch();
    },
  });
  const text = note ?? finding.data?.note ?? '';
  const reviewed = Boolean(finding.data?.corroborating_response_id);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Reportar equipo inoperativo</Text>
      {reviewed ? (
        <>
          <Text>{finding.data?.note}</Text>
          <Text>El Técnico ya revisó este hallazgo.</Text>
        </>
      ) : (
        <>
          <TextInput
            accessibilityLabel="Motivo de inoperatividad"
            style={styles.input}
            value={text}
            onChangeText={value => {
              setNote(value);
              report.reset();
            }}
            editable={!report.isPending}
            placeholder="Describe qué impide operar el equipo"
            multiline
            maxLength={500}
          />
          <Button
            title={report.isPending ? 'Enviando…' : 'Enviar al Técnico'}
            disabled={!text.trim() || report.isPending || finding.isLoading}
            onPress={() => report.mutate(text.trim())}
          />
          {report.isSuccess ? (
            <Text accessibilityLiveRegion="polite">Hallazgo registrado.</Text>
          ) : null}
          {report.isError ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {report.error.message}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
    padding: 16,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  input: {
    borderColor: '#CBD5E1',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 76,
    padding: 10,
    textAlignVertical: 'top',
  },
  error: { color: '#B91C1C' },
});
