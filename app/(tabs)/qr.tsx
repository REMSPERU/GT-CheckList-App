import { useColorScheme } from '@/hooks/use-color-scheme';
import { BarCodeScanner } from 'expo-barcode-scanner';
import React, { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

export default function QRScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState<string>('');
  const colorScheme = useColorScheme();

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setScannedData(data);
    Alert.alert(`Código escaneado`, `Tipo: ${type}\nDatos: ${data}`);
  };

  if (hasPermission === null) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <Text className="text-black dark:text-white">Solicitando permisos de cámara...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <Text className="text-black dark:text-white mb-4">No hay acceso a la cámara</Text>
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-lg"
          onPress={() => Alert.alert('Permiso denegado', 'Habilita el acceso a la cámara en ajustes')}
        >
          <Text className="text-white">Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-1 justify-center items-center p-4">
        {!scanned ? (
          <>
            <Text className="text-2xl font-bold text-black dark:text-white mb-4">Escanear QR</Text>
            <View className="w-full h-64 border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden mb-4">
              <BarCodeScanner
                onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                style={{ flex: 1 }}
              />
            </View>
            <Text className="text-center text-gray-600 dark:text-gray-400">
              Apunta la cámara al código QR
            </Text>
          </>
        ) : (
          <>
            <Text className="text-2xl font-bold text-black dark:text-white mb-4">Resultado del Escaneo</Text>
            <View className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg w-full mb-4">
              <Text className="text-black dark:text-white text-lg">{scannedData}</Text>
            </View>
            <TouchableOpacity
              className="bg-blue-500 px-6 py-3 rounded-lg"
              onPress={() => setScanned(false)}
            >
              <Text className="text-white font-semibold">Escanear de nuevo</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}