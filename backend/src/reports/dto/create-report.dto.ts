import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportCategory } from '../../common/constants';

class LocationDto {
  @ApiProperty({ example: 72.8777, description: 'Longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiProperty({ example: 19.0760, description: 'Latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;
}

export class CreateReportDto {
  @ApiProperty({ enum: ReportCategory, example: ReportCategory.POTHOLE })
  @IsEnum(ReportCategory)
  category: ReportCategory;

  @ApiPropertyOptional({ example: 'Large pothole near the intersection', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Voice note S3 URL' })
  @IsOptional()
  @IsString()
  voice_note_url?: string;

  @ApiProperty({
    type: [String],
    example: ['https://s3.amazonaws.com/civicpulse/img1.jpg'],
    description: '1-3 image URLs (from pre-signed upload)',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least 1 image is required' })
  @ArrayMaxSize(3, { message: 'Maximum 3 images allowed' })
  @IsString({ each: true })
  images: string[];

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiPropertyOptional({ example: '123 Main Street, Ward 5' })
  @IsOptional()
  @IsString()
  address?: string;
}
