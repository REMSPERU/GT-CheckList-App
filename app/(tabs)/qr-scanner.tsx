import { useThemeColor } from '@/hooks/use-theme-color';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';

export default function QRScannerScreen() {
  const [isActive, setIsActive] = useState(true);
  const [scannedData, setScannedData] = useState<string | null>(null);
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission: requestCameraPermission } = useCameraPermission();

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'code-93'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && isActive) {
        const code = codes[0];
        setIsActive(false);
        setScannedData(code.value || 'Código sin valor');
        
        Alert.alert(
          'Código Escaneado',
          `Tipo: ${code.type}\nValor: ${code.value}`,
          [
            {
              text: 'Copiar',
              onPress: () => {
                // Aquí puedes implementar la lógica para copiar al portapapeles
                console.log('Copiado:', code.value);
              }
            },
            {
              text: 'Escanear otro',
              onPress: () => {
                setScannedData(null);
                setIsActive(true);
              }
            }
          ]
        );
      }
    }
  });

  const handleRequestPermission = async () => {
    const permission = await requestCameraPermission();
    if (!permission) {
      Alert.alert(
        'Permiso Denegado',
        'La aplicación necesita acceso a la cámara para escanear códigos QR. Por favor, habilita los permisos en la configuración.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Configuración', onPress: () => Linking.openSettings() }
        ]
      );
    }
  };

  if (!hasPermission) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <MaterialIcons name="qr-code-scanner" size={80} color={tintColor} />
        <Text style={[styles.permissionText, { color: textColor }]}>
          Se requiere permiso de cámara para escanear códigos QR
        </Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: tintColor }]}
          onPress={handleRequestPermission}
        >
          <Text style={styles.buttonText}>Otorgar Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <Text style={[styles.errorText, { color: textColor }]}>
          No se encontró ninguna cámara
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        codeScanner={codeScanner}
      />
      
      {/* Overlay con marco de escaneo */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft, { borderColor: tintColor }]} />
            <View style={[styles.corner, styles.topRight, { borderColor: tintColor }]} />
            <View style={[styles.corner, styles.bottomLeft, { borderColor: tintColor }]} />
            <View style={[styles.corner, styles.bottomRight, { borderColor: tintColor }]} />
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
          }}
        >
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
});
