import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateReviewDto {
  @IsString()
  @IsNotEmpty()
  chargerId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  cleanlinessRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  safetyRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  speedRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  ownerBehaviorRating?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
