import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';

export interface MaintenanceResponse {
  id_mantenimiento?: string;
  user_created?: string;
  detail_maintenance: any;
}

export class SupabaseMaintenanceService {
  private bucketName = 'maintenance';
  private tableName = 'maintenance_response';

  /**
   * Upload a photo to Supabase Storage
   * @param uri Local file URI
   * @param folder Target folder path in storage
   */
  async uploadPhoto(uri: string, folder: string): Promise<string> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();

      return new Promise<string>((resolve, reject) => {
        reader.onload = async () => {
          if (reader.result) {
            try {
              const arrayBuffer = decode(
                (reader.result as string).split(',')[1],
              );
              const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
              const filePath = `execution/${folder}/${fileName}`;

              const { data, error } = await supabase.storage
                .from(this.bucketName)
                .upload(filePath, arrayBuffer, {
                  contentType: 'image/jpeg',
                  upsert: false,
                });

              if (error) throw error;

              const {
                data: { publicUrl },
              } = supabase.storage.from(this.bucketName).getPublicUrl(filePath);
              resolve(publicUrl);
            } catch (e) {
              reject(e);
            }
          }
        };
        reader.onerror = e => reject(e);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      throw e;
    }
  }

  /**
   * Save maintenance response to Database
   */
  async saveMaintenanceResponse(response: MaintenanceResponse): Promise<void> {
    const { error } = await supabase.from(this.tableName).insert({
      id_mantenimiento: response.id_mantenimiento,
      user_created: response.user_created,
      detail_maintenance: response.detail_maintenance,
    });

    if (error) {
      console.error('Error saving maintenance response:', error);
      throw error;
    }
  }
}

export const supabaseMaintenanceService = new SupabaseMaintenanceService();
