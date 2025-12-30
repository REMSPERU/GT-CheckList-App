import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export interface PanelDetailProps {
  data: {
    rotulo: string;
    tipo_tablero: string;
    detalle_tecnico: {
      fases: string;
      voltaje: number | string;
      tipo_tablero: string;
    };
    itgs: {
      id: string;
      prefijo?: string;
      suministra?: string;
      itms: {
        id: string;
        fases: string;
        amperaje: number | string;
        suministra: string;
        tipo_cable: string;
        diametro_cable: string;
        diferencial?: {
          fases: string;
          existe: boolean;
          amperaje: number | string;
          tipo_cable?: string;
          diametro_cable?: string;
        };
      }[];
    }[];
    componentes: {
      tipo: string;
      items: {
        codigo: string;
        suministra: string;
      }[];
    }[];
    condiciones_especiales: Record<string, boolean>;
  };
}

export const PanelDetailContent: React.FC<PanelDetailProps> = ({ data }) => {
  if (!data) return null;
  const {
    rotulo,
    detalle_tecnico,
    itgs = [],
    componentes = [],
    condiciones_especiales = {},
  } = data;

  // Safe defaults
  const safeDetalleTecnico = detalle_tecnico || {
    fases: '',
    voltaje: '-',
    tipo_tablero: '',
  };

  const formatConditionKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ');
  };

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <MaterialCommunityIcons
            name="lightning-bolt-outline"
            size={24}
            color="#06B6D4"
          />
          <Text style={styles.rotuloLabel}>
            RÓTULO: <Text style={styles.rotuloValue}>{rotulo}</Text>
          </Text>
        </View>

        <View style={styles.techGrid}>
          <View style={styles.techItem}>
            <Text style={styles.techLabel}>Montaje</Text>
            <Text style={styles.techValue}>
              {safeDetalleTecnico.tipo_tablero}
            </Text>
          </View>
          <View style={styles.techItem}>
            <Text style={styles.techLabel}>Voltaje</Text>
            <Text style={styles.techValue}>{safeDetalleTecnico.voltaje} V</Text>
          </View>
          <View style={styles.techItem}>
            <Text style={styles.techLabel}>Fases</Text>
            <Text style={styles.techValue}>{safeDetalleTecnico.fases}</Text>
          </View>
        </View>
      </View>

      {/* ITGs Section */}
      {itgs.map((itg, idx) => (
        <View key={idx} style={styles.sectionContainer}>
          <View style={styles.itgHeader}>
            <View style={styles.itgTitleRow}>
              <View style={styles.iconBox}>
                <Text style={styles.iconText}>IG</Text>
              </View>
              <View>
                <Text style={styles.itgId}>{itg.id}</Text>
                {itg.suministra ? (
                  <Text style={styles.itgSupply}>
                    Suministra: {itg.suministra}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* ITMs List */}
          <View style={styles.circuitsContainer}>
            {itg.itms.map((itm, cIdx) => (
              <View key={cIdx} style={styles.circuitItem}>
                <View style={styles.circuitMainInfo}>
                  <View style={styles.circuitIdBox}>
                    <Text style={styles.circuitIdText}>{itm.id}</Text>
                  </View>
                  <View style={styles.circuitDetails}>
                    <View style={styles.circuitRow}>
                      <Text style={styles.circuitAmps}>{itm.amperaje}A</Text>
                      <Text style={styles.circuitPhase}>{itm.fases}</Text>
                    </View>
                    <Text style={styles.circuitSupply} numberOfLines={2}>
                      {itm.suministra}
                    </Text>
                    <Text style={styles.cableInfo}>
                      {itm.tipo_cable} | {itm.diametro_cable} mm²
                    </Text>
                  </View>
                </View>

                {/* Differential Subsection */}
                {itm.diferencial?.existe && (
                  <View
                    style={[
                      styles.differentialBox,
                      {
                        backgroundColor: '#F0F9FF',
                        borderLeftColor: Colors.light.tint,
                      },
                    ]}>
                    <View style={styles.diffHeader}>
                      <MaterialCommunityIcons
                        name="current-ac"
                        size={14}
                        color={Colors.light.tint}
                      />
                      <Text
                        style={[
                          styles.diffTitle,
                          { color: Colors.light.tint },
                        ]}>
                        Diferencial
                      </Text>
                    </View>
                    <Text style={[styles.diffValue, { color: '#0369a1' }]}>
                      {itm.diferencial.amperaje}A - {itm.diferencial.fases}
                    </Text>
                    {itm.diferencial.tipo_cable && (
                      <Text style={[styles.diffCable, { color: '#0ea5e9' }]}>
                        {itm.diferencial.tipo_cable} |{' '}
                        {itm.diferencial.diametro_cable} mm²
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Additional Components */}
      {componentes.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Componentes Adicionales</Text>
          {componentes.map((comp, idx) => (
            <View key={idx} style={styles.componentGroup}>
              <Text style={styles.componentType}>{comp.tipo}</Text>
              {comp.items.map((item, iIdx) => (
                <View key={iIdx} style={styles.componentRow}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={16}
                    color="#4B5563"
                  />
                  <Text style={styles.compCode}>{item.codigo}</Text>
                  <View style={styles.compDot} />
                  <Text style={styles.compSupply}>{item.suministra}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Special Conditions */}
      {Object.keys(condiciones_especiales).length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Condiciones Especiales</Text>
          <View style={styles.conditionsGrid}>
            {Object.entries(condiciones_especiales).map(([key, value]) => (
              <View
                key={key}
                style={[
                  styles.conditionChip,
                  !value && {
                    backgroundColor: '#F3F4F6',
                    borderColor: '#E5E7EB',
                  },
                ]}>
                <Ionicons
                  name={value ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={value ? Colors.light.tint : Colors.light.icon}
                />
                <Text
                  style={[
                    styles.conditionLabel,
                    !value && { color: Colors.light.icon },
                  ]}>
                  {formatConditionKey(key)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  // Header
  headerSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rotuloLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  rotuloValue: {
    fontSize: 18,
    color: '#11181C',
    fontWeight: '800',
  },
  techGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  techItem: {
    alignItems: 'center',
    flex: 1,
  },
  techLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  techValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  // Sections
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 12,
  },

  // ITG
  itgHeader: {
    marginBottom: 12,
  },
  itgTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0284C7',
  },
  itgId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  itgSupply: {
    fontSize: 12,
    color: '#64748B',
  },

  // Circuits (ITMs)
  circuitsContainer: {
    gap: 12,
  },
  circuitItem: {
    flexDirection: 'column',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  circuitMainInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  circuitIdBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circuitIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  circuitDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  circuitRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 2,
  },
  circuitAmps: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  circuitPhase: {
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  circuitSupply: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 2,
    fontWeight: '500',
  },
  cableInfo: {
    fontSize: 11,
    color: '#94A3B8',
  },

  // Differential
  differentialBox: {
    marginTop: 10,
    backgroundColor: '#F0F9FF', // Sky 50 matching theme tint approx
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 3,
    // borderLeftColor set in style prop
  },
  diffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  diffTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  diffValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  diffCable: {
    fontSize: 11,
    marginTop: 2,
  },

  // Components
  componentGroup: {
    marginBottom: 12,
  },
  componentType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  compCode: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  compDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  compSupply: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },

  // Conditions
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFEFF', // Default active bg (cyan-50)
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A5F3FC', // Default active border
    gap: 6,
  },
  conditionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0E7490', // Default active text
  },
});
