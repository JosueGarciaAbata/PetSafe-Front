import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export const ASSETS_ROOT = join(process.cwd(), 'assets');
export const PATIENT_UPLOADS_DIR = join(ASSETS_ROOT, 'uploads', 'patients');
export const PATIENT_UPLOADS_URL_PREFIX = '/assets/uploads/patients';

const ensureDirectory = (directory: string): void => {
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
};

const sanitizeExtension = (fileName: string, mimeType?: string): string => {
  const originalExtension = extname(fileName).toLowerCase();
  if (originalExtension) {
    return originalExtension;
  }

  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '';
  }
};

export const patientImageUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      ensureDirectory(PATIENT_UPLOADS_DIR);
      callback(null, PATIENT_UPLOADS_DIR);
    },
    filename: (_req, file, callback) => {
      const extension = sanitizeExtension(file.originalname, file.mimetype);
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req: unknown, file: { mimetype: string }, callback: Function) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(
        new BadRequestException(
          'La imagen debe ser JPG, PNG o WEBP y no superar 5 MB.',
        ),
        false,
      );
      return;
    }

    callback(null, true);
  },
};

export const ensureAssetsDirectories = (): void => {
  ensureDirectory(PATIENT_UPLOADS_DIR);
};
