import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

type ImagePermissionSource = 'camera' | 'mediaLibrary';

interface EnsureImagePermissionOptions {
  deniedTitle?: string;
  deniedMessage?: string;
  blockedMessage?: string;
}

const SOURCE_LABEL: Record<ImagePermissionSource, string> = {
  camera: 'camara',
  mediaLibrary: 'galeria',
};

function showDeniedAlert(
  source: ImagePermissionSource,
  canAskAgain: boolean,
  options?: EnsureImagePermissionOptions,
) {
  const deniedTitle = options?.deniedTitle || 'Permiso requerido';
  const deniedMessage =
    options?.deniedMessage ||
    `Debe habilitar acceso a la ${SOURCE_LABEL[source]} para continuar.`;
  const blockedMessage =
    options?.blockedMessage ||
    `El acceso a la ${SOURCE_LABEL[source]} esta bloqueado. Habilitalo desde Configuracion.`;

  if (canAskAgain) {
    Alert.alert(deniedTitle, deniedMessage);
    return;
  }

  Alert.alert(deniedTitle, blockedMessage, [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Abrir configuracion',
      onPress: () => {
        void Linking.openSettings();
      },
    },
  ]);
}

export async function ensureImagePermission(
  source: ImagePermissionSource,
  options?: EnsureImagePermissionOptions,
): Promise<boolean> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permission.granted) {
    return true;
  }

  showDeniedAlert(source, permission.canAskAgain, options);
  return false;
}
