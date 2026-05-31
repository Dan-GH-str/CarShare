import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { carImagesRoot, ensureUploadDirectories, publicCarImagePath } from '../common/uploads';
import { AdminService } from './admin.service';
import { CreateCarDto, CreateModelDto, UpdateCarDto, UpdateModelDto } from './dto';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

function buildCarImageFilename(file: Express.Multer.File) {
  const extension = extname(file.originalname).toLowerCase() || mimeExtension(file.mimetype);
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;
}

function mimeExtension(mimetype: string) {
  if (mimetype === 'image/png') return '.png';
  if (mimetype === 'image/webp') return '.webp';
  if (mimetype === 'image/avif') return '.avif';
  return '.jpg';
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('users')
  users(@Query('search') search?: string) {
    return this.admin.users(search);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: any) {
    return this.admin.updateUser(id, body);
  }

  @Get('cars')
  cars() {
    return this.admin.cars();
  }

  @Post('cars')
  createCar(@Body() body: CreateCarDto) {
    return this.admin.createCar(body);
  }

  @Post('uploads/car-images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          ensureUploadDirectories();
          callback(null, carImagesRoot);
        },
        filename: (_request, file, callback) => callback(null, buildCarImageFilename(file)),
      }),
      fileFilter: (_request, file, callback) => {
        if (!allowedImageTypes.has(file.mimetype)) {
          callback(new BadRequestException('Загрузите изображение JPG, PNG, WebP или AVIF'), false);
          return;
        }
        callback(null, true);
      },
      limits: { fileSize: 6 * 1024 * 1024 },
    }),
  )
  uploadCarImage(@UploadedFile() file: Express.Multer.File | undefined, @Req() request: Request) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    const path = publicCarImagePath(file.filename);
    return {
      filename: file.filename,
      path,
      url: `${request.protocol}://${request.get('host')}${path}`,
    };
  }

  @Patch('cars/:id')
  updateCar(@Param('id') id: string, @Body() body: UpdateCarDto) {
    return this.admin.updateCar(id, body);
  }

  @Delete('cars/:id')
  deleteCar(@Param('id') id: string) {
    return this.admin.deleteCar(id);
  }

  @Get('categories')
  categories() {
    return this.admin.categories();
  }

  @Post('categories')
  createCategory(@Body() body: any) {
    return this.admin.createCategory(body);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: any) {
    return this.admin.updateCategory(id, body);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.admin.deleteCategory(id);
  }

  @Get('models')
  models() {
    return this.admin.models();
  }

  @Post('models')
  createModel(@Body() body: CreateModelDto) {
    return this.admin.createModel(body);
  }

  @Patch('models/:id')
  updateModel(@Param('id') id: string, @Body() body: UpdateModelDto) {
    return this.admin.updateModel(id, body);
  }

  @Delete('models/:id')
  deleteModel(@Param('id') id: string) {
    return this.admin.deleteModel(id);
  }

  @Get('tariffs')
  tariffs() {
    return this.admin.tariffs();
  }

  @Post('tariffs')
  createTariff(@Body() body: any) {
    return this.admin.createTariff(body);
  }

  @Patch('tariffs/:id')
  updateTariff(@Param('id') id: string, @Body() body: any) {
    return this.admin.updateTariff(id, body);
  }

  @Delete('tariffs/:id')
  deleteTariff(@Param('id') id: string) {
    return this.admin.deleteTariff(id);
  }

  @Get('options')
  options() {
    return this.admin.options();
  }

  @Post('options')
  createOption(@Body() body: any) {
    return this.admin.createOption(body);
  }

  @Patch('options/:id')
  updateOption(@Param('id') id: string, @Body() body: any) {
    return this.admin.updateOption(id, body);
  }

  @Delete('options/:id')
  deleteOption(@Param('id') id: string) {
    return this.admin.deleteOption(id);
  }

  @Get('bookings')
  bookings() {
    return this.admin.bookings();
  }

  @Patch('bookings/:id')
  updateBooking(@Param('id') id: string, @Body() body: any) {
    return this.admin.updateBooking(id, body);
  }

  @Get('reviews')
  reviews() {
    return this.admin.reviews();
  }

  @Patch('reviews/cars/:id')
  patchCarReview(@Param('id') id: string, @Body() body: any) {
    return this.admin.patchCarReview(id, body);
  }

  @Patch('reviews/service/:id')
  patchServiceReview(@Param('id') id: string, @Body() body: any) {
    return this.admin.patchServiceReview(id, body);
  }
}
