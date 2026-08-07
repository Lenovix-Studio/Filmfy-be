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

export class CreateMovieDto {
  @ApiProperty({ example: 'MOV-2026-001', description: 'Kode unik film' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Inception', description: 'Judul film' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: 'Christopher Nolan' })
  @IsOptional()
  @IsString()
  director?: string;

  @ApiPropertyOptional({ example: 'Warner Bros.' })
  @IsOptional()
  @IsString()
  studio?: string;

  @ApiPropertyOptional({ example: 'Syncopy' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: 'Inception Series' })
  @IsOptional()
  @IsString()
  series?: string;

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
