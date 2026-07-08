import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Feather from '@expo/vector-icons/Feather';
import { syncService } from '@/services/sync';
import { DatabaseService } from '@/services/database';

interface InitialSyncScreenProps {
  onComplete: () => void;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export function InitialSyncScreen({ onComplete }: InitialSyncScreenProps) {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const handleSync = async () => {
    setStatus('syncing');
    setErrorMessage(null);
    setElapsedSeconds(0);

    const intervalId = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    try {
      // Activar la vibración táctil al iniciar la sincronización
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Ignorar si haptics falla
      }

      // Disparar sincronización forzada para jalar toda la base de datos
      await syncService.triggerSync('initial-sync-manual', { force: true });

      // Validar si ahora la base de datos local tiene registros cargados
      const hasMirror = await DatabaseService.hasUsableLocalMirror();
      if (hasMirror) {
        setStatus('success');
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}

        // Esperar 1.5 segundos para que el usuario aprecie el estado de éxito y luego redirigir
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        throw new Error('La sincronización se completó pero el espejo local sigue vacío.');
      }
    } catch (error) {
      console.error('[InitialSyncScreen] Sync failed:', error);
      setStatus('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Error al conectar con el servidor. Revisa tu conexión a internet.'
      );
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (e) {}
    } finally {
      clearInterval(intervalId);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          style={styles.logo}
          source={require('../assets/logo/image.png')}
          contentFit="contain"
        />
      </View>

      <View style={styles.card}>
        {status === 'idle' && (
          <>
            <View style={[styles.iconContainer, styles.iconContainerIdle]}>
              <Feather name="download-cloud" size={32} color="#06B6D4" />
            </View>
            <Text style={styles.title}>Configuración Inicial</Text>
            <Text style={styles.description}>
              Para poder trabajar sin conexión y ver tus inmuebles asignados,
              necesitamos descargar la base de datos por primera vez.
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleSync}>
              <Feather name="refresh-cw" size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Descargar Datos Iniciales</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'syncing' && (
          <>
            <View style={styles.spinnerContainer}>
              <ActivityIndicator size="large" color="#06B6D4" />
            </View>
            <Text style={styles.title}>Sincronizando...</Text>
            <Text style={styles.description}>
              Descargando inmuebles, equipos, sistemas y configuraciones.
              Esto puede tardar unos momentos, por favor no cierres la app.
            </Text>
            <Text style={styles.counterText}>
              Tiempo transcurrido: {elapsedSeconds}s
            </Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={[styles.iconContainer, styles.iconContainerSuccess]}>
              <Feather name="check" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>¡Actualizado Correctamente!</Text>
            <Text style={styles.description}>
              Se han descargado todos los datos asignados. La aplicación está lista
              para usarse de forma offline.
            </Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={[styles.iconContainer, styles.iconContainerError]}>
              <Feather name="alert-triangle" size={32} color="#EF4444" />
            </View>
            <Text style={styles.title}>Error de Descarga</Text>
            <Text style={styles.description}>
              {errorMessage ||
                'No se pudo completar la sincronización inicial. Revisa tu conexión a internet e inténtalo de nuevo.'}
            </Text>
            <TouchableOpacity style={styles.buttonRetry} onPress={handleSync}>
              <Feather name="rotate-ccw" size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Reintentar Descarga</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logo: {
    width: 260,
    height: 90,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainerIdle: {
    backgroundColor: '#ECFEFF',
  },
  iconContainerSuccess: {
    backgroundColor: '#10B981',
  },
  iconContainerError: {
    backgroundColor: '#FEE2E2',
  },
  spinnerContainer: {
    marginBottom: 24,
    height: 72,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#06B6D4',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonRetry: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
});
