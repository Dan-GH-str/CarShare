import { CarStatus, DriveType, FuelType, TransmissionType } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateCarDto {
  @IsString()
  @IsNotEmpty()
  modelId!: string;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  vin!: string;

  @IsString()
  @IsNotEmpty()
  plateNumber!: string;

  @IsString()
  @IsNotEmpty()
  color!: string;

  @IsOptional()
  @IsEnum(CarStatus)
  status?: CarStatus;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsInt()
  @Min(0)
  mileage!: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  images!: string[];

  @IsInt()
  @Min(1)
  hourlyPrice!: number;

  @IsInt()
  @Min(1)
  dailyPrice!: number;

  @IsInt()
  @Min(1)
  longTermDailyPrice!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  longTermFromDays?: number;
}

export class UpdateCarDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  modelId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  vin?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  plateNumber?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  color?: string;

  @IsOptional()
  @IsEnum(CarStatus)
  status?: CarStatus;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  images?: string[];
}

export class CreateModelDto {
  @IsString()
  @IsNotEmpty()
  brand!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  trim!: string;

  @IsEnum(TransmissionType)
  transmission!: TransmissionType;

  @IsEnum(FuelType)
  fuelType!: FuelType;

  @IsEnum(DriveType)
  driveType!: DriveType;

  @IsInt()
  @Min(1)
  seats!: number;

  @IsInt()
  @Min(1980)
  @Max(2100)
  year!: number;

  @IsArray()
  @IsString({ each: true })
  features!: string[];

  @IsString()
  @IsNotEmpty()
  description!: string;
}

export class UpdateModelDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  brand?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  trim?: string;

  @IsOptional()
  @IsEnum(TransmissionType)
  transmission?: TransmissionType;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @IsEnum(DriveType)
  driveType?: DriveType;

  @IsOptional()
  @IsInt()
  @Min(1)
  seats?: number;

  @IsOptional()
  @IsInt()
  @Min(1980)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;
}
