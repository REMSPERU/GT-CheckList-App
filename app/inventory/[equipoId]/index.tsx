import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { EquipmentStatusBadge } from '@/components/inventory/equipment-status-badge';
import { UbicacionLabel } from '@/components/inventory/ubicacion-label';
import { useInventoryEquipoDetail } from '@/hooks/use-inventory-query';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : (value ?? '');
}

interface HubActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  onPress: () => void;
}

function HubActionCard({
  icon,
  iconColor,
  iconBg,
  title,
  description,
  onPress,
}: HubActionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.actionCardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}>
      <View style={[styles.actionIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.actionBody}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
    </Pressable>
  );
}

export default function EquipoHubScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const equipoId = getSingleParam(params.equipoId);
  const propertyId = getSingleParam(params.propertyId);
  const propertyName = getSingleParam(params.propertyName);
  const equipamentoId = getSingleParam(params.equipamentoId);
  const equipamentoNombre = getSingleParam(params.equipamentoNombre);
  const equipamentoAbreviatura = getSingleParam(params.equipamentoAbreviatura);

  const { data: equipo, isLoading } = useInventoryEquipoDetail(equipoId);

  const displayNombre = equipo?.equipamento_nombre ?? equipamentoNombre;
  const displayAbreviatura =
    equipo?.equipamento_abreviatura ?? equipamentoAbreviatura;

  const handleChecklist = useCallback(() => {
    router.push({
      pathname: '/checklist',
      params: {
        buildingId: propertyId,
        buildingName: propertyName,
        equipamentoId,
        equipamentoNombre: displayNombre,
        equipamentoFrecuencia: equipo?.equipamento_frecuencia ?? 'MENSUAL',
        equipamentoAbreviatura: displayAbreviatura,
        equipoId: equipoId,
        equipoCodigo: equipo?.codigo ?? '',
      },
    });
  }, [
    router,
    propertyId,
    propertyName,
    equipamentoId,
    displayNombre,
    equipo,
    displayAbreviatura,
    equipoId,
  ]);

  const handleDetalle = useCallback(() => {
    router.push({
      pathname: '/inventory/[equipoId]/detail' as never,
      params: {
        equipoId,
        propertyId,
        propertyName,
        equipamentoId,
        equipamentoNombre: displayNombre,
        equipamentoAbreviatura: displayAbreviatura,
      },
    });
  }, [
    router,
    equipoId,
    propertyId,
    propertyName,
    equipamentoId,
    displayNombre,
    displayAbreviatura,
  ]);

  const handleHistorial = useCallback(() => {
    router.push({
      pathname: '/inventory/[equipoId]/history' as never,
      params: {
        equipoId,
        propertyId,
        propertyName,
        equipamentoNombre: displayNombre,
      },
    });
  }, [router, equipoId, propertyId, propertyName, displayNombre]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar">
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.breadcrumb} numberOfLines={1}>
            {propertyName}
          </Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayNombre || 'Equipo'}
          </Text>
        </View>
        {displayAbreviatura ? (
          <View style={styles.abreviaturaBadge}>
            <Text style={styles.abreviaturaText}>{displayAbreviatura}</Text>
          </View>
        ) : null}
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Equipment identity card */}
        {isLoading ? (
          <View style={styles.identityCardLoading}>
            <ActivityIndicator size="small" color="#06B6D4" />
          </View>
        ) : equipo ? (
          <View style={styles.identityCard}>
            <View style={styles.identityIconWrap}>
              <Ionicons name="hardware-chip" size={28} color="#0891B2" />
            </View>
            <View style={styles.identityBody}>
              <Text style={styles.identityCodigo}>{equipo.codigo}</Text>
              <UbicacionLabel
                ubicacion={equipo.ubicacion}
                detalleUbicacion={equipo.detalle_ubicacion}
              />
              {equipo.sistema_nombre ? (
                <View style={styles.sistemaRow}>
                  <Ionicons name="layers-outline" size={12} color="#94A3B8" />
                  <Text style={styles.sistemaNombre}>
                    {equipo.sistema_nombre}
                  </Text>
                </View>
              ) : null}
            </View>
            <EquipmentStatusBadge estatus={equipo.estatus} />
          </View>
        ) : null}

        {/* Divider */}
        <Text style={styles.actionsLabel}>Acciones disponibles</Text>

        {/* Action cards */}
        <View style={styles.actionsGrid}>
          <HubActionCard
            icon="checkbox-outline"
            iconColor="#0891B2"
            iconBg="#ECFEFF"
            title="Checklist"
            description="Registrar revisión periódica"
            onPress={handleChecklist}
          />
          <HubActionCard
            icon="document-text-outline"
            iconColor="#7C3AED"
            iconBg="#F5F3FF"
            title="Detalle Técnico"
            description="Ver y editar especificaciones"
            onPress={handleDetalle}
          />
          <HubActionCard
            icon="time-outline"
            iconColor="#D97706"
            iconBg="#FFFBEB"
            title="Historial"
            description="Ver cambios y mantenimientos"
            onPress={handleHistorial}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.75 },
  headerTextWrap: { flex: 1 },
  breadcrumb: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  abreviaturaBadge: {
    backgroundColor: '#ECFEFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CFFAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  abreviaturaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0891B2',
    letterSpacing: 0.5,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 0 },
  identityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  identityCardLoading: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  identityIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#CFFAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityBody: { flex: 1, gap: 5 },
  identityCodigo: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  sistemaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  sistemaNombre: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  actionsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  actionsGrid: {
    gap: 10,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  actionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBody: { flex: 1 },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 13,
    color: '#64748B',
  },
});
