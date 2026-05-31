import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export const uploadsRoot = join(process.cwd(), 'uploads');
export const carImagesRoot = join(uploadsRoot, 'cars');

export function ensureUploadDirectories() {
  for (const directory of [uploadsRoot, carImagesRoot]) {
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
  }
}

export function publicCarImagePath(filename: string) {
  return `/uploads/cars/${filename}`;
}
