import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
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

  @ApiPropertyOptional({ example: 'WATCHED', description: 'Status film' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'Indonesia', description: 'Negara produksi' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'en', description: 'Bahasa film' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: '2026-01-15', description: 'Tanggal rilis' })
  @IsOptional()
  @IsString()
  release_date?: string;

  @ApiPropertyOptional({
    example: 120,
    description: 'Durasi dalam menit (auto-calc dari video)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return Number.isNaN(num) ? undefined : Math.round(num);
  })
  @IsInt()
  runtime_minutes?: number;

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
