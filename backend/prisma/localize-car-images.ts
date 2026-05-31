import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { carImagesRoot, ensureUploadDirectories, publicCarImagePath } from '../src/common/uploads';

loadEnvFile();

const prisma = new PrismaClient();
const publicApiUrl = (process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`).replace(/\/$/, '');

async function main() {
  ensureUploadDirectories();

  const cars = await prisma.car.findMany({ select: { id: true, images: true } });
  let updatedCars = 0;
  let localizedImages = 0;

  for (const car of cars) {
    const images = Array.isArray(car.images) ? (car.images as string[]) : [];
    const nextImages: string[] = [];
    let changed = false;

    for (const image of images) {
      if (!isExternalImage(image)) {
        nextImages.push(image);
        continue;
      }

      const localized = await downloadImage(image);
      nextImages.push(localized);
      changed = true;
      localizedImages += 1;
    }

    if (changed) {
      await prisma.car.update({ where: { id: car.id }, data: { images: nextImages } });
      updatedCars += 1;
    }
  }

  console.log(`Localized ${localizedImages} images for ${updatedCars} cars.`);
}

async function downloadImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Expected image content for ${url}, got ${contentType || 'unknown content type'}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const filename = `${createHash('sha256').update(url).digest('hex').slice(0, 16)}${extensionFor(contentType, url)}`;
  const filePath = join(carImagesRoot, filename);

  if (!existsSync(filePath)) {
    await writeFile(filePath, bytes);
  }

  return `${publicApiUrl}${publicCarImagePath(filename)}`;
}

function isExternalImage(value: string) {
  return /^https?:\/\//i.test(value) && !value.includes('/uploads/cars/');
}

function extensionFor(contentType: string, url: string) {
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('avif')) return '.avif';
  if (contentType.includes('gif')) return '.gif';

  const match = new URL(url).pathname.match(/\.(jpe?g|png|webp|avif|gif)$/i);
  return match ? `.${match[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg';
}

function loadEnvFile() {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^"|"$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
