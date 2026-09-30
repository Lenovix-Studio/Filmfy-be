import { IsArray, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const normalizeStringArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => (typeof item === 'string' ? item.split(',') : item))
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0);
  }
  return [];
};

const normalizeString = (value: any): string | any => {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  return value;
};

export class CreateMovieDto {
  @ApiProperty({ example: 'mov-2026-001', description: 'Kode unik film' })
  @Transform(({ value }) => normalizeString(value))
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Inception', description: 'Judul film' })
  @IsString()
  title!: string;

  @ApiProperty({
    example: 'Bercerita tentang...',
    description: 'Overview film',
  })
  @IsString()
  overview!: string;

  @ApiPropertyOptional({ example: ['christopher nolan'], type: [String] })
  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  director?: string[];

  @ApiPropertyOptional({ example: ['warner bros.'], type: [String] })
  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  studio?: string[];

  @ApiPropertyOptional({ example: ['syncopy'], type: [String] })
  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  label?: string[];

  @ApiPropertyOptional({ example: ['inception series'], type: [String] })
  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  series?: string[];

  @ApiPropertyOptional({ example: ['action', 'sci-fi'], type: [String] })
  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  genre?: string[];

  @ApiPropertyOptional({
    example: ['leonardo dicaprio', 'joseph gordon-levitt'],
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  cast?: string[];
}
