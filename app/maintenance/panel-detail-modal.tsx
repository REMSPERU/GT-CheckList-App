import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TableroElectricoResponse } from '@/types/api';

export default function PanelDetailModal() {
  const router = useRouter();
  const params = useLocalSearchParams();

  let panel: TableroElectricoResponse | null = null;
  let detail: any = null;

  try {
    if (params.panel) {
      panel = JSON.parse(params.panel as string);
      detail = panel?.equipment_detail || {};
    }
  } catch (e) {
    console.error("Error parsing panel data", e);
  }

  if (!panel || !detail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle del Tablero</Text>
        </View>
        <View style={styles.centerContent}>
          <Text>No se encontró información del detalle.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const {
    rotulo,
    tipo_tablero,
    detalle_tecnico,
    itgs = [],
    componentes = [],
    condiciones_especiales = {}
  } = detail;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del Tablero</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Header Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Rótulo:</Text>
          <Text style={styles.valueLarge}>{rotulo || panel.rotulo || 'N/A'}</Text>

          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.label}>Tipo de Tablero:</Text>
              <Text style={styles.value}>{tipo_tablero || panel.tipo || 'N/A'}</Text>
            </View>
            <View style={styles.halfCol}>
              <Text style={styles.label}>Código:</Text>
              <Text style={styles.value}>{panel.codigo || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Technical Detail */}
        {detalle_tecnico && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalle Técnico</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.label}>Fases:</Text>
                <Text style={styles.value}>{detalle_tecnico.fases || 'N/A'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.label}>Voltaje:</Text>
                <Text style={styles.value}>{detalle_tecnico.voltaje ? `${detalle_tecnico.voltaje} V` : 'N/A'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.label}>Montaje:</Text>
                <Text style={styles.value}>{detalle_tecnico.tipo_tablero || 'N/A'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ITGs */}
        {itgs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interruptores Generales (IT-G)</Text>
            {itgs.map((itg: any, idx: number) => (
              <View key={idx} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{itg.id || `ITG-${idx + 1}`}</Text>
                  <Text style={styles.cardSubtitle}>{itg.suministra || ''}</Text>
                </View>
                <Text style={styles.textSmall}>Prefijo: {itg.prefijo}</Text>

                {/* ITMs List */}
                {itg.itms && itg.itms.length > 0 && (
                  <View style={styles.subList}>
                    {itg.itms.map((itm: any, cIdx: number) => (
                      <View key={cIdx} style={styles.subItem}>
                        <View style={styles.subItemHeader}>
                          <Text style={styles.subItemTitle}>{itm.id || `Cto ${cIdx + 1}`}</Text>
                          <Text style={styles.subItemValue}>{itm.amperaje}A</Text>
                        </View>
                        <Text style={styles.textSmall}>Fases: {itm.fases}</Text>
                        <Text style={styles.textSmall}>Cable: {itm.tipo_cable} ({itm.diametro_cable})</Text>

                        {itm.diferencial?.existe && (
                          <View style={styles.differentialBadge}>
                            <Text style={styles.differentialText}>
                              Dif: {itm.diferencial.amperaje}A - {itm.diferencial.fases}
                            </Text>
                          </View>
                        )}
                        <Text style={[styles.textSmall, { marginTop: 4, fontStyle: 'italic' }]}>
                          Suministra: {itm.suministra}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Components */}
        {componentes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Componentes Adicionales</Text>
            {componentes.map((comp: any, idx: number) => (
              <View key={idx} style={styles.componentGroup}>
                <Text style={styles.componentType}>{comp.tipo}</Text>
                {comp.items.map((item: any, iIdx: number) => (
                  <View key={iIdx} style={styles.componentItem}>
                    <Text style={styles.componentCode}>{item.codigo}</Text>
                    <Text style={styles.componentSupply}>{item.suministra}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Special Conditions */}
        {Object.keys(condiciones_especiales).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Condiciones Especiales</Text>
            {Object.entries(condiciones_especiales as Record<string, any>).map(([key, value]) => (
              value && (
                <View key={key} style={styles.conditionRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <Text style={styles.conditionText}>{formatConditionKey(key)}</Text>
                </View>
              )
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// Helper to format keys like "barra_tierra" to "Barra Tierra"
function formatConditionKey(key: string) {
  return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: '#11181C',
    fontWeight: '500',
  },
  valueLarge: {
    fontSize: 18,
    color: '#11181C',
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  halfCol: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    width: '45%',
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11181C',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#4B5563',
  },
  textSmall: {
    fontSize: 12,
    color: '#6B7280',
  },
  subList: {
    marginTop: 8,
    gap: 8,
  },
  subItem: {
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  subItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  subItemValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0891B2',
  },
  differentialBadge: {
    marginTop: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  differentialText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  componentGroup: {
    marginBottom: 12,
  },
  componentType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  componentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  componentCode: {
    fontSize: 14,
    fontWeight: '500',
    color: '#11181C',
  },
  componentSupply: {
    fontSize: 14,
    color: '#6B7280',
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  conditionText: {
    fontSize: 14,
    color: '#374151',
  },
});
