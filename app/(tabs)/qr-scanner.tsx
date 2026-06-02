import { useThemeColor } from '@/hooks/use-theme-color';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';

function isValidEquipmentCode(value: string) {
  return /^[A-Z0-9][A-Z0-9_-]{2,}$/i.test(value);
}

export default function QRScannerScreen() {
  const router = useRouter();
  const [isActive, setIsActive] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const [permission, requestPermission] = useCameraPermissions();

  const reactivateScanner = useCallback(() => {
    setScannedData(null);
    setIsResolving(false);
    setIsActive(true);
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
      if (!isActive || isResolving) {
        return;
      }

      const equipoCodigo = result.data?.trim() ?? '';
      setIsActive(false);
      setIsResolving(true);
      setScannedData(equipoCodigo || 'Código sin valor');

      if (!equipoCodigo || !isValidEquipmentCode(equipoCodigo)) {
        setIsResolving(false);
        Alert.alert(
          'QR no válido',
          'Este QR no contiene un código de equipo válido.',
          [{ text: 'Escanear otro', onPress: reactivateScanner }],
        );
        return;
      }

      try {
        const launchData = await resolveChecklistLaunchData(equipoCodigo);

        if (!launchData) {
          setIsResolving(false);
          Alert.alert(
            'Equipo no encontrado',
            'No se encontró este equipo en la app. Sincroniza los datos e intenta nuevamente.',
            [{ text: 'Escanear otro', onPress: reactivateScanner }],
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
        setIsResolving(false);
        Alert.alert(
          'No se pudo abrir el checklist',
          'Ocurrió un error al buscar el equipo escaneado.',
          [{ text: 'Escanear otro', onPress: reactivateScanner }],
        );
      }
    },
    [
      isActive,
      isResolving,
      reactivateScanner,
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

      {/* Overlay con marco de escaneo */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanArea}>
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
          </View>
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay}>
          <Text style={styles.instructionText}>
            Coloca el QR del equipo dentro del marco
          </Text>
          {isResolving && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>Buscando equipo...</Text>
            </View>
          )}
          {scannedData && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>Último escaneo:</Text>
              <Text style={styles.resultValue} numberOfLines={2}>
                {scannedData}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Botón para reactivar el escáner */}
      {!isActive && (
        <Pressable
          style={({ pressed }) => [
            styles.scanButton,
            { backgroundColor: tintColor },
            pressed && styles.pressed,
          ]}
          onPress={reactivateScanner}
          accessibilityRole="button">
          <MaterialIcons name="qr-code-scanner" size={24} color="#fff" />
          <Text style={styles.scanButtonText}>Escanear Nuevo</Text>
        </Pressable>
      )}
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
  },
  middleRow: {
    flexDirection: 'row',
    height: 300,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: 300,
    height: 300,
    position: 'relative',
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
    textAlign: 'center',
    marginTop: 20,
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    maxWidth: '90%',
  },
  resultText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
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
