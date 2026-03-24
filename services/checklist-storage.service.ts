import { decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';

export interface StoredPhotoRef {
  bucket: string;
  path: string;
  public_url: string;
}

interface UploadChecklistPhotoInput {
  uri: string;
  userId: string;
  equipoId: string;
  questionId?: string;
  kind: 'general' | 'question';
}

class ChecklistStorageService {
  private readonly bucketName = 'maintenance';

  private normalizePathSegment(value: string): string {
    return value
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private getFileExtension(uri: string): string {
    const cleanedUri = uri.split('?')[0].toLowerCase();
    if (cleanedUri.endsWith('.png')) return 'png';
    if (cleanedUri.endsWith('.webp')) return 'webp';
    return 'jpg';
  }

  private buildPhotoPath(input: UploadChecklistPhotoInput): string {
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const ext = this.getFileExtension(input.uri);
    const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const safeUserId = this.normalizePathSegment(input.userId);
    const safeEquipoId = this.normalizePathSegment(input.equipoId);

    if (input.kind === 'general') {
      return `checklists/${yyyy}/${mm}/${dd}/users/${safeUserId}/equipos/${safeEquipoId}/general/${uniqueId}.${ext}`;
    }

    const safeQuestionId = this.normalizePathSegment(
      input.questionId || 'unknown',
    );

    return `checklists/${yyyy}/${mm}/${dd}/users/${safeUserId}/equipos/${safeEquipoId}/questions/${safeQuestionId}/${uniqueId}.${ext}`;
  }

  private ensureLocalUri(uri: string): string {
    if (
      uri.startsWith('http') ||
      uri.startsWith('file://') ||
      uri.startsWith('content://')
    ) {
      return uri;
    }
    return `file://${uri}`;
  }

  async uploadPhoto(input: UploadChecklistPhotoInput): Promise<StoredPhotoRef> {
    const cleanUri = this.ensureLocalUri(input.uri);
    const response = await fetch(cleanUri);

    if (!response.ok) {
      throw new Error(`No se pudo leer la foto local (${response.status}).`);
    }

    const blob = await response.blob();
    const reader = new FileReader();

    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      reader.onload = () => {
        if (!reader.result || typeof reader.result !== 'string') {
          reject(new Error('No se pudo convertir la imagen para subirla.'));
          return;
        }

        try {
          const decoded = decode(reader.result.split(',')[1]);
          resolve(decoded);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Error al procesar imagen con FileReader.'));
      };

      reader.readAsDataURL(blob);
    });

    const path = this.buildPhotoPath(input);
    const extension = this.getFileExtension(input.uri);
    const contentType =
      extension === 'png'
        ? 'image/png'
        : extension === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

    const { error } = await supabase.storage
      .from(this.bucketName)
      .upload(path, arrayBuffer, {
        contentType,
        upsert: false,
        cacheControl: '3600',
      });

    if (error) {
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(this.bucketName).getPublicUrl(path);

    return {
      bucket: this.bucketName,
      path,
      public_url: publicUrl,
    };
  }

  async removePhotos(photos: StoredPhotoRef[]): Promise<void> {
    if (photos.length === 0) {
      return;
    }

    const pathsByBucket = photos.reduce<Record<string, string[]>>(
      (acc, item) => {
        if (!acc[item.bucket]) {
          acc[item.bucket] = [];
        }
        acc[item.bucket].push(item.path);
        return acc;
      },
      {},
    );

    await Promise.all(
      Object.entries(pathsByBucket).map(async ([bucket, paths]) => {
        const { error } = await supabase.storage.from(bucket).remove(paths);
        if (error) {
          throw error;
        }
      }),
    );
  }
}

export const checklistStorageService = new ChecklistStorageService();
