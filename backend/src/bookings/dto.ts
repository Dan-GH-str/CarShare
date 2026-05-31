import { RateType } from '@prisma/client';
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QuoteDto {
  @IsString()
  carId!: string;

  @IsEnum(RateType)
  rateType!: RateType;

  @IsInt()
  @Min(1)
  units!: number;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionIds?: string[];
}

export class CreateBookingDto extends QuoteDto {}
