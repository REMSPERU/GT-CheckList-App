import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';

export interface MaintenanceResponse {
  id_mantenimiento?: string | null;
  user_created?: string;
  detail_maintenance: any;
  protocol?: any;
}

export interface PhotoUploadContext {
  sessionId?: string | null;
  equipmentId?: string | null;
  maintenanceId?: string | null;
  category: 'pre' | 'post' | 'observation' | 'grounding-well' | 'session-start';
  observationKey?: string | null;
  itemKey?: string | null;
}

export class SupabaseMaintenanceService {
  private bucketName = 'maintenance';
  private tableName = 'maintenance_response';

  private normalizePathSegment(value: string): string {
    return value
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private buildPhotoPath(
    fileName: string,
    context: PhotoUploadContext,
  ): string {
    const safeFileName = this.normalizePathSegment(fileName);

    if (context.category === 'session-start') {
      if (context.sessionId) {
        return `execution/sessions/${this.normalizePathSegment(context.sessionId)}/session-start/${safeFileName}`;
      }
      return `execution/session-start/${safeFileName}`;
    }

    const sessionSegment = context.sessionId
      ? `sessions/${this.normalizePathSegment(context.sessionId)}`
      : 'adhoc';
    const equipmentSegment = context.equipmentId
      ? `equipments/${this.normalizePathSegment(context.equipmentId)}`
      : 'equipments/unassigned';
    const maintenanceSegment = context.maintenanceId
      ? `maintenances/${this.normalizePathSegment(context.maintenanceId)}`
      : 'maintenances/unassigned';

    if (context.category === 'observation') {
      const observationKey = context.observationKey
        ? this.normalizePathSegment(context.observationKey)
        : 'general';
      return `execution/${sessionSegment}/${equipmentSegment}/${maintenanceSegment}/observation/${observationKey}/${safeFileName}`;
    }

    if (context.category === 'grounding-well') {
      const itemKey = context.itemKey
        ? this.normalizePathSegment(context.itemKey)
        : 'general';
      return `execution/${sessionSegment}/${equipmentSegment}/${maintenanceSegment}/grounding-well/${itemKey}/${safeFileName}`;
    }

    return `execution/${sessionSegment}/${equipmentSegment}/${maintenanceSegment}/${context.category}/${safeFileName}`;
  }

  /**
   * Upload a photo to Supabase Storage
   * @param uri Local file URI
   * @param context Path metadata used to build storage hierarchy
   */
  async uploadPhoto(uri: string, context: PhotoUploadContext): Promise<string> {
    try {
      // Ensure file:// prefix for local URIs on mobile
      const cleanUri =
        uri.startsWith('http') ||
        uri.startsWith('file://') ||
        uri.startsWith('content://')
          ? uri
          : `file://${uri}`;

      console.log(`[STORAGE] Fetching URI: ${cleanUri}`);
      const response = await fetch(cleanUri);

      if (!response.ok) {
        throw new Error(`Fetch failed with status: ${response.status}`);
      }

      const blob = await response.blob();
      console.log(`[STORAGE] Blob created: ${blob.size} bytes`);

      const reader = new FileReader();

      return new Promise<string>((resolve, reject) => {
        reader.onload = async () => {
          if (reader.result) {
            try {
              console.log('[STORAGE] Decoding base64...');
              const arrayBuffer = decode(
                (reader.result as string).split(',')[1],
              );
              const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
              const filePath = this.buildPhotoPath(fileName, context);

              console.log(`[STORAGE] Uploading to Supabase: ${filePath}...`);
              const { data, error } = await supabase.storage
                .from(this.bucketName)
                .upload(filePath, arrayBuffer, {
                  contentType: 'image/jpeg',
                  upsert: false,
                });

              if (error) {
                console.error('[STORAGE] Supabase upload error:', error);
                throw error;
              }

              const {
                data: { publicUrl },
              } = supabase.storage.from(this.bucketName).getPublicUrl(filePath);

              console.log(`[STORAGE] Upload success: ${publicUrl}`);
              resolve(publicUrl);
            } catch (e) {
              console.error('[STORAGE] Error in reader.onload:', e);
              reject(e);
            }
          }
        };
        reader.onerror = e => {
          console.error('[STORAGE] FileReader error:', e);
          reject(e);
        };
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('[STORAGE] Critical upload error:', e);
      throw e;
    }
  }

  /**
   * Save maintenance response to Database
   */
  async saveMaintenanceResponse(response: MaintenanceResponse): Promise<void> {
    const data: any = {
      id_mantenimiento: response.id_mantenimiento,
      user_created: response.user_created,
      detail_maintenance: response.detail_maintenance,
    };

    // Only include protocol if it's provided, to be safer with older schemas
    if (response.protocol) {
      data.protocol = response.protocol;
    }

    const { error } = await supabase.from(this.tableName).insert(data);

    if (error) {
      console.error('Error saving maintenance response:', error);
      throw error;
    }
  }

  /**
   * Update maintenance status in the mantenimientos table
   * @param maintenanceId UUID of the maintenance record
   * @param status New status value ('FINALIZADO', 'EN_PROGRESO', etc.)
   */
  async updateMaintenanceStatus(
    maintenanceId: string,
    status: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('mantenimientos')
      .update({ estatus: status })
      .eq('id', maintenanceId);

    if (error) {
      console.error('Error updating maintenance status:', error);
      throw error;
    }
  }

  /**
   * Update protocol in maintenance_response table
   */
  async updateProtocol(
    maintenanceId: string,
    protocol: Record<string, boolean>,
  ): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .update({ protocol })
      .eq('id_mantenimiento', maintenanceId);

    if (error) {
      console.error('Error updating maintenance protocol:', error);
      throw error;
    }
  }
}

export const supabaseMaintenanceService = new SupabaseMaintenanceService();
