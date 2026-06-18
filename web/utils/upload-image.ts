import type { SupabaseClient } from '@supabase/supabase-js';

interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Optimiza una imagen cargada usando un canvas para redimensionarla y convertirla a WebP.
 */
export async function optimizeImageWebp(
  file: File,
  options: OptimizeImageOptions = {},
): Promise<Blob> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Mantener el aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('No se pudo obtener el contexto 2D del canvas'));
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Error al convertir canvas a Blob'));
            }
          },
          'image/webp',
          quality,
        );
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Optimiza una imagen y la sube a Supabase Storage.
 * Retorna la URL pública de la imagen.
 */
export async function uploadPropertyPhoto(
  supabase: SupabaseClient,
  file: File,
  propertyName: string,
): Promise<string> {
  // 1. Optimizar imagen
  const optimizedBlob = await optimizeImageWebp(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });

  // 2. Generar nombre de archivo único
  // Limpiar el nombre de la propiedad para evitar caracteres raros en la URL de Storage
  const safeName = propertyName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^a-zA-Z0-9]/g, '_')   // Reemplazar espacios y caracteres especiales por guiones bajos
    .replace(/_+/g, '_')             // Evitar multiples guiones bajos seguidos
    .toLowerCase();

  const timestamp = new Date().getTime();
  const filePath = `${safeName}/photo_${timestamp}.webp`;
  const bucketName = 'properties';

  // 3. Subir archivo al bucket 'properties'
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, optimizedBlob, {
      contentType: 'image/webp',
      upsert: true,
    });

  if (error) {
    // Check if the error might be because the bucket doesn't exist
    if (error.message?.includes('bucket') && error.message?.includes('not found')) {
      throw new Error(`El bucket '${bucketName}' no existe en Supabase. Debes crearlo en el panel de Storage y hacerlo público.`);
    }
    throw new Error(`Error al subir imagen: ${error.message}`);
  }

  // 4. Obtener URL pública
  const { data: publicData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}

/**
 * Optimiza una imagen de tipo de equipo y la sube a Supabase Storage en el bucket 'properties'.
 * Retorna la URL pública de la imagen.
 */
export async function uploadEquipmentTypePhoto(
  supabase: SupabaseClient,
  file: File,
  typeName: string,
): Promise<string> {
  // 1. Optimizar imagen
  const optimizedBlob = await optimizeImageWebp(file, { maxWidth: 800, maxHeight: 800, quality: 0.85 });

  // 2. Generar nombre de archivo único
  const safeName = typeName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();

  const timestamp = new Date().getTime();
  const filePath = `equipment_types/${safeName}_${timestamp}.webp`;
  const bucketName = 'properties';

  // 3. Subir archivo
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, optimizedBlob, {
      contentType: 'image/webp',
      upsert: true,
    });

  if (error) {
    if (error.message?.includes('bucket') && error.message?.includes('not found')) {
      throw new Error(`El bucket '${bucketName}' no existe en Supabase. Debes crearlo en el panel de Storage y hacerlo público.`);
    }
    throw new Error(`Error al subir imagen de equipo: ${error.message}`);
  }

  // 4. Obtener URL pública
  const { data: publicData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}
