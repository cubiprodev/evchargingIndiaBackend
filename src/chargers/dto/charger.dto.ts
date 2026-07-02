import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ChargerType, ChargerStatus } from '../../common/constants';

export class CreateChargerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsEnum(ChargerType)
  chargerType: ChargerType;

  @IsNumber()
  @Min(0)
  powerKw: number;

  @IsNumber()
  @Min(1)
  pricePerKwh: number;

  @IsOptional()
  @IsBoolean()
  isFastCharging?: boolean;

  @IsOptional()
  @IsArray()
  amenities?: string[];

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  availability?: { day: string; openTime: string; closeTime: string }[];
}

export class UpdateChargerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  pricePerKwh?: number;

  @IsOptional()
  @IsEnum(ChargerStatus)
  status?: ChargerStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  amenities?: string[];

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  availability?: { day: string; openTime: string; closeTime: string }[];
}

export class SearchChargersDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsNumber()
  radiusKm?: number;

  @IsOptional()
  @IsEnum(ChargerType)
  chargerType?: ChargerType;

  @IsOptional()
  @IsBoolean()
  availableNow?: boolean;

  @IsOptional()
  @IsBoolean()
  fastCharging?: boolean;

  @IsOptional()
  @IsNumber()
  maxPrice?: number;
}
