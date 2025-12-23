import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface PanelDetailContentProps {
  detail: {
    rotulo?: string;
    tipo_tablero?: string;
    detalle_tecnico?: {
      fases?: string;
      voltaje?: string | number;
      tipo_tablero?: string;
    };
    itgs?: {
      id: string;
      suministra?: string;
      prefijo?: string;
      itms?: {
        id: string;
        amperaje: string | number;
        fases: string;
        tipo_cable: string;
        diametro_cable: string;
        suministra: string;
        diferencial?: {
          existe: boolean;
          amperaje?: string | number;
          fases?: string;
        };
      }[];
    }[];
    componentes?: {
      tipo: string;
      items: {
        codigo: string;
        suministra: string;
      }[];
    }[];
    condiciones_especiales?: Record<string, boolean>;
  };
  panelInfo?: {
    rotulo?: string;
    tipo?: string;
    codigo?: string;
  };
  showTitle?: boolean;
}

export const PanelDetailContent: React.FC<PanelDetailContentProps> = ({
  detail,
  panelInfo,
  showTitle = true
}) => {
  const {
    rotulo,
    tipo_tablero,
    detalle_tecnico,
    itgs = [],
    componentes = [],
    condiciones_especiales = {}
  } = detail;

  // Helper to format keys like "barra_tierra" to "Barra Tierra"
  const formatConditionKey = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <View style={styles.content}>
      {/* Header Section */}
      <View style={styles.section}>
        <Text style={styles.label}>Rótulo:</Text>
        <Text style={styles.valueLarge}>{rotulo || panelInfo?.rotulo || 'N/A'}</Text>

        <View style={styles.row}>
          <View style={styles.halfCol}>
            <Text style={styles.label}>Tipo de Tablero:</Text>
            <Text style={styles.value}>{tipo_tablero || panelInfo?.tipo || 'N/A'}</Text>
          </View>
          <View style={styles.halfCol}>
            <Text style={styles.label}>Código:</Text>
            <Text style={styles.value}>{panelInfo?.codigo || 'N/A'}</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 20,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  componentType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  componentGroup: {
    marginBottom: 12,
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
