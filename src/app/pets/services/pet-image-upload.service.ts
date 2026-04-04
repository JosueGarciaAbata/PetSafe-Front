import { Injectable } from '@angular/core';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const TARGET_MAX_UPLOAD_BYTES = 1_500_000;
const MAX_DIMENSION = 1600;
const WEBP_QUALITIES = [0.82, 0.72, 0.62, 0.52] as const;

export interface PreparedPetImageUpload {
  file: File;
  previewUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class PetImageUploadService {
  async prepareImage(file: File): Promise<PreparedPetImageUpload> {
    this.ensureFileIsAllowed(file);

    const decodedImage = await this.decodeImage(file);
    try {
      const optimizedFile = await this.buildOptimizedFile(file, decodedImage);

      if (optimizedFile.size > MAX_IMAGE_SIZE_BYTES) {
        throw new Error('La imagen optimizada supera el limite permitido de 5 MB.');
      }

      return {
        file: optimizedFile,
        previewUrl: URL.createObjectURL(optimizedFile),
      };
    } finally {
      decodedImage.close();
    }
  }

  revokePreviewUrl(previewUrl: string | null | undefined): void {
    if (!previewUrl) {
      return;
    }

    URL.revokeObjectURL(previewUrl);
  }

  private ensureFileIsAllowed(file: File): void {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new Error('La imagen debe estar en formato JPG, PNG o WEBP.');
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error('La imagen no puede superar los 5 MB.');
    }
  }

  private async decodeImage(file: File): Promise<ImageBitmap> {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new Error('No se pudo procesar la imagen seleccionada.');
    }
  }

  private async buildOptimizedFile(file: File, bitmap: ImageBitmap): Promise<File> {
    const canvas = document.createElement('canvas');
    const { width, height } = this.calculateDimensions(bitmap.width, bitmap.height);

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
      throw new Error('No se pudo preparar la imagen para su envio.');
    }

    context.drawImage(bitmap, 0, 0, width, height);

    const optimizedBlob = await this.createWebpBlob(canvas);
    const chosenBlob = this.pickBestBlob(file, optimizedBlob);

    if (chosenBlob === file) {
      return file;
    }

    return new File([chosenBlob], this.buildOptimizedFileName(file.name), {
      type: chosenBlob.type,
      lastModified: Date.now(),
    });
  }

  private calculateDimensions(width: number, height: number): { width: number; height: number } {
    if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
      return { width, height };
    }

    const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);

    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };
  }

  private async createWebpBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    let bestBlob: Blob | null = null;

    for (const quality of WEBP_QUALITIES) {
      const candidateBlob = await this.canvasToBlob(canvas, 'image/webp', quality);

      if (!bestBlob || candidateBlob.size < bestBlob.size) {
        bestBlob = candidateBlob;
      }

      if (candidateBlob.size <= TARGET_MAX_UPLOAD_BYTES) {
        return candidateBlob;
      }
    }

    if (!bestBlob) {
      throw new Error('No se pudo optimizar la imagen seleccionada.');
    }

    return bestBlob;
  }

  private canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality?: number,
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('No se pudo convertir la imagen.'));
          return;
        }

        resolve(blob);
      }, type, quality);
    });
  }

  private pickBestBlob(originalFile: File, optimizedBlob: Blob): Blob | File {
    return optimizedBlob.size < originalFile.size ? optimizedBlob : originalFile;
  }

  private buildOptimizedFileName(originalName: string): string {
    const sanitizedBaseName = originalName.replace(/\.[^.]+$/, '').trim() || 'pet-image';
    return `${sanitizedBaseName}.webp`;
  }
}
