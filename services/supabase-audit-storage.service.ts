import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/lib/supabase';

interface UploadAuditPhotoInput {
  uri: string;
  clientSubmissionId: string;
  propertyId: string;
  auditorId: string;
  questionId?: string;
}

interface UploadedAuditPhoto {
  bucket: string;
  path: string;
  publicUrl: string;
}

class SupabaseAuditStorageService {
  private readonly bucketName = 'maintenance';

  private normalizePathSegment(value: string): string {
    return value
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private getFileExtension(uri: string): string {
    const cleaned = uri.split('?')[0].toLowerCase();
    if (cleaned.endsWith('.png')) return 'png';
    if (cleaned.endsWith('.webp')) return 'webp';
    return 'jpg';
  }

  private async readLocalFileToArrayBuffer(uri: string): Promise<ArrayBuffer> {
    const normalizedUri =
      uri.startsWith('http') ||
      uri.startsWith('file://') ||
      uri.startsWith('content://')
        ? uri
        : `file://${uri}`;

    if (normalizedUri.startsWith('http')) {
      const response = await fetch(normalizedUri);
      if (!response.ok) {
        throw new Error(`No se pudo leer la imagen (${response.status}).`);
      }

      const blob = await response.blob();
      const reader = new FileReader();

      return new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onload = () => {
          if (!reader.result || typeof reader.result !== 'string') {
            reject(new Error('No se pudo convertir la imagen.'));
            return;
          }

          try {
            resolve(decode(reader.result.split(',')[1]));
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Error al procesar imagen.'));
        reader.readAsDataURL(blob);
      });
    }

    const base64 = await FileSystem.readAsStringAsync(normalizedUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return decode(base64);
  }

  private buildPath(input: UploadAuditPhotoInput): string {
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const ext = this.getFileExtension(input.uri);
    const fileName = `${Date.now()}_${Math.floor(Math.random() * 100000)}.${ext}`;
    const safeSession = this.normalizePathSegment(input.clientSubmissionId);
    const safeProperty = this.normalizePathSegment(input.propertyId);
    const safeAuditor = this.normalizePathSegment(input.auditorId);
    const safeQuestion = this.normalizePathSegment(
      input.questionId || 'general',
    );

    return `audits/${yyyy}/${mm}/${dd}/properties/${safeProperty}/auditors/${safeAuditor}/sessions/${safeSession}/questions/${safeQuestion}/${fileName}`;
  }

  async uploadPhoto(input: UploadAuditPhotoInput): Promise<UploadedAuditPhoto> {
    const arrayBuffer = await this.readLocalFileToArrayBuffer(input.uri);
    const path = this.buildPath(input);
    const ext = this.getFileExtension(input.uri);
    const contentType =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

    const { error } = await supabase.storage
      .from(this.bucketName)
      .upload(path, arrayBuffer, {
        upsert: false,
        contentType,
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
      publicUrl,
    };
  }
}

export const supabaseAuditStorageService = new SupabaseAuditStorageService();
