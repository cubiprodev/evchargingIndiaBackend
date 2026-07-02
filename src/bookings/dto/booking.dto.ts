import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  Min,
  ValidateIf,
} from 'class-validator';
import { BookingStatus } from '../../common/constants';
import { PaymentMethod } from '../../common/constants';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  chargerId: string;

  @IsDateString()
  scheduledStart: string;

  @IsOptional()
  @IsDateString()
  scheduledEnd?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedKwh?: number;
}

export class CreateBookingRequestDto {
  @ValidateIf((dto: CreateBookingRequestDto) => !dto.latitude && !dto.longitude)
  @IsString()
  @IsNotEmpty()
  chargerId?: string;

  @ValidateIf((dto: CreateBookingRequestDto) => !dto.chargerId)
  @IsNumber()
  latitude?: number;

  @ValidateIf((dto: CreateBookingRequestDto) => !dto.chargerId)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  radiusKm?: number;

  @IsDateString()
  scheduledStart: string;

  @IsOptional()
  @IsDateString()
  scheduledEnd?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedKwh?: number;
}

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @IsOptional()
  @IsNumber()
  actualKwh?: number;
}

export class EndChargingDto {
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  actualKwh?: number;
}

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}

export class CompletePaymentDto {
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsOptional()
  @IsString()
  razorpayPaymentId?: string;
}
