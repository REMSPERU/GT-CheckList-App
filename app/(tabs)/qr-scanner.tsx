import { useThemeColor } from '@/hooks/use-theme-color';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import { useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function QRScannerScreen() {
  const [isActive, setIsActive] = useState(true);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isWebScanning, setIsWebScanning] = useState(false);
  const [webImagePreview, setWebImagePreview] = useState<string | null>(null);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const [permission, requestPermission] = useCameraPermissions();

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (isActive) {
      setIsActive(false);
      setScannedData(result.data || 'Código sin valor');

      Alert.alert(
        'Código Escaneado',
        `Tipo: ${result.type}\nValor: ${result.data}`,
        [
          {
            text: 'Copiar',
            onPress: () => {
              // Aquí puedes implementar la lógica para copiar al portapapeles
              console.log('Copiado:', result.data);
            },
          },
          {
            text: 'Escanear otro',
            onPress: () => {
              setScannedData(null);
              setIsActive(true);
            },
          },
        ],
      );
    }
  };

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

  const handleWebPickImage = () => {
    webFileInputRef.current?.click();
  };

  const handleWebImageSelected = async (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setWebImagePreview(previewUrl);
    setIsWebScanning(true);

    try {
      const BarcodeDetectorImpl = (window as any).BarcodeDetector;

      if (!BarcodeDetectorImpl) {
        throw new Error(
          'Tu navegador no soporta lectura automática de QR por imagen.',
        );
      }

      const detector = new BarcodeDetectorImpl({
        formats: [
          'qr_code',
          'ean_13',
          'ean_8',
          'code_128',
          'code_39',
          'code_93',
        ],
      });

      const bitmap = await createImageBitmap(file);
      const barcodes = await detector.detect(bitmap);

      if (!barcodes?.length) {
        Alert.alert(
          'Sin resultados',
          'No se detectó ningún código en la imagen.',
        );
        return;
      }

      const first = barcodes[0];
      const value = first.rawValue || 'Código sin valor';
      setScannedData(value);
      Alert.alert('Código Detectado', `Valor: ${value}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo leer la imagen';
      Alert.alert('Error al escanear', message);
    } finally {
      setIsWebScanning(false);
      event.target.value = '';
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <input
          ref={webFileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleWebImageSelected}
        />

        <MaterialIcons name="qr-code-scanner" size={80} color={tintColor} />
        <Text style={[styles.permissionText, { color: textColor }]}>
          En web puedes escanear QR/códigos desde una foto o captura de cámara.
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: tintColor }]}
          onPress={handleWebPickImage}>
          <Text style={styles.buttonText}>
            {isWebScanning ? 'Procesando...' : 'Seleccionar imagen'}
          </Text>
        </TouchableOpacity>

        {webImagePreview && (
          <Image
            source={{ uri: webImagePreview }}
            style={styles.previewImage}
          />
        )}

        {scannedData && (
          <View style={styles.webResultContainer}>
            <Text style={[styles.resultText, { color: textColor }]}>
              Resultado:
            </Text>
            <Text style={[styles.resultValue, { color: textColor }]}>
              {scannedData}
            </Text>
          </View>
        )}
      </View>
    );
  }

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
        <TouchableOpacity
          style={[styles.button, { backgroundColor: tintColor }]}
          onPress={handleRequestPermission}>
          <Text style={styles.buttonText}>Otorgar Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'code93'],
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
            Coloca el código QR dentro del marco
          </Text>
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
        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: tintColor }]}
          onPress={() => {
            setScannedData(null);
            setIsActive(true);
          }}>
          <MaterialIcons name="qr-code-scanner" size={24} color="#fff" />
          <Text style={styles.scanButtonText}>Escanear Nuevo</Text>
        </TouchableOpacity>
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
  previewImage: {
    width: 260,
    height: 260,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  webResultContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    width: '85%',
  },
});
