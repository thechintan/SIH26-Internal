import { IsOptional, IsEnum, IsString, IsMongoId, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus, PriorityTier, ReportCategory } from '../../common/constants';

export class QueryReportsDto {
  @ApiPropertyOptional({ enum: ReportCategory })
  @IsOptional()
  @IsEnum(ReportCategory)
  category?: ReportCategory;

  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ enum: PriorityTier })
  @IsOptional()
  @IsEnum(PriorityTier)
  priority_tier?: PriorityTier;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  ward_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  department_id?: string;

  @ApiPropertyOptional({ description: 'ISO date string' })
  @IsOptional()
  @IsString()
  from_date?: string;

  @ApiPropertyOptional({ description: 'ISO date string' })
  @IsOptional()
  @IsString()
  to_date?: string;

  @ApiPropertyOptional({ default: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ default: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({ default: '-createdAt', description: 'Sort field (prefix with - for desc)' })
  @IsOptional()
  @IsString()
  sort?: string;
}
