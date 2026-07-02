import { supabase, STORAGE_BUCKETS } from "../lib/supabase";

// ----------------------------------------------------------------------------
// Generischer Upload-Helfer für Supabase Storage.
// Gibt null zurück, wenn Supabase nicht konfiguriert ist oder der Upload
// fehlschlägt – der Aufrufer entscheidet dann selbst über einen Fallback
// (z.B. Base64 im LocalStorage speichern).
// ----------------------------------------------------------------------------

export interface UploadResult {
  url: string;
  path: string;
}

export async function uploadToBucket(
  bucket: keyof typeof STORAGE_BUCKETS,
  file: File,
  folder = "",
): Promise<UploadResult | null> {
  if (!supabase) return null;

  const bucketName = STORAGE_BUCKETS[bucket];
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${folder ? `${folder}/` : ""}${Date.now()}-${safeName}`;

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error || !data) {
      console.warn(`[storage] Upload zu ${bucketName} fehlgeschlagen`, error);
      return null;
    }

    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
    return { url: urlData.publicUrl, path: data.path };
  } catch (err) {
    console.warn(`[storage] Upload zu ${bucketName} fehlgeschlagen`, err);
    return null;
  }
}

export async function deleteFromBucket(
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string,
): Promise<boolean> {
  if (!supabase) return false;
  const bucketName = STORAGE_BUCKETS[bucket];
  try {
    const { error } = await supabase.storage.from(bucketName).remove([path]);
    return !error;
  } catch (err) {
    console.warn(`[storage] Löschen in ${bucketName} fehlgeschlagen`, err);
    return false;
  }
}

// Liest eine Datei als Base64-Data-URL (Offline-Fallback für Fotos, falls
// Supabase nicht konfiguriert ist)
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden"));
    reader.readAsDataURL(file);
  });
}
