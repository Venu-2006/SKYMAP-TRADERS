import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const cloudinaryConfigured = () => Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

/** Directory for locally stored uploads (used when Cloudinary is not configured). */
export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

export interface UploadedImage {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

/**
 * Stores an uploaded image. Uses Cloudinary when configured; otherwise writes
 * to ./uploads and serves it from API_PUBLIC_URL/uploads (fine for development
 * and single-server deployments, not for ephemeral container disks).
 */
export async function uploadBuffer(buffer: Buffer, folder: string, mimetype = 'image/jpeg'): Promise<UploadedImage> {
  if (cloudinaryConfigured()) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: `skymap/${folder}`, resource_type: 'image', transformation: [{ quality: 'auto', fetch_format: 'auto' }] },
          (err, result) => (err || !result ? reject(err ?? new Error('Upload failed')) : resolve(result)),
        )
        .end(buffer);
    });
  }
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, '');
  const name = `${crypto.randomUUID()}.${EXT[mimetype] ?? 'jpg'}`;
  await fs.mkdir(path.join(UPLOAD_DIR, safeFolder), { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, safeFolder, name), buffer);
  return { secure_url: `${env.API_PUBLIC_URL}/uploads/${safeFolder}/${name}`, public_id: `local:${safeFolder}/${name}` };
}

export async function deleteImage(publicId: string) {
  if (publicId.startsWith('local:')) {
    const rel = publicId.slice(6);
    if (!/^[a-z0-9-]+\/[a-z0-9-]+\.[a-z]+$/i.test(rel)) return; // never follow user-controlled paths
    await fs.unlink(path.join(UPLOAD_DIR, rel)).catch(() => undefined);
    return;
  }
  if (cloudinaryConfigured()) await cloudinary.uploader.destroy(publicId);
}
