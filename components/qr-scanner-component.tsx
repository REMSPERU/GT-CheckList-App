import { useThemeColor } from '@/hooks/use-theme-color';
import { BarcodeScanningResult, BarcodeType, CameraView } from 'expo-camera';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface QRScannerComponentProps {
  isActive: boolean;
  onCodeScanned: (code: BarcodeScanningResult) => void;
  codeTypes?: BarcodeType[];
  overlayStyle?: ViewStyle;
  showFrame?: boolean;
}

export default function QRScannerComponent({
  isActive,
  onCodeScanned,
  codeTypes = ['qr', 'ean13'],
  overlayStyle,
  showFrame = true
}: QRScannerComponentProps) {
  const tintColor = useThemeColor({}, 'tint');

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (isActive) {
      onCodeScanned(result);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: codeTypes,
        }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      
      {showFrame && (
        <View style={[styles.overlay, overlayStyle]}>
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
              Coloca el código dentro del marco
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
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
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});
