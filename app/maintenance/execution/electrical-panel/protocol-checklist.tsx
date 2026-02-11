import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

import MaintenanceHeader from '@/components/maintenance-header';
import { useMaintenanceSession } from '@/hooks/use-maintenance-session';
import { supabaseMaintenanceService } from '@/services/supabase-maintenance.service';

const PROTOCOL_ITEMS = [
  {
    key: 'tablero_sin_oxido',
    label: '1. Tablero sin óxido y pintura buen estado',
  },
  { key: 'puerta_mandil_aterrados', label: '2. Puerta y mandil aterrados' },
  { key: 'cables_libres_halogenos', label: '3. Cables libres de halógenos' },
  {
    key: 'identificacion_fases',
    label: '4. Identificación de fases (L1 - L2 - L3 - N)',
  },
  {
    key: 'interruptores_terminales',
    label: '5. Interruptores con terminales (No cable directo)',
  },
  { key: 'linea_tierra_correcta', label: '6. Línea de tierra correcta' },
  {
    key: 'diagrama_unifilar_actualizado',
    label: '7. Diagrama unifilar actualizado',
  },
  { key: 'luz_emergencia', label: '8. Luz de emergencia operativa' },
  { key: 'rotulado_circuitos', label: '9. Rotulado de circuitos' },
  {
    key: 'interruptores_riel_din',
    label: '10. Interruptores fijados en riel din',
  },
];

export default function ProtocolChecklistScreen() {
  const router = useRouter();
  const { panelId, maintenanceId } = useLocalSearchParams<{
    panelId: string;
    maintenanceId: string;
  }>();

  const { session, loading, saveSession } = useMaintenanceSession(
    panelId || '',
    maintenanceId,
  );

  const [protocol, setProtocol] = useState<Record<string, boolean>>(() => {
    // Default all to true
    const defaults: Record<string, boolean> = {};
    PROTOCOL_ITEMS.forEach(item => {
      defaults[item.key] = true;
    });
    return defaults;
  });

  const [isSaving, setIsSaving] = useState(false);

  // Initialize from session if already exists
  React.useEffect(() => {
    if (session?.protocol) {
      setProtocol(session.protocol);
    }
  }, [session?.protocol]);

  const toggleItem = (key: string) => {
    setProtocol(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleContinue = async () => {
    if (!session) return;

    setIsSaving(true);
    try {
      // 1. Save to Local Session (AsyncStorage)
      const updatedSession = {
        ...session,
        protocol,
        lastUpdated: new Date().toISOString(),
      };
      await saveSession(updatedSession);

      // 2. Try to update Supabase if online
      const netState = await NetInfo.fetch();
      if (netState.isConnected && maintenanceId && maintenanceId !== 'null') {
        try {
          // This might fail if the record hasn't been created yet in summary.tsx
          // But we follow the user request to attempt update.
          await supabaseMaintenanceService.updateProtocol(
            maintenanceId,
            protocol,
          );
          console.log('Protocol updated in Supabase');
        } catch (e) {
          console.log(
            'Online update failed (likely record not created yet):',
            e,
          );
        }
      }

      // 3. Navigate to Summary
      router.push({
        pathname: '/maintenance/execution/electrical-panel/summary' as any,
        params: { panelId, maintenanceId },
      });
    } catch (error) {
      console.error('Error in protocol checklist:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <MaintenanceHeader
        title="Protocolo de Tablero Eléctrico"
        iconName="fact-check"
        iconFamily="MaterialIcons"
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#0E7490"
          />
          <Text style={styles.infoText}>
            Verifique el estado de los siguientes puntos del protocolo del
            tablero.
          </Text>
        </View>

        <View style={styles.checklistCard}>
          {PROTOCOL_ITEMS.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.itemRow,
                index === PROTOCOL_ITEMS.length - 1 && styles.lastItem,
              ]}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <View style={styles.switchContainer}>
                <Text
                  style={[
                    styles.statusLabel,
                    protocol[item.key] ? styles.okLabel : styles.noOkLabel,
                  ]}>
                  {protocol[item.key] ? 'OK' : 'NO OK'}
                </Text>
                <Switch
                  value={protocol[item.key]}
                  onValueChange={() => toggleItem(item.key)}
                  trackColor={{ false: '#D1D5DB', true: '#A5F3FC' }}
                  thumbColor={protocol[item.key] ? '#06B6D4' : '#9CA3AF'}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, isSaving && styles.disabledBtn]}
          onPress={handleContinue}
          disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.continueBtnText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, backgroundColor: '#F3F7FA', padding: 16 },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E0F2FE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#0E7490',
    flex: 1,
  },
  checklistCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastItem: { borderBottomWidth: 0 },
  itemLabel: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
    paddingRight: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 45,
    textAlign: 'right',
  },
  okLabel: { color: '#06B6D4' },
  noOkLabel: { color: '#EF4444' },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  continueBtn: {
    backgroundColor: '#06B6D4',
    borderRadius: 10,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledBtn: {
    backgroundColor: '#A5F3FC',
  },
});
