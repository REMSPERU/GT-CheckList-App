import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import MaintenanceHeader from '@/components/maintenance-header';
import { useMaintenanceSession } from '@/hooks/use-maintenance-session';
import { useElectricalPanelDetail } from '@/hooks/use-electrical-panel-detail';

export default function MaintenanceChecklistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    panelId: string;
    maintenanceId: string;
  }>();
  const { panelId, maintenanceId } = params;

  // Load Session
  const { session, saveSession } = useMaintenanceSession(
    panelId || '',
    maintenanceId,
  );

  // Load Equipment Data (for the checklist items)
  const { data: panel, isLoading: isPanelLoading } = useElectricalPanelDetail(
    panelId || '',
  );
  const detail = panel?.equipment_detail;

  // State for checklist is managed via session.checklist (Record<string, boolean>)
  // But for simple UI toggle, we can read directly from session.

  const toggleItem = (itemId: string) => {
    if (!session) return;

    const currentVal = session.checklist[itemId];
    // Logic: undefined -> true (OK) -> false (Issue) -> true...
    // Or maybe: undefined (unchecked) -> true (OK) -> false (Issue)
    // Let's go with: true = OK, false = Issue.

    const newVal = currentVal === undefined ? true : !currentVal;

    const updatedSession = {
      ...session,
      checklist: {
        ...session.checklist,
        [itemId]: newVal,
      },
      lastUpdated: new Date().toISOString(),
    };
    saveSession(updatedSession);
  };

  const handleContinue = () => {
    router.push({
      pathname: '/maintenance/execution/post-photos',
      params: { panelId, maintenanceId },
    });
  };

  if (isPanelLoading || !session) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  const itgs = detail?.itgs || [];
  const components = detail?.componentes || [];

  // Flatten items for display
  // We need unique IDs. Assuming properties have IDs or we generate one.
  // The 'itgs' items might not have stable IDs in the JSON.
  // Ideally they should. If not, we might use index (risky if list changes, but maintenance session is short lived).
  // Let's try to find a unique key or use index prefixed.

  return (
    <SafeAreaView style={styles.safeArea}>
      <MaintenanceHeader
        title="Checklist de Mantenimiento"
        iconName="checklist"
      />

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>ITGs (Interruptores)</Text>
        {itgs.map((item: any, index: number) => {
          const id = `itg_${index}`; // Fallback ID
          const status = session.checklist[id];

          return (
            <TouchableOpacity
              key={id}
              style={styles.checkItem}
              onPress={() => toggleItem(id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {item.brand} - {item.model}
                </Text>
                <Text style={styles.itemSubtitle}>{item.current}A</Text>
              </View>

              <Ionicons
                name={
                  status === true
                    ? 'checkmark-circle'
                    : status === false
                      ? 'alert-circle'
                      : 'ellipse-outline'
                }
                size={28}
                color={
                  status === true
                    ? '#10B981'
                    : status === false
                      ? '#EF4444'
                      : '#D1D5DB'
                }
              />
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          Componentes
        </Text>
        {components.map((item: any, index: number) => {
          const id = `comp_${index}`;
          const status = session.checklist[id];

          return (
            <TouchableOpacity
              key={id}
              style={styles.checkItem}
              onPress={() => toggleItem(id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemSubtitle}>
                  {item.brand || 'Sin marca'}
                </Text>
              </View>

              <Ionicons
                name={
                  status === true
                    ? 'checkmark-circle'
                    : status === false
                      ? 'alert-circle'
                      : 'ellipse-outline'
                }
                size={28}
                color={
                  status === true
                    ? '#10B981'
                    : status === false
                      ? '#EF4444'
                      : '#D1D5DB'
                }
              />
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueBtnText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, backgroundColor: '#F3F7FA', padding: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#11181C',
    marginBottom: 10,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemTitle: { fontSize: 16, fontWeight: '500', color: '#374151' },
  itemSubtitle: { fontSize: 14, color: '#6B7280' },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  continueBtn: {
    backgroundColor: '#06B6D4',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
