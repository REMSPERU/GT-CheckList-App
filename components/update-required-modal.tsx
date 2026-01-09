import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { openUpdateUrl } from '@/hooks/use-app-update';

interface UpdateRequiredModalProps {
  visible: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string | null;
  releaseUrl: string;
}

export default function UpdateRequiredModal({
  visible,
  currentVersion,
  latestVersion,
  downloadUrl,
  releaseUrl,
}: UpdateRequiredModalProps) {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleUpdate = async () => {
    setIsDownloading(true);
    const url = downloadUrl || releaseUrl;
    await openUpdateUrl(url);
    // Keep spinner for a moment as the browser opens
    setTimeout(() => setIsDownloading(false), 2000);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="download-outline" size={48} color="#0891B2" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Actualización Disponible</Text>

          {/* Description */}
          <Text style={styles.description}>
            Una nueva versión de la aplicación está disponible. Por favor
            actualiza para continuar usando la app.
          </Text>

          {/* Version info */}
          <View style={styles.versionContainer}>
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>Versión instalada:</Text>
              <Text style={styles.versionValueOld}>v{currentVersion}</Text>
            </View>
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>Nueva versión:</Text>
              <Text style={styles.versionValueNew}>v{latestVersion}</Text>
            </View>
          </View>

          {/* Update button */}
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdate}
            disabled={isDownloading}>
            {isDownloading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="cloud-download-outline"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.updateButtonText}>Actualizar Ahora</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Note */}
          <Text style={styles.note}>
            La descarga se abrirá en tu navegador. Una vez descargado, abre el
            archivo APK para instalar la nueva versión.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  versionContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  versionLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  versionValueOld: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  versionValueNew: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  updateButton: {
    backgroundColor: '#0891B2',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});
