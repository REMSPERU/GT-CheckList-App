import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { BarcodeScanningResult } from 'expo-camera';

import { useThemeColor } from '@/hooks/use-theme-color';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';

function isValidEquipmentCode(value: string) {
  return /^[A-Z0-9][A-Z0-9_-]{2,}$/i.test(value);
}

function extractEquipmentCode(rawValue: string) {
  const value = rawValue.trim();

  if (!value) {
    return '';
  }

  if (isValidEquipmentCode(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const jsonCode =
      parsed.equipoCodigo ?? parsed.codigo ?? parsed.code ?? parsed.equipo;

    if (typeof jsonCode === 'string' && isValidEquipmentCode(jsonCode.trim())) {
      return jsonCode.trim();
    }
  } catch {
    // QR legacy puede venir como texto plano o URL, no siempre como JSON.
  }

  try {
    const url = new URL(value);
    const queryCode =
      url.searchParams.get('equipoCodigo') ??
      url.searchParams.get('codigo') ??
      url.searchParams.get('code') ??
      url.searchParams.get('equipo');

    if (queryCode?.trim() && isValidEquipmentCode(queryCode.trim())) {
      return queryCode.trim();
    }

    const pathSegments = url.pathname.split('/').filter(Boolean);
    const pathCode = pathSegments[pathSegments.length - 1]?.trim();

    if (pathCode && isValidEquipmentCode(pathCode)) {
      return pathCode;
    }
  } catch {
    return '';
  }

  return '';
}

export default function QRScannerScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scanSize = Math.min(Math.max(width - 64, 240), 320);
  const scanLockRef = useRef(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const resetScanner = useCallback(() => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }

    scanLockRef.current = false;
    setIsActive(true);
    setIsResolving(false);
    setScannedData(null);
    setScanMessage(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetScanner();
    }, [resetScanner]),
  );

  const reactivateScannerSoon = useCallback((message: string) => {
    setIsResolving(false);
    setScanMessage(message);

    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = setTimeout(() => {
      scanLockRef.current = false;
      setScannedData(null);
      setScanMessage(null);
      setIsActive(true);
      resetTimeoutRef.current = null;
    }, 1800);
  }, []);

  const resolveChecklistLaunchData = useCallback(
    async (equipoCodigo: string) => {
      const localResult =
        await DatabaseService.getChecklistLaunchDataByEquipmentCode(
          equipoCodigo,
        );

      if (localResult) {
        return localResult;
      }

      try {
        await syncService.triggerSync('qr-scan-equipment', { force: true });
      } catch (error) {
        console.log('[QR Scanner] Sync before lookup failed', error);
      }

      return await DatabaseService.getChecklistLaunchDataByEquipmentCode(
        equipoCodigo,
      );
    },
    [],
  );

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (!isActive || isResolving || scanLockRef.current) {
        return;
      }

      scanLockRef.current = true;
      const rawValue = result.data?.trim() ?? '';
      const equipoCodigo = extractEquipmentCode(rawValue);
      setIsActive(false);
      setIsResolving(true);
      setScannedData(equipoCodigo || rawValue || 'Código sin valor');
      setScanMessage(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (!equipoCodigo) {
        reactivateScannerSoon(
          'QR no válido. Acerca la etiqueta generada para el equipo.',
        );
        return;
      }

      try {
        const launchData = await resolveChecklistLaunchData(equipoCodigo);

        if (!launchData) {
          reactivateScannerSoon(
            'Equipo no encontrado en datos locales. Reintentando escaneo...',
          );
          return;
        }

        setIsResolving(false);
        router.push({
          pathname: '/qr-equipment/options',
          params: {
            buildingId: launchData.buildingId,
            buildingName: launchData.buildingName,
            equipamentoId: launchData.equipamentoId,
            equipamentoNombre: launchData.equipamentoNombre,
            frecuencia: launchData.frecuencia,
            equipoId: launchData.equipoId,
            equipoCodigo: launchData.equipoCodigo,
            equipoUbicacion: launchData.equipoUbicacion,
            equipoDetalleUbicacion: launchData.equipoDetalleUbicacion ?? '',
          },
        });
      } catch (error) {
        console.error('Error opening checklist from QR:', error);
        reactivateScannerSoon(
          'No se pudo buscar el equipo. Reintentando escaneo...',
        );
      }
    },
    [
      isActive,
      isResolving,
      reactivateScannerSoon,
      resolveChecklistLaunchData,
      router,
    ],
  );

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Permiso Denegado',
        'La aplicación necesita acceso a la cámara para escanear códigos QR. Por favor, habilita los permisos en la configuración.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Abrir Configuración',
            onPress: () => Linking.openSettings(),
          },
        ],
      );
    }
  };

  if (!permission) {
    // Los permisos aún están cargando
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <MaterialIcons name="qr-code-scanner" size={80} color={tintColor} />
        <Text style={[styles.permissionText, { color: textColor }]}>
          Se requiere permiso de cámara para escanear códigos QR
        </Text>
        <Text style={styles.permissionHint}>
          El escáner usa la cámara solo para leer la etiqueta del equipo.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: tintColor },
            pressed && styles.pressed,
          ]}
          onPress={handleRequestPermission}
          accessibilityRole="button">
          <Text style={styles.buttonText}>Otorgar Permiso</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      <View style={styles.overlay}>
        <SafeAreaView style={styles.topOverlay}>
          <View style={styles.headerCard}>
            <View style={styles.headerIcon}>
              <MaterialIcons name="qr-code-2" size={22} color="#06B6D4" />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Escanear equipo</Text>
              <Text style={styles.headerSubtitle}>
                Lee el QR para abrir sus opciones
              </Text>
            </View>
          </View>
        </SafeAreaView>
        <View style={[styles.middleRow, { height: scanSize }]}>
          <View style={styles.sideOverlay} />
          <View
            style={[styles.scanArea, { width: scanSize, height: scanSize }]}>
            <View
              style={[
                styles.corner,
                styles.topLeft,
                { borderColor: tintColor },
              ]}
            />
            <View
              style={[
                styles.corner,
                styles.topRight,
                { borderColor: tintColor },
              ]}
            />
            <View
              style={[
                styles.corner,
                styles.bottomLeft,
                { borderColor: tintColor },
              ]}
            />
            <View
              style={[
                styles.corner,
                styles.bottomRight,
                { borderColor: tintColor },
              ]}
            />
            <View style={styles.centerMarker}>
              {isResolving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <MaterialIcons
                  name="center-focus-strong"
                  size={34}
                  color="#fff"
                />
              )}
            </View>
          </View>
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay}>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isActive ? '#22C55E' : '#F59E0B' },
              ]}
            />
            <Text style={styles.statusText}>
              {isResolving
                ? 'Validando equipo'
                : scanMessage
                  ? 'Reactivando escáner'
                  : 'Listo para escanear'}
            </Text>
          </View>
          <Text style={styles.instructionText}>
            Coloca el QR dentro del marco y mantén el teléfono estable.
          </Text>
          {isResolving && (
            <View style={styles.resultContainer}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.resultText}>
                Buscando en datos locales...
              </Text>
            </View>
          )}
          {scannedData && !isResolving && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>
                {scanMessage ?? 'Último escaneo:'}
              </Text>
              <Text style={styles.resultValue} numberOfLines={2}>
                {scannedData}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    marginHorizontal: 40,
  },
  permissionHint: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    marginHorizontal: 44,
    textAlign: 'center',
  },
  button: {
    marginTop: 20,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(236, 254, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  middleRow: {
    flexDirection: 'row',
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMarker: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(15, 23, 42, 0.34)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 8,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    maxWidth: '90%',
    alignItems: 'center',
  },
  resultText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
  },
  resultValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  pressed: {
    opacity: 0.84,
  },
});
