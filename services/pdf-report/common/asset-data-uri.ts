import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

interface AssetDataUriOptions {
  mimeType?: string;
  fileExtension?: string;
}

async function readAsBase64WithFallback(
  uri: string,
  fileExtension: string,
): Promise<string> {
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;

    if (!cacheDir) {
      throw new Error('No writable directory available for asset fallback.');
    }

    const tempUri = `${cacheDir}pdf-asset-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExtension}`;

    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      await FileSystem.downloadAsync(uri, tempUri);
    } else {
      await FileSystem.copyAsync({ from: uri, to: tempUri });
    }

    return FileSystem.readAsStringAsync(tempUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
}

export async function getAssetDataUri(
  moduleId: number,
  options?: AssetDataUriOptions,
): Promise<string> {
  const mimeType = options?.mimeType || 'image/png';
  const fileExtension = options?.fileExtension || 'png';

  const [loadedAsset] = await Asset.loadAsync(moduleId);

  if (!loadedAsset.localUri) {
    await loadedAsset.downloadAsync();
  }

  const baseAsset = Asset.fromModule(moduleId);

  const candidateUris = [
    loadedAsset.localUri,
    loadedAsset.uri,
    baseAsset.localUri,
    baseAsset.uri,
  ].filter((uri): uri is string => Boolean(uri));

  let lastError: unknown = null;

  for (const uri of candidateUris) {
    try {
      const base64 = await readAsBase64WithFallback(uri, fileExtension);
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Unable to load bundled asset as data URI.');
}
