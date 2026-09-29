import multer from 'multer';
import { ApiError } from '../utils/ApiError';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

/** Keeps uploads in memory (max 5 MB, images only) for streaming to Cloudinary. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.has(file.mimetype) ? cb(null, true) : cb(ApiError.badRequest('Only JPEG, PNG, WEBP or AVIF images are allowed')),
});
