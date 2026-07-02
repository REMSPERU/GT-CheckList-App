import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

const PHOTOS_DIR = `${FileSystem.documentDirectory}app-photos/`;

function getPhotoExtension(uri: string) {
  const cleanUri = uri.split('?')[0].toLowerCase();
  if (cleanUri.endsWith('.png')) return 'png';
  if (cleanUri.endsWith('.webp')) return 'webp';
  return 'jpg';
}

/**
 * Copies a photo from temporary cache to the app's persistent document directory.
 * This guarantees the photo won't be deleted by the OS cache cleaner.
 */
export async function persistLocalPhoto(uri: string): Promise<string> {
  // If already in the document directory, ensure it exists
  if (uri.startsWith(FileSystem.documentDirectory!)) {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('PHOTO_LOCAL_MISSING');
    }
    return uri;
  }

  // Create directory if it doesn't exist
  const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }

  const extension = getPhotoExtension(uri);
  const targetUri = `${PHOTOS_DIR}${Date.now()}_${Math.floor(
    Math.random() * 100000,
  )}.${extension}`;

  await FileSystem.copyAsync({ from: uri, to: targetUri });
  return targetUri;
}

/**
 * Saves a copy of the photo to the user's public Gallery (Camera Roll).
 * Fails silently if permissions are not granted.
 */
export async function saveToGallery(uri: string): Promise<void> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync(true);
    if (status !== 'granted') {
      console.warn('Media Library permission not granted, skipping gallery save.');
      return;
    }
    await MediaLibrary.saveToLibraryAsync(uri);
    console.log('Photo successfully saved to gallery.');
  } catch (error) {
    console.error('Error saving photo to gallery:', error);
  }
}
