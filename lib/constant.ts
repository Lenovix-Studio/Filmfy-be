import 'dotenv/config';

export const PORT = Number(process.env.PORT);
export const APP_ENV = process.env.APP_ENV;
export const NODE_ENV = process.env.NODE_ENV;
export const DATABASE_URL = process.env.DATABASE_URL;
export const STORAGE_PATH = process.env.STORAGE_PATH;

// Movies

export interface ExtractRequest {
  code: string;
}
export interface ExtractResponse {
  code: string;
  title: string;
  overview: string;
  director: string;
  studio: string;
  label: string;
  country: string;
  language: string;
  release_date: string;
  cast: string;
  genres: string;
  series: string;
  runtime_minutes: number;
  rating: number;
  cover_url: string;
  gallery_urls: string[];
}

// Common Code
export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/x-matroska',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
];
